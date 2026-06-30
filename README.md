# 🐾 PetAgent 模块管理器

> Hermes Agent 独立扩展包 — 桌面宠物 + 主题皮肤 + 中文语言包 + 出图插件

[![Version](https://img.shields.io/badge/version-2.0.13-blue)](src/manifest.yaml)
[![Hermes](https://img.shields.io/badge/hermes--agent-%3E%3D%20v0.16.0-green)](https://github.com/plhys/petagent-module-manager)

---

## 🎯 设计哲学

PetAgent 作为 Hermes Agent 的**第三方扩展**，核心原则只有一条：

> **像插件一样安装，像从未存在过一样卸载。**

为此，整个项目围绕四个层面的解耦设计构建：

---

### 1. 主题隔离 — "注册而不覆盖"

PetAgent 主题**不会修改 Hermes 的任何内置主题**。它通过浏览器标准的 `localStorage` 机制，将自己注册为一个**用户自定义主题**：

```
localStorage["hermes-desktop-user-themes-v1"]
├── "hermes"      ← Hermes 内置，不受影响
├── "petagent"    ← PetAgent 注册，独立条目
└── ...           ← 其他第三方主题
```

- 用户可以随时在设置中**切换回 Hermes 原生主题**
- 卸载时清除 `localStorage` 中的 `petagent` 条目，**不留痕迹**
- 多个第三方主题可以共存，不会互相覆盖

```
┌─────────────────────────────────────────────┐
│              Hermes 主题系统                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  hermes  │  │ petagent │  │  其他主题  │   │
│  │ (内置)   │  │ (独立)   │  │ (独立)   │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│       ↑              ↑             ↑         │
│       │              │             │         │
│   互不影响，用户可以自由切换                    │
└─────────────────────────────────────────────┘
```

---

### 2. 钩子注入 — "追加不修改"

所有需要注入到 Hermes 源码的代码，都使用**标记块**包裹，只追加到文件末尾：

```javascript
// 原始 Hermes 代码 — 一行不动
const { app, BrowserWindow } = require('electron')
let mainWindow = null
// ... 数千行原始代码 ...

// ═══ PetAgent:pet ═══
// PetAgent 桌面宠物钩子（独立块，可精确删除）
const { initPetAgent } = require('./pet/pet-main.cjs')
initPetAgent(mainWindow)
// ═══ End PetAgent:pet ═══
```

| 方案 | 原理 | 风险 |
|------|------|------|
| ~~diff/patch~~ | 修改原始文件 | 版本更新后 patch 失效 |
| ~~替换文件~~ | 覆盖整个文件 | 丢失主程序更新 |
| **标记注入** ✅ | 追加标记块 | 原始代码零修改 |

卸载时，正则匹配 `═══ PetAgent:xxx ═══ ... ═══ End PetAgent:xxx ═══` 删除即可，**精确还原**。

---

### 3. 双通道注入 — "源码和编译产物分开处理"

Hermes 有两种运行模式，PetAgent 分别处理：

```
┌──────────────────────────────────────────────────┐
│                   安装流程                         │
│                                                   │
│  源码模式 (npm run dev)                            │
│  ├─ 注入 index.html → <script> + <link>           │
│  ├─ 复制 CSS → public/petagent-theme.css          │
│  └─ 不碰 app.asar                                │
│                                                   │
│  生产模式 (app.asar)                               │
│  ├─ 解包 app.asar → app/                          │
│  ├─ 注入 dist/index.html + dist/assets/*.css      │
│  ├─ 复制静态资源 → dist/                          │
│  └─ 重新打包 app.asar                             │
│                                                   │
│  两者互不干扰，同时兼容                             │
└──────────────────────────────────────────────────┘
```

---

### 4. 可逆操作 — "随时回滚"

| 保护机制 | 说明 |
|----------|------|
| **文件备份** | 每次安装前，原始文件备份到 `backup/YYYYMMDD_HHMMSS/` |
| **asar 备份** | 打包前自动创建 `app.asar.bak` |
| **版本标记** | 安装后写入 `.petagent-version`，方便检测状态 |
| **精确卸载** | 正则匹配标记块删除 + 备份恢复 + localStorage 清理 |

```
安装:  原始文件 → 备份 → 注入 → 标记
卸载:  匹配标记 → 删除 → 恢复备份 → 清理存储
```

---

## 🚀 主程序更新兼容性

Hermes Agent 更新后，PetAgent 的兼容策略：

| 场景 | 结果 | 操作 |
|------|------|------|
| Hermes 小版本更新 | ✅ 兼容 | 钩子标记在原位置，重新注入即可 |
| Hermes 大版本更新 | ⚠️ 需检查 | 标记锚点可能变化，运行安装器自动检测 |
| 用户切换回原生主题 | ✅ 无影响 | 在设置中选择其他主题即可 |
| 完全卸载 PetAgent | ✅ 干净还原 | 运行卸载器，恢复所有原始文件 |

**关键原则**：PetAgent 不修改 Hermes 的任何一行原始代码。即使 Hermes 更新了 `main.cjs`、`preload.cjs` 等文件，PetAgent 的标记块在文件末尾独立存在，不会导致合并冲突。

---

## 📦 模块列表

| 模块 | ID | 说明 |
|------|-----|------|
| 🐾 桌面宠物 | `pet` | 可拖拽桌面吉祥物，9种动画状态 |
| 🎨 主题皮肤 | `theme` | PetAgent 品牌色板（亮色 + 暗色） |
| 🌐 中文语言包 | `zh` | 界面 + API 供应商 + 技能名称中英双语 |
| 🔌 出图插件 | `image-gen` | Gemini + 豆包图片生成 |
| 📐 布局调整 | `layout` | 渠道标签 + 产物面板位置调整（开发中） |

---

## 🛠 使用方式

### GUI 面板（推荐）

直接运行 `PetAgent模块管理器.exe`，图形界面操作。

### 命令行

```bash
# 自动发现 Hermes 并安装推荐模块
python src/install.py

# 安装指定模块
python src/install.py -i pet theme zh

# 指定目标目录
python src/install.py --target "D:\hermes-agent"

# 卸载
python src/uninstall.py --target "D:\hermes-agent"
```

---

## 🔧 构建

```bash
# 构建 Electron GUI
cd src/electron-app
npm install
npm run build

# 构建 PyInstaller CLI
build.bat
```

---

## 📄 项目结构

```
petagent-module-manager/
├── src/
│   ├── installer.py          # 核心安装逻辑（HookInstaller）
│   ├── install.py            # CLI 入口
│   ├── uninstall.py          # 卸载器（精确还原）
│   ├── server.py             # HTTP 面板服务器
│   ├── scanner.py            # Hermes 安装目录扫描
│   ├── panel.html/css/js     # 浏览器面板
│   ├── manifest.yaml         # 模块清单
│   ├── hooks.yaml            # 钩子 → 目标文件映射
│   ├── modules/              # 各模块的钩子和资源文件
│   │   ├── pet/              # 桌面宠物
│   │   ├── theme/            # 主题皮肤
│   │   ├── zh/               # 中文语言包
│   │   ├── image-gen/        # 出图插件
│   │   └── layout/           # 布局调整
│   └── electron-app/         # Electron GUI 应用
└── dist/                     # 构建输出
```

---

## 📝 技术要点

- **标记注入**：`═══ PetAgent:{module} ═══` 块包裹，追加不修改
- **主题隔离**：`localStorage` 用户自定义主题，不覆盖内置主题
- **双通道**：源码 `index.html` + 编译 `app.asar` 分别处理
- **精确卸载**：正则匹配 + 备份恢复 + localStorage 清理
- **零依赖冲突**：不修改 Hermes 原始文件，不与其他扩展冲突

---

## ⚖️ 许可

MIT License
