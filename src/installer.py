"""PetAgent 模块化安装器 — HookInstaller 核心逻辑 + 自动发现"""

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


# ══════════════════════════════════════════════════════════════════════
# 自动发现 & 环境检测（小白友好）
# ══════════════════════════════════════════════════════════════════════

def _find_asar_cli():
    """多路径查找 asar CLI，支持打包后和源码开发两种场景."""
    candidates = []

    # 1. 打包后：asar 放在 resources 目录下
    if getattr(sys, 'frozen', False):
        base = Path(sys._MEIPASS)
        candidates.extend([
            base / "node_modules" / ".bin" / "asar.cmd",
            base / "node_modules" / ".bin" / "asar",
            base / "asar" / "node_modules" / ".bin" / "asar.cmd",
            base / "asar" / "node_modules" / ".bin" / "asar",
        ])

    # 2. 源码开发：electron-app/node_modules
    candidates.extend([
        Path(__file__).resolve().parent / "electron-app" / "node_modules" / ".bin" / "asar.cmd",
        Path(__file__).resolve().parent / "electron-app" / "node_modules" / ".bin" / "asar",
        # 备选：全局安装
        Path(os.environ.get("APPDATA", "")) / "npm" / "asar.cmd",
        Path(os.environ.get("APPDATA", "")) / "npm" / "asar",
    ])

    for c in candidates:
        if c.exists():
            return c
    return None


def find_hermes_installation():
    """自动扫描常见路径，找到 Hermes 安装目录。返回 (路径, 描述) 或 (None, 原因)."""
    import platform

    home = Path.home()
    local_appdata = os.environ.get("LOCALAPPDATA", str(home / "AppData" / "Local"))
    appdata = os.environ.get("APPDATA", str(home / "AppData" / "Roaming"))
    program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")

    sysname = platform.system()

    search_paths = []

    if sysname == "Windows":
        search_paths = [
            (Path(local_appdata) / "hermes" / "hermes-agent", "本地部署 (AppData/Local)"),
            (Path(local_appdata) / "hermes" / "HermesAgent", "本地部署 (AppData/Local)"),
            (Path(local_appdata) / "Programs" / "hermes" / "hermes-agent", "本地部署 (AppData/Local/Programs)"),
            (Path(program_files) / "Hermes" / "hermes-agent", "系统安装 (Program Files)"),
            (Path(program_files_x86) / "Hermes" / "hermes-agent", "系统安装 (Program Files x86)"),
            (Path(appdata) / "hermes" / "hermes-agent", "用户安装 (AppData/Roaming)"),
            (home / "hermes" / "hermes-agent", "用户目录"),
            (home / "Hermes" / "hermes-agent", "用户目录"),
            (home / "hermes-agent", "用户目录"),
        ]
    elif sysname == "Darwin":
        search_paths = [
            (home / "Library" / "Application Support" / "hermes" / "hermes-agent", "macOS"),
            (Path("/Applications/Hermes.app/Contents/Resources/hermes-agent"), "macOS"),
        ]
    else:  # Linux
        search_paths = [
            (home / ".config" / "hermes" / "hermes-agent", "Linux"),
            (home / ".local" / "share" / "hermes" / "hermes-agent", "Linux"),
            (Path("/opt/hermes/hermes-agent"), "Linux"),
        ]

    # Common marker: check for pyproject.toml or apps/desktop/electron/main.cjs
    for path, desc in search_paths:
        if not path.exists():
            continue
        markers = [
            path / "pyproject.toml",
            path / "apps" / "desktop" / "electron" / "main.cjs",
            path / "apps" / "desktop" / "package.json",
        ]
        if any(m.exists() for m in markers):
            return path.resolve(), desc

    # Fallback: try current working directory
    cwd = Path.cwd()
    if (cwd / "pyproject.toml").exists() or (cwd / "apps" / "desktop" / "electron" / "main.cjs").exists():
        return cwd.resolve(), "当前目录"

    if (cwd.parent / "pyproject.toml").exists():
        return cwd.parent.resolve(), "当前目录的上级"

    return None, "未找到 Hermes 安装目录"


