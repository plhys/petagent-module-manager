# Hermes 桌面宠物补丁 — 踩坑记录 & 进度

## 项目结构
- **D 盘源码**（只读参考，不要改）：`d:\aicodework\hermes-offline\Hermes-Agent-Win\hermes-offline\hermes-agent\`
- **C 盘部署**（要打补丁的目标）：`C:\Users\EVAN\AppData\Local\hermes\hermes-agent\`
- **补丁代码**：`d:\aicodework\hermes-offline\petagnet\src\modules\pet\`
- **补丁钩子**：`d:\aicodework\hermes-offline\petagnet\src\modules\pet\hooks\`
- **补丁文件**：`d:\aicodework\hermes-offline\petagnet\src\modules\pet\copy\`

---

## 踩坑记录

### 坑 1：Electron 不读 `app/` 目录
- **错误做法**：以为删掉 `app.asar` 后 Electron 会自动读取 `resources/app/` 目录
- **事实**：electron-builder 打包的版本不会 fallback 到 `app/` 目录
- **后果**：删掉 `app.asar` 后 Hermes 启动失败

### 坑 2：`asar pack` 打包格式不兼容 electron-builder
- **错误做法**：用 `asar pack` 把 `app/` 目录重新打包成 `app.asar`
- **事实**：`asar pack` 和 electron-builder 的打包格式不同，产出的 asar 大小从 9.2MB 变成 52MB
- **后果**：Hermes 启动崩溃，报 `TypeError: ... is not a function`

### 坑 3：IIFE 钩子追加到 `module.exports = { ... }` 后面缺少分号
- **错误做法**：把 IIFE `(function(){...})()` 追加到 `bootstrap-runner.cjs` 末尾
- **事实**：`bootstrap-runner.cjs` 末尾是 `module.exports = { ... }`，**没有分号**。JS 引擎把 `}(function(){` 解析为 `}(function(){`，即把 `{...}` 当作函数调用
- **后果**：`TypeError: ((intermediate value)...) is not a function`，Hermes 无法启动
- **修复**：在 IIFE 前面加 `;` → `;(function() {`

### 坑 4：`app.whenReady()` 钩子时机错误
- **错误做法**：替换 `app.whenReady` 方法，但 `whenReady` 在钩子之前已经调用了
- **事实**：`main.cjs` 里有多处 `app.whenReady()`，模块级那个才是真正的启动入口
- **后果**：新的 `whenReady` 永远不会被调用，宠物不显示

### 坑 5：删了 `pet/` 目录但没删 `require` 行 → 白屏
- **错误做法**：清理补丁时删了 `electron/pet/` 目录，但没删 `main.cjs` 里的 `const { initPet } = require('./pet/pet-init.cjs')`
- **事实**：`require` 找不到模块会抛异常，导致 `main.cjs` 加载失败，Electron 主进程崩溃
- **后果**：白屏，Hermes 完全无法使用

### 坑 6：`initPet` 被注入到错误的 `createWindow()` 里
- 之前的补丁把 `initPet(mainWindow)` 注入到了 `createWindow()` 函数内部的 `app.whenReady()`，而不是模块级 `app.whenReady()`
- 正确的注入位置：模块级 `app.whenReady().then(() => { ... createWindow() ... })` 里的 `createWindow()` 之后

### 坑 7：`dist-built/` 没进 asar，宠物 HTML 找不到
- electron-builder 的 `files` 配置只包含 `dist/**`，不包含 `dist-built/`
- 宠物窗口需要 `dist/pet.html` 和 `dist/pet-bubble.html`，但 `dist-built/` 不会被打包
- 修复：把 `dist-built/index.html` 复制为 `dist/pet.html`，`dist-built/pet-bubble.html` 复制到 `dist/`

---

## 正确的部署步骤

### 1. 复制文件到 C 盘源码目录
```
copy/apps/desktop/electron/pet/          → electron/pet/          (5 个 .cjs)
copy/apps/desktop/dist-built/            → dist-built/            (HTML + JS)
copy/apps/desktop/public/                → public/                (图片 + 视频)
copy/apps/desktop/src/pet/               → src/pet/               (TSX)
copy/apps/desktop/src/pet-bubble/        → src/pet-bubble/        (TSX)
```

### 2. 把 dist-built/index.html 复制为 dist/pet.html（否则 electron-builder 不打包）
```
copy dist-built/index.html → dist/pet.html
copy dist-built/pet-bubble.html → dist/pet-bubble.html
copy dist-built/pet-bubble.js → dist/pet-bubble.js
```

### 3. 修改 electron/main.cjs
- 在顶部 `createLinkTitleWindow` 的 require 之后加：
  ```js
  const { initPet } = require('./pet/pet-init.cjs')
  ```
- 在模块级 `app.whenReady().then()` 里的 `createWindow()` 之后加：
  ```js
  try { initPet(mainWindow) } catch(e) {}
  ```

### 4. 修改 electron/preload.cjs（末尾追加）
```js
require('./pet/pet-renderer-bridge.cjs').injectPetRendererBridge();
```

### 5. 修改 electron/bootstrap-runner.cjs（末尾追加）
**注意：IIFE 前面必须加 `;`！**
```js
;(function() {
  try {
    if (module.exports && typeof module.exports.resolveInstallScript === 'function') {
      var _origResolve = module.exports.resolveInstallScript;
      module.exports.resolveInstallScript = async function() {
        ...
      };
    }
  } catch(_) {}
})();
```

### 6. electron-builder 重新打包
```bash
cd C:\Users\EVAN\AppData\Local\hermes\hermes-agent\apps\desktop
npm run builder -- --dir
```

### 7. 启动验证
```bash
C:\Users\EVAN\AppData\Local\hermes\hermes-agent\apps\desktop\release\win-unpacked\Hermes.exe
```
检查 `%LOCALAPPDATA%\hermes\logs\pet-debug.log` 确认宠物初始化成功。

---

### 坑 8：type: toolbar 在 Windows 上导致宠物窗口立即关闭
- pet-windows.cjs 里宠物窗口设置了 type: toolbar
- Windows 上 toolbar 类型窗口会出现后立即关闭
- 修复：改为 type: normal

### 坑 9：宠物没有 HTML 页面
- dist-built/ 里只有 index.html（气泡页面），没有 pet.html
- 补丁缺少宠物的独立 HTML 页面
- 修复：创建了一个纯 HTML 页面（播放 webm 视频），放在 dist-built/pet.html

---

## 补丁源码修复清单（已修复）

| 文件 | 修复内容 |
|------|---------|
| pet/hooks/bootstrap-runner.hook | IIFE 前加 ;
| pet/copy/.../electron/pet/pet-windows.cjs | type: toolbar 改为 type: normal |
| pet/copy/.../dist-built/pet.html | 新增：纯 HTML 宠物页面（播放 webm） |

## 当前进度
- [x] 识别出 9 个坑，记录了原因和修复方法
- [x] 修复 `bootstrap-runner.hook` IIFE 缺少分号
- [x] 发现 `dist-built/` 不被打包，需要复制到 `dist/`
- [x] 在 C 盘部署 pet 模块并重新打包
- [x] 启动验证：pet-debug.log 显示所有初始化步骤成功
- [ ] 等待用户确认宠物是否出现在桌面右下角