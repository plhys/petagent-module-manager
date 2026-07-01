# PetAgent 模块管理器 — 开发者避坑指南

修改本项目前必读。每个坑都花了至少一次重启验证。

---

## 坑 1：CSS 文件有两份，Vite 加载的是 public/

- `src/modules/theme/copy/apps/desktop/src/petagent-theme.css` — 模块源码
- **部署后**：安装器会把 CSS 拷贝到 `apps/desktop/src/`（manifest copy）**和** `apps/desktop/public/`（`_inject_source_html`）
- Vite dev 模式从 `public/` 加载 `<link href="/petagent-theme.css">`
- **每次改 CSS 必须同步两个目录**：`src/` 和 `public/`
- 验证命令：`ls -la apps/desktop/src/petagent-theme.css apps/desktop/public/petagent-theme.css`

---

## 坑 2：darkColors 必须是顶层 key，不能嵌套在 colors 里

localStorage 注入的 JSON 结构：

```json
// ❌ 错误 — dark 嵌套在 colors 里
{ "colors": { "background": "#fff", "dark": { "background": "#000" } } }

// ✅ 正确 — darkColors 是顶层 key
{ "colors": { "background": "#fff" }, "darkColors": { "background": "#000" } }
```

- `context.tsx` 的 `getBaseColors()` 读的是 `seed.darkColors`，不是 `seed.colors.dark`
- 如果 `darkColors` 不存在，暗色模式回退到亮色，看起来像"暗色没生效"

---

## 坑 3：亮色气泡颜色必须和 Nous 一致

- Nous 亮色 `userBubble: "#f0f0f0"`（浅灰）
- 旧代码设了 `userBubble: "#18181b"`（黑色），看起来跟 Nous 完全不同
- CSS 文件也曾经强制覆盖 `--dt-user-bubble: #18181b`，需删除

---

## 坑 4：暗色气泡文字颜色需要显式设置

- 组件 `thread.tsx` 用 `bg-(--dt-user-bubble)` 设背景
- 但文字颜色**不读** `--dt-user-bubble-foreground`，继承父级 `foreground`
- 暗色模式下 `foreground: #eaeaea`（近白）+ 浅灰气泡 = 白底白字看不见
- 解决：加 `.composer-human-message { color: #e8e8e8 }` 显式设文字色

---

## 坑 5：侧边栏选择器

shadcn sidebar 有多层嵌套，每层都有 `data-slot` 和 `data-sidebar` 属性：

| 选择器 | 匹配 | 适合放 Logo？ |
|--------|------|--------------|
| `[data-sidebar="sidebar"]` | nav 元素（多个） | ❌ 可能在滚动区内 |
| `[data-slot="sidebar-content"]` | SidebarContent 组件 | ❌ 在滚动区里 |
| `[data-slot="sidebar"].flex-col` | `collapsible="none"` 的外层容器 | ✅ 所有内容上方 |

- 只有 `collapsible="none"` 的 Sidebar 有 `flex-col` class
- Logo 用 `::before` 放在这个元素上 = 菜单和会话列表上方，不滚动

---

## 坑 6：卸载器必须清理两处

- `apps/desktop/index.html`（源码模式入口）
- `app.asar` 里的 `dist/index.html`（编译模式入口）
- 旧版卸载器只清理了 asar，源码 index.html 的 PetAgent 注入残留导致"卸载不掉"

---

## 坑 7：两种运行模式

| | 源码模式（dev） | 编译模式（prod） |
|------|-----------|-------------|
| 入口 | `index.html` → `/src/main.tsx` | `app.asar` → `dist/index.html` |
| CSS 位置 | `public/petagent-theme.css` | `app/dist/petagent-theme.css` |
| 修改方式 | 改源码文件直接生效 | 解包 asar → 改 → 重新打包 |
| 安装器方法 | `_inject_source_html()` | `_inject_dist()` + `_handle_asar()` |

---

## 坑 8：暗色 Logo 反色

- 不要用 `brightness(0) invert(1)` — 会把 Logo 变成纯白剪影，丢失品牌细节
- 用 `invert(1)` — 保留原 Logo 的层次和细节，只是颜色反转
- 同一个 Logo 文件，CSS filter 适配暗色，不需要两套文件

---

## 快速检查清单

改完代码后跑一遍：

```
[ ] src/petagent-theme.css 和 public/petagent-theme.css 是否一致？
[ ] darkColors 是否在 JSON 顶层，不在 colors 里？
[ ] 亮色 userBubble 是否是 #f0f0f0？
[ ] 暗色气泡文字是否显式设置了 color？
[ ] 侧边栏 Logo 选择器是 [data-slot="sidebar"].flex-col 吗？
[ ] 卸载器是否同时清理源码和 asar 的 index.html？
[ ] 暗色 Logo filter 是 invert(1) 而不是 brightness(0) invert(1)？
```
