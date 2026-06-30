# PetAgent 模块管理器 — 维修记录

## 2026-06-30: 主题修复 — 用户气泡双层问题

**问题**: 用户消息气泡出现双层效果——外层 `.composer-human-message`（Tailwind `rounded-xl border bg`）形成方框，内层 `[data-slot='aui_user-inline-text']` 又被 CSS 画了 3 圆角+小尾巴，两层叠加。

**根因**: `petagent-theme.css` 之前用 `.human-bubble` 类名选择器，但实际 DOM 中的类名是 `.composer-human-message`（从 JS bundle 确认），类名对不上导致外层方块没被清除。

**修复**: `petagent-theme.css` 用户气泡区域重写：
- `[data-slot='aui_user-message-root']` 本身：重置背景为透明
- `.composer-human-message`：覆盖 Tailwind 类，`background: transparent; border-color: transparent; border-radius: 0`（去掉外层方块）
- `[data-slot='aui_user-inline-text']`：作为唯一气泡层，画 3 圆角 + CSS 三角尾巴
- 移除不存在的 `.human-bubble` 规则和过于激进的 `*` 通配符规则
- 版本号：2.0.0 → 2.0.5

## 2026-06-30: 卸载器修复 — localStorage 主题残留

**问题**: asar 清理后主题仍然生效，因为安装时注入的脚本已将主题写入 `localStorage`（`hermes-desktop-user-themes-v1`），数据在浏览器持久化存储中，删除 asar 中的注入脚本不影响已缓存的数据。

**修复**: `uninstall.py` `_restore_asar()` 重构：
- 备份恢复路径不再提前返回，统一走"解包→清理→注入 localStorage 清理脚本→重新打包"流程
- 注入一次性 localStorage 清理脚本：读取 `hermes-desktop-user-themes-v1`，删除 `petagent` 键，写回。下次启动 Hermes 时自动清除主题缓存

## 2026-06-30: 卸载器修复 — app.asar 恢复

**问题**: 卸载后 Hermes Agent 仍显示宠物和主题，因为安装器修改了 `app.asar`（注入脚本、CSS、静态资源）并重新打包，但卸载器从未恢复 `app.asar`。

**修复**:
- `uninstall.py`: 新增 `_restore_asar()` 函数，卸载时恢复 `app.asar`：
  1. 优先从 `app.asar.bak` 直接恢复（安装时自动创建的备份）
  2. 无备份时：解包 asar → 清理 `dist/index.html` 中的注入脚本 → 清理 CSS `@import` → 删除注入的静态文件 → 重新打包
- 新增 `_find_asar_cli()` 和 `get_asar_path()` 工具函数

**关联修改**:
- `panel.js`: 修复重复 `const btnInstall`，添加更新按钮事件和 `_doUpdate()` 方法
- `panel.css`: 添加 `.btn-danger`、`.btn-update`、`.install-badge.update-available` 样式

## 2026-06-30: 扩展管理器恢复 + 卸载/更新功能

**修改文件**:
- 新增 `electron-app/ipc/status.js`: 安装状态检测
- `electron-app/main.js`: 注册 status IPC
- `electron-app/preload.js`: 暴露 checkInstalled API
- `installer.py`: 添加 `_write_version_marker()` 写入 `.petagent-version`
- `uninstall.py`: 删除 `.petagent-version`
- `panel.js`: State/API/UI 更新，支持已安装/可更新状态
- `panel.css`: 安装徽章样式


## 2026-06-30: 中文语言包 — 路径修复 + dist_inject 完善

**修改文件**:
- `manifest.yaml`: zh 模块 copy 路径修正为 `apps/desktop/src/app/settings/provider-translations.ts` 和 `apps/desktop/src/app/skills/translations.ts`
- `modules/zh/copy/`: 目录结构重组匹配新路径
- `installer.py`: zh dist_inject 已完整（portable 翻译 + model 翻译 + navigator.language 覆盖）