def kill_hermes_process():
    """安全关闭 Hermes 进程，避免 asar 文件锁."""
    import platform
    sysname = platform.system()

    try:
        if sysname == "Windows":
            # taskkill 不会弹窗
            r = subprocess.run(
                ["taskkill", "/F", "/IM", "Hermes.exe"],
                capture_output=True, text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
            return r.returncode == 0 or "没有运行的" in r.stderr or "not found" in r.stdout.lower()
        else:
            r = subprocess.run(
                ["pkill", "-f", "Hermes"],
                capture_output=True, text=True
            )
            return r.returncode == 0 or "no process" in r.stderr.lower()
    except Exception:
        return False


def get_asar_path(target: Path):
    """平台感知的 asar 路径检测."""
    release_dir = target / "apps" / "desktop" / "release"
    candidates = [
        release_dir / "win-unpacked" / "resources" / "app.asar",
        release_dir / "mac" / "Hermes.app" / "Contents" / "Resources" / "app.asar",
        release_dir / "linux-unpacked" / "resources" / "app.asar",
        release_dir / "mac-arm64" / "Hermes.app" / "Contents" / "Resources" / "app.asar",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def check_hermes_version(target: Path):
    """检查 Hermes 版本兼容性。返回 (version_info, warnings)."""
    warnings = []
    stamp_path = target / "apps" / "desktop" / "release" / "win-unpacked" / "resources" / "install-stamp.json"
    # 尝试其他平台路径
    if not stamp_path.exists():
        release_dir = target / "apps" / "desktop" / "release"
        for p in release_dir.glob("*/resources/install-stamp.json"):
            stamp_path = p
            break

    if not stamp_path.exists():
        return None, ["未找到版本信息，跳过兼容性检查"]

    try:
        stamp = json.loads(stamp_path.read_text(encoding="utf-8"))
    except Exception:
        return None, ["无法读取版本信息"]

    version = stamp.get("commit", "")
    branch = stamp.get("branch", "")

    # 检查关键锚点文件是否存在
    main_cjs = target / "apps" / "desktop" / "electron" / "main.cjs"
    if main_cjs.exists():
        content = main_cjs.read_text(encoding="utf-8")
        if "let mainWindow = null" not in content:
            warnings.append("未找到 mainWindow 锚点，宠物钩子可能无法注入")
    else:
        warnings.append("未找到 main.cjs，钩子注入可能失败")

    return stamp, warnings


# ══════════════════════════════════════════════════════════════════════
# HookInstaller 主类
# ══════════════════════════════════════════════════════════════════════

class HookInstaller:
    """钩子注入安装器：追加标记代码到目标文件末尾，不修改原始文件"""

    def __init__(self, target: Path, hooks_map: dict, manifest: dict, copy_dir: Path, backup_dir: Path, json_output: bool = False):
        self.target = target.resolve()
        self.hooks_map = hooks_map
        self.manifest = manifest
        self.copy_dir = copy_dir
        self.backup_dir = backup_dir
        self.module_map = {m["id"]: m for m in manifest.get("modules", [])}
        self.backup = backup_dir / datetime.now().strftime("%Y%m%d_%H%M%S%f")
        self.logs = []
        self._selected = set()
        self._json_output = json_output

    def log(self, msg, level="info"):
        entry = {"level": level, "msg": str(msg or "")}
        self.logs.append(entry)
        if self._json_output:
            print(json.dumps(entry, ensure_ascii=False), flush=True)

    # ── 依赖解析 ──

    def resolve_deps(self, module_ids):
        selected = set()
        ordered = []
        for mid in module_ids:
            self._resolve_one(mid, selected, ordered)
        return ordered

    def _resolve_one(self, mid, selected, ordered=None):
        if ordered is None:
            ordered = []
        if mid in selected:
            return
        m = self.module_map.get(mid)
        if not m:
            if self._is_submodule(mid):
                parent = self._find_parent(mid)
                if parent:
                    self.log(f"子模块 {mid} 将随父模块 {parent} 自动安装", "warn")
                    self._resolve_one(parent, selected, ordered)
                else:
                    self.log(f"子模块 {mid} 未找到父模块", "error")
                return
            self.log(f"未知模块: {mid}", "error")
            return
        if m.get("disabled"):
            self.log(f"模块 {mid} 暂不可用，已跳过", "warn")
            return
        for req in m.get("requires", []):
            self._resolve_one(req, selected, ordered)
        selected.add(mid)
        ordered.append(mid)

    def _is_submodule(self, mid):
        for pm in self.module_map.values():
            for sub in pm.get("submodules", []):
                if sub["id"] == mid:
                    return True
        return False

    def _find_parent(self, sub_id):
        for pid, pm in self.module_map.items():
            for sub in pm.get("submodules", []):
                if sub["id"] == sub_id:
                    return pid
        return None

    # ── 钩子注入 ──

    def _apply_hook(self, hook_name, module_id):
        target_rel = self.hooks_map.get(hook_name)
        if not target_rel:
            self.log(f"hooks.yaml 中未找到: {hook_name}", "error")
            return False

        hook_file = None
        search_order = []
        seen = set()

        def _collect_deps(mid):
            if mid in seen:
                return
            seen.add(mid)
            search_order.append(mid)
            for req in self.module_map.get(mid, {}).get("requires", []):
                _collect_deps(req)

        _collect_deps(module_id)
        for mid in search_order:
            candidate = self.copy_dir / mid / "hooks" / hook_name
            if candidate.exists():
                hook_file = candidate
                break

        if not hook_file:
            self.log(f"钩子文件不存在: {hook_name}", "warn")
            return True

        target_file = self.target / target_rel
        if not target_file.exists():
            self.log(f"目标文件不存在: {target_rel}", "warn")
            return True

        hook_content = hook_file.read_text(encoding="utf-8")
        target_content = target_file.read_text(encoding="utf-8")

        marker = f"═══ PetAgent:{module_id} ═══"
        if marker in target_content:
            self.log(f"已安装: {target_rel}", "skip")
            return True

        bp = self.backup / target_rel
        bp.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target_file, bp)

        if not target_content.endswith("\n"):
            target_content += "\n"
        # For main.cjs, insert after mainWindow declaration
        if target_rel == "apps/desktop/electron/main.cjs" and "let mainWindow = null" in target_content:
            anchor = "let mainWindow = null"
            anchor_idx = target_content.find(anchor) + len(anchor)
            newline = target_content.find("\n", anchor_idx)
            if newline > 0:
                target_content = target_content[:newline + 1] + "\n" + hook_content + "\n" + target_content[newline + 1:]
            else:
                target_content += "\n" + hook_content + "\n"
        else:
            target_content += "\n" + hook_content + "\n"

        target_file.write_text(target_content, encoding="utf-8")
        self.log(f"hook: {target_rel}", "ok")
        return True

    # ── 文件复制 ──

    def _copy_items(self, items, module_id):
        for item in items:
            src = self.copy_dir / module_id / "copy" / item
            dst = self.target / item
            if not src.exists():
                self.log(f"skip: {item}", "warn")
                continue
            try:
                dst.parent.mkdir(parents=True, exist_ok=True)
                if dst.exists():
                    bp = self.backup / item
                    bp.parent.mkdir(parents=True, exist_ok=True)
                    if dst.is_dir():
                        shutil.copytree(dst, bp, dirs_exist_ok=True)
                    else:
                        shutil.copy2(dst, bp)
                if src.is_dir():
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)
                self.log(f"copy: {item}", "ok")
            except Exception as e:
                self.log(f"fail: {item} {e}", "error")
                return False
        return True

    # ── 安装入口 ──

    def install_module(self, module_id):
        m = self.module_map.get(module_id)
        if not m:
            self.log(f"未知模块: {module_id}，请检查模块 ID 是否正确", "error")
            return False

        name = m.get("name", module_id)
        hooks = m.get("hooks", [])
        copy_items = m.get("copy", [])
        subs = [s for s in m.get("submodules", []) if s["id"] in self._selected]

        total_steps = len(hooks) + (1 if copy_items else 0) + len(subs)
        self.log(f"▸ {name} ({total_steps} 步)", "info")

        for hook_name in hooks:
            if not self._apply_hook(hook_name, module_id):
                return False

        if copy_items:
            if not self._copy_items(copy_items, module_id):
                return False

        for sub in subs:
            self._copy_items(sub.get("copy", []), module_id)

        return True

    def install(self, module_ids):
        self._selected = set(module_ids)
        self.logs = []
        resolved = self.resolve_deps(module_ids)
        self.log(f"目标: {self.target}", "info")
        self.log(f"共计 {len(resolved)} 个模块", "info")

        ok = True
        for i, mid in enumerate(resolved):
            self.log(f"progress:{i+1}/{len(resolved)}", "info")
            if not self.install_module(mid):
                ok = False
        self.log(f"progress:{len(resolved)}/{len(resolved)}", "info")

        if ok:
            self._handle_asar()
            self._inject_source_html()
            self._write_version_marker()

        return {"success": ok, "log": self.logs}

    def _write_version_marker(self):
        """写入版本标记文件，供扩展管理器检测安装状态和版本"""
        try:
            version = self.manifest.get("version", "0.0.0")
            marker = self.target / ".petagent-version"
            marker.write_text(str(version), encoding="utf-8")
            self.log(f"版本标记已写入: {version}", "ok")
        except Exception as e:
            self.log(f"版本标记写入失败: {e}", "warn")

    # ── 源码 HTML 注入（dev 模式支持） ──

    def _inject_source_html(self):
        """注入脚本到源码 index.html，支持 npm run dev 开发模式"""
        import json as _json

        source_html = self.target / "apps" / "desktop" / "index.html"
        if not source_html.exists():
            return

        html = source_html.read_text(encoding="utf-8")
        scripts = []

        for mid in self._selected:
            m = self.module_map.get(mid)
            if not m:
                continue
            dist_inject = m.get("dist_inject")
            if not dist_inject:
                continue

            if dist_inject.get("theme"):
                # 亮色 = Nous / 暗色 = Mono
                # 通过 localStorage 注册为用户主题，兼容编译版 asar
                # 若 Hermes 源码已有 petagent 内置主题，user-themes.ts 会自动跳过此注入
                theme_colors = {
                    "name": "petagent", "label": "PetAgent",
                    "description": "亮色 Nous + 暗色 Mono",
                    "colors": {
                        "background": "#FFFFFF", "foreground": "#18181B",
                        "card": "#FFFFFF", "cardForeground": "#18181B",
                        "muted": "#F5F5F5", "mutedForeground": "#6B6B70",
                        "popover": "#FFFFFF", "popoverForeground": "#18181B",
                        "primary": "#18181B", "primaryForeground": "#FCFCFC",
                        "secondary": "#F0F0F0", "secondaryForeground": "#242432",
                        "accent": "#E8E8E8", "accentForeground": "#202030",
                        "border": "#E0E0E0", "input": "#E8E8E8",
                        "ring": "#18181B", "midground": "#18181B",
                        "composerRing": "#18181B",
                        "destructive": "#B94A3A", "destructiveForeground": "#FFFFFF",
                        "sidebarBackground": "#ECECEE", "sidebarBorder": "#E0E0E0",
                        "userBubble": "#f0f0f0", "userBubbleBorder": "#a0a0a0"
                    },
                    "darkColors": {
                        "background": "#0e0e0e", "foreground": "#eaeaea",
                        "card": "#141414", "cardForeground": "#eaeaea",
                        "muted": "#1e1e1e", "mutedForeground": "#808080",
                        "popover": "#181818", "popoverForeground": "#eaeaea",
                        "primary": "#eaeaea", "primaryForeground": "#0e0e0e",
                        "secondary": "#262626", "secondaryForeground": "#c8c8c8",
                        "accent": "#222222", "accentForeground": "#d8d8d8",
                        "border": "#2a2a2a", "input": "#2a2a2a",
                        "ring": "#9a9a9a", "midground": "#9a9a9a",
                        "composerRing": "#9a9a9a",
                        "destructive": "#a84040", "destructiveForeground": "#fef2f2",
                        "sidebarBackground": "#0a0a0a", "sidebarBorder": "#202020",
                        "userBubble": "#1a1a1a", "userBubbleBorder": "#363636"
                    }
                }
                theme_json = _json.dumps(theme_colors, ensure_ascii=False)
                scripts.append(
                    '<script>try{var e=localStorage.getItem("hermes-desktop-user-themes-v1");'
                    'var t=e?JSON.parse(e):{};'
                    't.petagent=' + theme_json + ';'
                    'localStorage.setItem("hermes-desktop-user-themes-v1",JSON.stringify(t))'
                    '}catch(e){}</script>'
                )
                scripts.append(
                    '<script>try{localStorage.setItem("hermes-desktop-theme-v2","petagent")'
                    '}catch(e){}</script>'
                )
                # 欢迎页品牌标识
                scripts.append(
                    '<script>'
                    '(function(){'
                    'function inject(){'
                    'var intro=document.querySelector("[data-slot=\'aui_intro\']");'
                    'if(!intro)return;'
                    'var container=intro.querySelector(":scope>div");'
                    'if(!container)return;'
                    'var existingPet=container.querySelector(".intro-petagent");'
                    'if(existingPet){applyTheme();return;}'
                    'var hermesDiv=document.createElement("div");'
                    'hermesDiv.className="intro-hermes";'
                    'while(container.firstChild)hermesDiv.appendChild(container.firstChild);'
                    'var petDiv=document.createElement("div");'
                    'petDiv.className="intro-petagent";'
                    'var img=document.createElement("img");'
                    'img.src="./pet-agent-logo.png";'
                    'img.alt="PET AGENT";'
                    'img.style.cssText="display:block;margin:0 auto 0.75rem;height:auto;width:16rem;max-width:100%;object-fit:contain;opacity:1";'
                    'petDiv.appendChild(img);'
                    'var p=document.createElement("p");'
                    'p.style.cssText="margin:0;text-align:center;line-height:1.5;letter-spacing:-0.01em";'
                    'p.textContent="\\u6709\\u4ec0\\u4e48\\u9700\\u8981\\u5e2e\\u5fd9\\u7684\\uff1f\\u55b5\\uff5e";'
                    'petDiv.appendChild(p);'
                    'container.appendChild(hermesDiv);'
                    'container.appendChild(petDiv);'
                    'applyTheme();'
                    '}'
                    'function applyTheme(){'
                    'var theme=document.documentElement.dataset.hermesTheme||"";'
                    'var isDark=document.documentElement.classList.contains("dark");'
                    'var petDiv=document.querySelector(".intro-petagent");'
                    'var hermesDiv=document.querySelector(".intro-hermes");'
                    'var img=petDiv?petDiv.querySelector("img"):null;'
                    'if(!petDiv||!hermesDiv)return;'
                    'if(theme==="petagent"){'
                    'hermesDiv.style.display="none";petDiv.style.display="block";'
                    'if(img)img.style.filter=isDark?"invert(1)":"none";'
                    '}else{'
                    'hermesDiv.style.display="block";petDiv.style.display="none";'
                    'if(img)img.style.filter="none";'
                    '}'
                    '}'
                    'inject();'
                    'new MutationObserver(function(){inject()}).observe(document.documentElement,{childList:!0,subtree:!0});'
                    'new MutationObserver(applyTheme).observe(document.documentElement,{attributes:!0,attributeFilter:["data-hermes-theme","class"]});'
                    '})();'
                    '</script>'
                )

            if dist_inject.get("zh"):
                scripts.append(
                    '<script>try{var u=window.__hermesUpdateTranslations||{};'
                    'u.portableTitle="\\u4fbf\\u643a\\u7248\\u66f4\\u65b0";'
                    'u.portableBody="\\u5f53\\u524d\\u4e3a Hermes Desktop \\u79bb\\u7ebf\\u90e8\\u7f72\\u4fbf\\u643a\\u7248\\uff0c\\u5e94\\u7528\\u5185\\u81ea\\u52a8\\u66f4\\u65b0\\u4e0d\\u53ef\\u7528\\u3002";'
                    'u.portableDownload="\\u524d\\u5f80\\u4e0b\\u8f7d";'
                    'u.portableUpdateMessage="\\u5f53\\u524d\\u4e3a Hermes Desktop \\u79bb\\u7ebf\\u90e8\\u7f72\\u4fbf\\u643a\\u7248";'
                    'u.portableQuarkLink="\\u5938\\u514b\\u7f51\\u76d8";'
                    'u.portableMobileLink="\\u79fb\\u52a8\\u4e91\\u76d8";'
                    'window.__hermesUpdateTranslations=u;'
                    'var m=window.__hermesModelTranslations||{};'
                    'm.persistGlobalSession="\\u5168\\u5c40\\u4fdd\\u5b58 (\\u5426\\u5219\\u4ec5\\u5f53\\u524d\\u4f1a\\u8bdd)";'
                    'm.persistGlobal="\\u5168\\u5c40\\u4fdd\\u5b58";'
                    'window.__hermesModelTranslations=m}catch(e){}</script>'
                )
                scripts.append(
                    '<script>'
                    '(function(){try{'
                    'Object.defineProperty(navigator,"language",{get:function(){return"zh-CN"},configurable:!0});'
                    'Object.defineProperty(navigator,"languages",{get:function(){return["zh-CN","zh","en"]},configurable:!0})'
                    '}catch(e){}})();'
                    '</script>'
                )

        if scripts:
            # 注入 CSS link（dev 模式从 public/ 加载）
            css_link = '<link rel="stylesheet" href="/petagent-theme.css">'
            # 清理旧的 PetAgent 注入（避免重复堆积）
            import re as _re
            html = _re.sub(r'<link rel="stylesheet" href="/petagent-theme\.css">\s*', '', html)
            html = _re.sub(r'<script>try\{.*?hermes-desktop-user-themes.*?\}catch\(e\)\{\}</script>\s*', '', html)
            html = _re.sub(r'<script>try\{.*?hermes-desktop-theme-v2.*?\}catch\(e\)\{\}</script>\s*', '', html)
            html = _re.sub(r'<script>\(function\(\).*?intro-hermes.*?\}\)\(\);</script>\s*', '', html)
            html = _re.sub(r'<script>try\{.*?__hermesUpdateTranslations.*?\}catch\(e\)\{\}</script>\s*', '', html)
            html = _re.sub(r'<script>\(function\(\).*?navigator\.language.*?\}\)\(\);</script>\s*', '', html)
            html = _re.sub(r'<script>\s*\n\s*\(function installPetRendererBridge.*?</script>\s*', '', html, flags=_re.DOTALL)
            html = html.replace("</head>", css_link + "\n" + "\n".join(scripts) + "\n</head>")
            source_html.write_text(html, encoding="utf-8")
            self.log("source inject: index.html (dev mode)", "ok")

        # 复制 CSS 到 public/ 供 Vite dev 模式加载
        css_src = None
        for mid in self._selected:
            candidate = self.copy_dir / mid / "copy" / "apps" / "desktop" / "src" / "petagent-theme.css"
            if candidate.exists():
                css_src = candidate
                break
        if css_src:
            public_dir = self.target / "apps" / "desktop" / "public"
            public_dir.mkdir(parents=True, exist_ok=True)
            css_dst = public_dir / "petagent-theme.css"
            shutil.copy2(str(css_src), str(css_dst))
            self.log("source copy: public/petagent-theme.css (dev mode)", "ok")

    # ── asar 处理 ──

    def _handle_asar(self):
        asar_path = get_asar_path(self.target)
        if not asar_path:
            self.log("未检测到 app.asar，跳过 asar 注入（源码钩子已应用）", "info")
            return

        asar_cli = _find_asar_cli()
        if not asar_cli:
            self.log("asar CLI 未找到，仅应用源码钩子。如需完整补丁请安装 Node.js 后重新运行", "warn")
            return

        # 尝试关闭 Hermes 进程
        kill_hermes_process()

        os_env = os.environ
        node_bin = str(asar_cli.parent)
        asar_env = {**os_env, "PATH": node_bin + os.pathsep + os_env.get("PATH", "")}

        app_dir = asar_path.parent / "app"
        if app_dir.exists():
            shutil.rmtree(str(app_dir), ignore_errors=True)
        app_dir.mkdir(parents=True, exist_ok=True)

        self.log("检测到 app.asar，正在解包...", "info")
        r = subprocess.run(
            [str(asar_cli), "extract", str(asar_path), str(app_dir)],
            capture_output=True, text=True, env=asar_env,
            creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        )
        if r.returncode != 0:
            self.log(f"asar 解包失败: {r.stderr}", "error")
            self.log("源码钩子已应用，但 asar 注入失败。请关闭 Hermes 后重试", "warn")
            return

        self.log("asar 解包完成，注入钩子...", "info")
        PREFIX = "apps/desktop/"
        injected = 0
        for hook_name, target_rel in self.hooks_map.items():
            hook_file = None
            for mid in self._selected:
                candidate = self.copy_dir / mid / "hooks" / hook_name
                if candidate.exists():
                    hook_file = candidate
                    break
            if not hook_file:
                continue

            if target_rel.startswith(PREFIX):
                asar_rel = target_rel[len(PREFIX):]
            else:
                asar_rel = target_rel

            target_file = app_dir / asar_rel
            if not target_file.exists():
                self.log(f"asar 中无此文件: {asar_rel}", "info")
                continue

            hook_content = hook_file.read_text(encoding="utf-8")
            target_content = target_file.read_text(encoding="utf-8")

            if "═══ PetAgent:" in target_content:
                continue

            if not target_content.endswith("\n"):
                target_content += "\n"
            if asar_rel == "electron/main.cjs" and "let mainWindow = null" in target_content:
                anchor = "let mainWindow = null"
                anchor_idx = target_content.find(anchor) + len(anchor)
                newline = target_content.find("\n", anchor_idx)
                if newline > 0:
                    target_content = target_content[:newline + 1] + "\n" + hook_content + "\n" + target_content[newline + 1:]
                else:
                    target_content += "\n" + hook_content + "\n"
            else:
                target_content += "\n" + hook_content + "\n"
            target_file.write_text(target_content, encoding="utf-8")
            injected += 1
            self.log(f"asar hook: {asar_rel}", "ok")

        copied = 0
        for mid in self._selected:
            m = self.module_map.get(mid)
            if not m:
                continue
            for item in m.get("copy", []):
                src = self.copy_dir / mid / "copy" / item
                if not src.exists():
                    continue
                if item.startswith(PREFIX):
                    asar_rel = item[len(PREFIX):]
                else:
                    asar_rel = item
                dst = app_dir / asar_rel
                if dst.exists():
                    continue
                try:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    if src.is_dir():
                        shutil.copytree(src, dst, dirs_exist_ok=True)
                    else:
                        shutil.copy2(src, dst)
                    copied += 1
                    self.log(f"asar copy: {asar_rel}", "ok")
                except Exception as e:
                    self.log(f"asar copy fail: {asar_rel} {e}", "error")

            for sub in m.get("submodules", []):
                if sub["id"] not in self._selected:
                    continue
                for item in sub.get("copy", []):
                    src = self.copy_dir / mid / "copy" / item
                    if not src.exists():
                        continue
                    if item.startswith(PREFIX):
                        asar_rel = item[len(PREFIX):]
                    else:
                        asar_rel = item
                    dst = app_dir / asar_rel
                    if dst.exists():
                        continue
                    try:
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        if src.is_dir():
                            shutil.copytree(src, dst, dirs_exist_ok=True)
                        else:
                            shutil.copy2(src, dst)
                        copied += 1
                        self.log(f"asar copy: {asar_rel}", "ok")
                    except Exception as e:
                        self.log(f"asar copy fail: {asar_rel} {e}", "error")

        if injected == 0 and copied == 0:
            self.log("asar 无需更新", "info")
        else:
            self.log(f"asar app/: {injected} 钩子 + {copied} 文件", "ok")

        self._inject_dist(app_dir)

        # Repack
        self.log("重新打包 app.asar...", "info")
        asar_backup = asar_path.with_suffix(".asar.bak")
        if not asar_backup.exists():
            shutil.copy2(asar_path, asar_backup)
        unpacked_dir = Path(str(asar_path) + ".unpacked")
        unpacked_backup = Path(str(asar_path) + ".unpacked.bak")
        if unpacked_dir.exists() and not unpacked_backup.exists():
            try:
                shutil.copytree(str(unpacked_dir), str(unpacked_backup))
            except Exception:
                pass

        asar_new = asar_path.with_suffix(".asar.new")
        asar_new_unpacked = Path(str(asar_new) + ".unpacked")
        if asar_new.exists():
            asar_new.unlink()
        if asar_new_unpacked.exists():
            shutil.rmtree(str(asar_new_unpacked), ignore_errors=True)

        r = subprocess.run(
            [str(asar_cli), "pack", str(app_dir), str(asar_new),
             "--unpack-dir", "dist", "--unpack", "*.node"],
            capture_output=True, text=True, env=asar_env,
            creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        )
        if r.returncode == 0:
            try:
                asar_path.unlink()
            except PermissionError:
                self.log("asar 文件被占用，请关闭 Hermes 后重试", "error")
                shutil.rmtree(str(app_dir), ignore_errors=True)
                return
            asar_new.rename(asar_path)
            if asar_new_unpacked.exists():
                if unpacked_dir.exists():
                    shutil.rmtree(str(unpacked_dir), ignore_errors=True)
                asar_new_unpacked.rename(unpacked_dir)
                self.log("已更新 app.asar.unpacked (dist)", "ok")
            shutil.rmtree(str(app_dir), ignore_errors=True)
            self.log(f"asar 重新打包完成，大小: {asar_path.stat().st_size}", "ok")
        else:
            self.log(f"asar 打包失败: {r.stderr}", "error")
            self.log("源码钩子已应用，但 asar 重新打包失败。请检查磁盘空间和权限", "warn")

    # ── 编译产物 i18n 替换表 ──
    # 格式: (搜索字符串, 替换字符串) — 精确匹配，只替换中文(zh-CN)区域的值
    _I18N_PATCHES = [
        ("restartGateway:`重启网关`", "restartGateway:`重启消息服务`"),
        ("gatewayRestartFailed:`网关重启失败。`", "gatewayRestartFailed:`消息服务重启失败。`"),
        ("restartToApply:`此更改将在网关重启后生效。`", "restartToApply:`重启网关后此更改才会生效。`"),
        ("restartToReconnect:`新凭据将在网关重启后生效。`", "restartToReconnect:`重启网关以使用新凭据重新连接。`"),
        ('weixin:"运行 `hermes gateway setup`，选择 Weixin，然后使用个人微信账号扫描并确认二维码。Hermes 会通过腾讯 iLink Bot API 连接并保存凭据。"',
         'weixin:"登录微信公众平台，复制 AppID 和 Token，并把消息回调 URL 指向 Hermes。"'),
    ]

    def _patch_i18n_bundle(self, app_dir):
        """在编译后的 JS bundle 中替换中文翻译值（精确字符串匹配）"""
        assets_dir = app_dir / "dist" / "assets"
        if not assets_dir.exists():
            return

        for js_file in assets_dir.glob("index-*.js"):
            content = js_file.read_text(encoding="utf-8")
            modified = content
            patched = 0

            for search, replace in self._I18N_PATCHES:
                if search in modified:
                    modified = modified.replace(search, replace)
                    patched += 1
                else:
                    self.log(f"i18n: NOT FOUND: {search[:50]}...", "warn")

            if modified != content:
                js_file.write_text(modified, encoding="utf-8")
                self.log(f"i18n patch: {js_file.name} ({patched} replacements)", "ok")

    def _inject_dist(self, app_dir):
        """Inject scripts into dist/index.html and CSS into dist/assets/*.css"""
        import json as _json

        index_html = app_dir / "dist" / "index.html"
        if not index_html.exists():
            return

        html = index_html.read_text(encoding="utf-8")
        scripts = []

        for mid in self._selected:
            m = self.module_map.get(mid)
            if not m:
                continue
            dist_inject = m.get("dist_inject")
            if not dist_inject:
                continue

            if dist_inject.get("theme"):
                # 亮色 = Nous / 暗色 = Mono
                # 通过 localStorage 注册为用户主题，兼容编译版 asar 和源码模式
                theme_colors = {
                    "name": "petagent", "label": "PetAgent",
                    "description": "亮色 Nous + 暗色 Mono",
                    "colors": {
                        "background": "#FFFFFF", "foreground": "#18181B",
                        "card": "#FFFFFF", "cardForeground": "#18181B",
                        "muted": "#F5F5F5", "mutedForeground": "#6B6B70",
                        "popover": "#FFFFFF", "popoverForeground": "#18181B",
                        "primary": "#18181B", "primaryForeground": "#FCFCFC",
                        "secondary": "#F0F0F0", "secondaryForeground": "#242432",
                        "accent": "#E8E8E8", "accentForeground": "#202030",
                        "border": "#E0E0E0", "input": "#E8E8E8",
                        "ring": "#18181B", "midground": "#18181B",
                        "composerRing": "#18181B",
                        "destructive": "#B94A3A", "destructiveForeground": "#FFFFFF",
                        "sidebarBackground": "#ECECEE", "sidebarBorder": "#E0E0E0",
                        "userBubble": "#f0f0f0", "userBubbleBorder": "#a0a0a0"
                    },
                    "darkColors": {
                        "background": "#0e0e0e", "foreground": "#eaeaea",
                        "card": "#141414", "cardForeground": "#eaeaea",
                        "muted": "#1e1e1e", "mutedForeground": "#808080",
                        "popover": "#181818", "popoverForeground": "#eaeaea",
                        "primary": "#eaeaea", "primaryForeground": "#0e0e0e",
                        "secondary": "#262626", "secondaryForeground": "#c8c8c8",
                        "accent": "#222222", "accentForeground": "#d8d8d8",
                        "border": "#2a2a2a", "input": "#2a2a2a",
                        "ring": "#9a9a9a", "midground": "#9a9a9a",
                        "composerRing": "#9a9a9a",
                        "destructive": "#a84040", "destructiveForeground": "#fef2f2",
                        "sidebarBackground": "#0a0a0a", "sidebarBorder": "#202020",
                        "userBubble": "#1a1a1a", "userBubbleBorder": "#363636"
                    }
                }
                theme_json = _json.dumps(theme_colors, ensure_ascii=False)
                scripts.append(
                    '<script>try{var e=localStorage.getItem("hermes-desktop-user-themes-v1");'
                    'var t=e?JSON.parse(e):{};'
                    't.petagent=' + theme_json + ';'
                    'localStorage.setItem("hermes-desktop-user-themes-v1",JSON.stringify(t))'
                    '}catch(e){}</script>'
                )
                scripts.append(
                    '<script>try{localStorage.setItem("hermes-desktop-theme-v2","petagent")'
                    '}catch(e){}</script>'
                )
                # 欢迎页品牌标识：DOM 注入 PetAgent logo + 中文欢迎语
                scripts.append(
                    '<script>'
                    '(function(){'
                    'var done=!1;'
                    'function inject(){'
                    'if(done)return;'
                    'var intro=document.querySelector("[data-slot=\'aui_intro\']");'
                    'if(!intro)return;'
                    'var container=intro.querySelector(":scope>div");'
                    'if(!container)return;'
                    'done=!0;'
                    'var hermesDiv=document.createElement("div");'
                    'hermesDiv.className="intro-hermes";'
                    'while(container.firstChild)hermesDiv.appendChild(container.firstChild);'
                    'var petDiv=document.createElement("div");'
                    'petDiv.className="intro-petagent";'
                    'var img=document.createElement("img");'
                    'img.src="./pet-agent-logo.png";'
                    'img.alt="PET AGENT";'
                    'img.style.cssText="display:block;margin:0 auto 0.75rem;height:auto;width:16rem;max-width:100%;object-fit:contain;opacity:1";'
                    'petDiv.appendChild(img);'
                    'var p=document.createElement("p");'
                    'p.style.cssText="margin:0;text-align:center;line-height:1.5;letter-spacing:-0.01em";'
                    'p.textContent="\\u6709\\u4ec0\\u4e48\\u9700\\u8981\\u5e2e\\u5fd9\\u7684\\uff1f\\u55b5\\uff5e";'
                    'petDiv.appendChild(p);'
                    'container.appendChild(hermesDiv);'
                    'container.appendChild(petDiv);'
                    '}'
                    'inject();'
                    'new MutationObserver(function(){inject()}).observe(document.documentElement,{childList:!0,subtree:!0});'
                    '})();'
                    '</script>'
                )

            if dist_inject.get("zh"):
                self.log("dist inject: zh script added", "ok")
                scripts.append(
                    '<script>try{var u=window.__hermesUpdateTranslations||{};'
                    'u.portableTitle="\\u4fbf\\u643a\\u7248\\u66f4\\u65b0";'
                    'u.portableBody="\\u5f53\\u524d\\u4e3a Hermes Desktop \\u79bb\\u7ebf\\u90e8\\u7f72\\u4fbf\\u643a\\u7248\\uff0c\\u5e94\\u7528\\u5185\\u81ea\\u52a8\\u66f4\\u65b0\\u4e0d\\u53ef\\u7528\\u3002";'
                    'u.portableDownload="\\u524d\\u5f80\\u4e0b\\u8f7d";'
                    'u.portableUpdateMessage="\\u5f53\\u524d\\u4e3a Hermes Desktop \\u79bb\\u7ebf\\u90e8\\u7f72\\u4fbf\\u643a\\u7248";'
                    'u.portableQuarkLink="\\u5938\\u514b\\u7f51\\u76d8";'
                    'u.portableMobileLink="\\u79fb\\u52a8\\u4e91\\u76d8";'
                    'window.__hermesUpdateTranslations=u;'
                    'var m=window.__hermesModelTranslations||{};'
                    'm.persistGlobalSession="\\u5168\\u5c40\\u4fdd\\u5b58 (\\u5426\\u5219\\u4ec5\\u5f53\\u524d\\u4f1a\\u8bdd)";'
                    'm.persistGlobal="\\u5168\\u5c40\\u4fdd\\u5b58";'
                    'window.__hermesModelTranslations=m}catch(e){}</script>'
                )
                scripts.append(
                    '<script>'
                    '(function(){try{'
                    'Object.defineProperty(navigator,"language",{get:function(){return"zh-CN"},configurable:!0});'
                    'Object.defineProperty(navigator,"languages",{get:function(){return["zh-CN","zh","en"]},configurable:!0})'
                    '}catch(e){}})();'
                    '</script>'
                )

        if "pet" in self._selected:
            bridge_file = self.copy_dir / "pet" / "copy" / "apps" / "desktop" / "electron" / "pet" / "pet-renderer-bridge.cjs"
            if bridge_file.exists():
                bridge_text = bridge_file.read_text(encoding="utf-8")
                inj_start = bridge_text.find("const INJECTED_SCRIPT = `") + len("const INJECTED_SCRIPT = `")
                inj_end = bridge_text.rfind("`")
                if inj_start > 0 and inj_end > inj_start:
                    bridge_script = bridge_text[inj_start:inj_end]
                    scripts.append("<script>\n" + bridge_script + "\n</script>")
                    self.log("dist inject: pet bridge script", "ok")

        if scripts:
            script_block = "\n".join(scripts)
            if any(self.module_map.get(mid, {}).get("dist_inject", {}).get("theme") for mid in self._selected):
                css_src = None
                for mid in self._selected:
                    candidate = self.copy_dir / mid / "copy" / "apps" / "desktop" / "src" / "petagent-theme.css"
                    if candidate.exists():
                        css_src = candidate
                        break
                if css_src:
                    css_dst = app_dir / "dist" / "petagent-theme.css"
                    shutil.copy2(str(css_src), str(css_dst))
                    self.log("dist copy: petagent-theme.css", "ok")
                    script_block = '<link rel="stylesheet" href="petagent-theme.css">\n' + script_block
            # 清理旧的 PetAgent 注入（避免重复堆积）
            import re as _re
            html = _re.sub(r'<link rel="stylesheet" href="petagent-theme\.css">\s*', '', html)
            html = _re.sub(r'<script>try\{.*?hermes-desktop-user-themes.*?\}catch\(e\)\{\}</script>\s*', '', html)
            html = _re.sub(r'<script>try\{.*?hermes-desktop-theme-v2.*?\}catch\(e\)\{\}</script>\s*', '', html)
            html = _re.sub(r'<script>\(function\(\).*?intro-hermes.*?\}\)\(\);</script>\s*', '', html)
            html = _re.sub(r'<script>try\{.*?__hermesUpdateTranslations.*?\}catch\(e\)\{\}</script>\s*', '', html)
            html = _re.sub(r'<script>\(function\(\).*?navigator\.language.*?\}\)\(\);</script>\s*', '', html)
            html = _re.sub(r'<script>\s*\n\s*\(function installPetRendererBridge.*?</script>\s*', '', html, flags=_re.DOTALL)
            html = html.replace("</head>", script_block + "\n</head>")
            index_html.write_text(html, encoding="utf-8")
            self.log("dist inject: index.html", "ok")

        # 中文语言包：直接修改编译后的 JS bundle 里的 i18n 数据
        if any(self.module_map.get(mid, {}).get("dist_inject", {}).get("zh") for mid in self._selected):
            self._patch_i18n_bundle(app_dir)

        if any(self.module_map.get(mid, {}).get("dist_inject", {}).get("theme") for mid in self._selected):
            css_dir = app_dir / "dist" / "assets"
            for css_file in css_dir.glob("index-*.css"):
                css = css_file.read_text(encoding="utf-8")
                if "@import" not in css[:500]:
                    css = "@import '../petagent-theme.css';\n" + css
                    css_file.write_text(css, encoding="utf-8")
                    self.log(f"dist inject: {css_file.name}", "ok")

            css_src = None
            for mid in self._selected:
                candidate = self.copy_dir / mid / "copy" / "apps" / "desktop" / "src" / "petagent-theme.css"
                if candidate.exists():
                    css_src = candidate
                    break
            if css_src:
                css_dst = app_dir / "dist" / "petagent-theme.css"
                if not css_dst.exists():
                    shutil.copy2(str(css_src), str(css_dst))
                    self.log("dist copy: petagent-theme.css", "ok")

        dist_built = app_dir / "dist-built"
        dist_dir = app_dir / "dist"
        if dist_built.exists():
            for f in dist_built.iterdir():
                if f.is_file():
                    dst = dist_dir / f.name
                    if not dst.exists():
                        shutil.copy2(str(f), str(dst))
                        self.log("dist copy: " + f.name, "ok")

        pet_assets = app_dir / "public" / "pet-assets"
        if pet_assets.exists():
            dst_pa = dist_dir / "pet-assets"
            if not dst_pa.exists():
                shutil.copytree(str(pet_assets), str(dst_pa))
                self.log("dist copy: pet-assets/", "ok")

        # pet.html is a hand-written source file (not a build output), stored in public/
        pet_html_src = app_dir / "public" / "pet.html"
        if pet_html_src.exists():
            pet_html_dst = dist_dir / "pet.html"
            if not pet_html_dst.exists():
                shutil.copy2(str(pet_html_src), str(pet_html_dst))
                self.log("dist copy: pet.html (from public/)", "ok")

        # 品牌标识 logo：从 public/ 复制到 dist/，供欢迎页 intro 脚本使用
        logo_src = app_dir / "public" / "pet-agent-logo.png"
        logo_dst = dist_dir / "pet-agent-logo.png"
        if logo_src.exists() and not logo_dst.exists():
            shutil.copy2(str(logo_src), str(logo_dst))
            self.log("dist copy: pet-agent-logo.png", "ok")