**翻译覆盖范围**:
- ✅ 供应商名称/描述 (200+ 项) — copy 文件
- ✅ 技能名称/分类/描述 (200+ 项) — copy 文件
- ✅ 便携版更新提示 (6 键) — dist_inject `__hermesUpdateTranslations`
- ✅ 模型设置 (2 键) — dist_inject `__hermesModelTranslations`
- ✅ 语言检测覆盖 (navigator.language → zh-CN) — dist_inject
- ❌ channels/restartMessaging — 需要组件级修改，属于 layout 模块范围
- ❌ weixin 描述修改 — 编译产物无扩展点

**dist_inject 局限性**: 只能通过 `__hermesUpdateTranslations` 和 `__hermesModelTranslations` 两个全局变量注入翻译。编译产物中未发现通用 i18n 覆盖机制，无法注入任意翻译键。

## 2026-06-30: 中文语言包 — JS Bundle 直接注入

**问题**: dist_inject 只能通过 `window.__hermes*` 全局变量注入 8 个翻译键，但 95% 的界面翻译数据直接写死在编译后的 `dist/assets/index-*.js` 里，HTML 脚本碰不到。

**方案**: 安装时直接修改编译后的 JS bundle，用精确字符串替换把中文翻译值改掉。

**实现**:
- `installer.py`: 新增 `_I18N_PATCHES` 替换表（5 条）和 `_patch_i18n_bundle()` 方法
- 在 `_inject_dist()` 中，zh 模块安装时自动调用，对 `dist/assets/index-*.js` 执行字符串替换
- 卸载时从 `app.asar.bak` 恢复原始 bundle，自动还原

**替换内容**（精确匹配，只改中文区域）:
| 原文 | 改为 |
|------|------|
| `restartGateway:\`重启网关\`` | `restartGateway:\`重启消息服务\`` |
| `gatewayRestartFailed:\`网关重启失败。\`` | `gatewayRestartFailed:\`消息服务重启失败。\`` |
| `restartToApply:\`此更改将在网关重启后生效。\`` | `restartToApply:\`重启网关后此更改才会生效。\`` |
| `restartToReconnect:\`新凭据将在网关重启后生效。\`` | `restartToReconnect:\`重启网关以使用新凭据重新连接。\`` |
| `weixin:"运行 \`hermes gateway setup\`..."` | `weixin:"登录微信公众平台，复制 AppID 和 Token..."` |

**不覆盖的内容**（技术上无法通过字符串替换实现）:
- 删除翻译键（如 native notifications）— 键仍在 bundle 中，旧中文值保留
- 新增翻译键（如 channels section）— 需要改代码结构，属于 layout 模块

## 2026-06-30: 主题修复 — 亮色模式用户气泡颜色

**问题**: 亮色模式下用户对话气泡是深色（`#2a2a2a`），与亮色背景不协调。旧项目亮色模式气泡是浅灰 `#f0f0f0`。

**修复**:
- `petagent-theme.css`: 亮色模式 `--dt-user-bubble: #f0f0f0`（浅灰底+深色字），暗色模式 `--dt-user-bubble: #2a2a2a`（深色底+浅色字）
- `installer.py`: localStorage 主题色板亮色 `userBubble` 从 `#2a2a2a` 改为 `#f0f0f0`，`userBubbleBorder` 从 `#505050` 改为 `#a0a0a0`
- 键重命名（restartGateway → restartMessaging）— 只改了显示值，代码引用保持原名

## 2026-06-30: 布局模块 — 确认 disabled 状态

**分析**: layout 模块（channels 标签移到命令中心 + 产物面板移到右侧栏）需要修改 React 组件签名、添加 lazy 导入、新增 JSX 结构，无法通过纯追加钩子实现。`disabled: true` 状态合理，hooks 文件作为文档占位符保留。

**如需启用**: 参考旧项目 `patches/frontend/command-center.tsx.diff` 和 `patches/frontend/right-sidebar.tsx.diff` 手动打补丁，或等待上游提供插件接口。
