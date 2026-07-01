#!/usr/bin/env python3
"""PetAgent 模块化卸载器（钩子注入版）

删除所有标记注释之间的钩子代码，恢复目标文件原样。
不会影响文件其他部分，比 diff 补丁方案安全得多。

用法：
    python uninstall.py                         # 卸载当前目录
    python uninstall.py --target /path          # 指定目标
    python uninstall.py --modules pet,theme     # 选择性卸载
    python uninstall.py --json                  # JSON Lines 输出
"""

import json
import os
import re
import sys
import shutil
import subprocess
import tempfile
import yaml
from pathlib import Path


def _root():
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


PACK = _root()
HOOKS_YAML = PACK / "hooks.yaml"
MANIFEST = PACK / "manifest.yaml"
COPY_DIR = PACK / "modules"


def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def remove_hook_blocks(content: str) -> str:
    """移除所有 ═══ PetAgent:* ═══ ... ═══ End PetAgent:* ═══ 标记之间的内容"""
    pattern = r'\s*// ═══ PetAgent:.+? ═══\r?\n.*?// ═══ End PetAgent:.+? ═══\s*'
    return re.sub(pattern, '', content, flags=re.DOTALL)


def _clean_html_injections(html: str) -> str:
    """清理源码 index.html 中所有 PetAgent 注入的 <script> 和 <link>"""
    # 删除 petagent-theme.css 引用
    html = re.sub(r'\s*<link rel="stylesheet" href="[^"]*petagent-theme\.css"[^>]*>', '', html)
    # 删除引擎脚本引用
    html = re.sub(r'\s*<script src="[^"]*petagent-adapter\.js"></script>', '', html)
    html = re.sub(r'\s*<script src="[^"]*petagent-config\.js"></script>', '', html)
    html = re.sub(r'\s*<script src="[^"]*petagent-engine\.js"></script>', '', html)
    # 删除 navigator.language 覆盖脚本
    html = re.sub(
        r'\s*<script>\(function\(\)\{try\{Object\.defineProperty\(navigator,"language".*?\}\}\)\(\);</script>',
        '', html, flags=re.DOTALL
    )
    # 删除中文翻译注入
    html = re.sub(
        r'\s*<script>try\{var u=window\.__hermesUpdateTranslations.*?\}catch\(e\)\{\}</script>',
        '', html, flags=re.DOTALL
    )
    # 删除 localStorage 主题注册
    html = re.sub(
        r'\s*<script>try\{var e=localStorage\.getItem\("hermes-desktop-user-themes-v1"\).*?\}catch\(e\)\{\}</script>',
        '', html, flags=re.DOTALL
    )
    # 删除 active theme 设置
    html = re.sub(
        r'\s*<script>try\{localStorage\.setItem\("hermes-desktop-theme-v2","petagent"\)\s*\}catch\(e\)\{\}</script>',
        '', html
    )
    # 删除欢迎页品牌标识 DOM 注入
    html = re.sub(
        r'\s*<script>\(function\(\)\{var done=!1;function inject\(\).*?\}\)\(\);</script>',
        '', html, flags=re.DOTALL
    )
    # 删除 pet renderer bridge
    html = re.sub(
        r'\s*<script>\s*\n\s*\(function installPetRendererBridge.*?</script>',
        '', html, flags=re.DOTALL
    )
    return html


def remove_css_hook_blocks(content: str) -> str:
    """移除 CSS 中的钩子标记"""
    pattern = r'\s*/\* ═══ PetAgent:.+? ═══ \*/\r?\n.*?/\* ═══ End PetAgent:.+? ═══ \*/\s*'
    return re.sub(pattern, '', content, flags=re.DOTALL)


# ── asar 工具函数 ──

def _find_asar_cli():
    """多路径查找 asar CLI"""
    candidates = []
    if getattr(sys, 'frozen', False):
        base = Path(sys._MEIPASS)
        candidates.extend([
            base / "node_modules" / ".bin" / "asar.cmd",
            base / "node_modules" / ".bin" / "asar",
        ])
    candidates.extend([
        Path(__file__).resolve().parent / "electron-app" / "node_modules" / ".bin" / "asar.cmd",
        Path(__file__).resolve().parent / "electron-app" / "node_modules" / ".bin" / "asar",
        Path(os.environ.get("APPDATA", "")) / "npm" / "asar.cmd",
        Path(os.environ.get("APPDATA", "")) / "npm" / "asar",
    ])
    for c in candidates:
        if c.exists():
            return c
    return None


def get_asar_path(target: Path):
    """平台感知的 asar 路径检测"""
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


def _restore_asar(target: Path, emit):
    """恢复 app.asar：优先使用备份，并注入 localStorage 清理脚本"""
    asar_path = get_asar_path(target)
    if not asar_path:
        return

    asar_cli = _find_asar_cli()
    if not asar_cli:
        emit("warn", "asar CLI 未找到，跳过 app.asar 清理（源码钩子已移除）")
        return

    os_env = os.environ
    node_bin = str(asar_cli.parent)
    asar_env = {**os_env, "PATH": node_bin + os.pathsep + os_env.get("PATH", "")}

    # 如果有备份，先恢复备份
    asar_backup = asar_path.with_suffix(".asar.bak")
    if asar_backup.exists():
        try:
            asar_path.unlink()
        except PermissionError:
            emit("error", "app.asar 被占用，请关闭 Hermes 后重试")
            return
        asar_backup.rename(asar_path)
        emit("ok", "已从备份恢复 app.asar")

        unpacked_dir = Path(str(asar_path) + ".unpacked")
        unpacked_backup = Path(str(asar_path) + ".unpacked.bak")
        if unpacked_backup.exists():
            if unpacked_dir.exists():
                shutil.rmtree(str(unpacked_dir), ignore_errors=True)
            unpacked_backup.rename(unpacked_dir)
            emit("ok", "已恢复 app.asar.unpacked")

    # 无论是否有备份，都需要注入 localStorage 清理脚本
    # （因为 theme 数据在 localStorage 中持久化，仅恢复 asar 无法清除）
    app_dir = asar_path.parent / "app"
    if app_dir.exists():
        shutil.rmtree(str(app_dir), ignore_errors=True)
    app_dir.mkdir(parents=True, exist_ok=True)

    emit("info", "正在解包 app.asar…")
    r = subprocess.run(
        [str(asar_cli), "extract", str(asar_path), str(app_dir)],
        capture_output=True, text=True, env=asar_env,
        creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
    )
    if r.returncode != 0:
        emit("error", f"asar 解包失败: {r.stderr}")
        shutil.rmtree(str(app_dir), ignore_errors=True)
        return

    index_html = app_dir / "dist" / "index.html"
    if not index_html.exists():
        shutil.rmtree(str(app_dir), ignore_errors=True)
        emit("warn", "dist/index.html 不存在，跳过 asar 清理")
        return

    html = index_html.read_text(encoding="utf-8")

    # 清理 PetAgent 注入的脚本和资源引用
    html = re.sub(
        r'\s*<script src="petagent-(?:adapter|config|engine)\.js"></script>',
        '', html
    )
    html = re.sub(
        r'\s*<script>try\{.*?hermes-desktop-user-themes-v1.*?\}catch\(e\)\{\}</script>',
        '', html, flags=re.DOTALL
    )
    html = re.sub(
        r'\s*<script>try\{.*?__hermesUpdateTranslations.*?\}catch\(e\)\{\}</script>',
        '', html, flags=re.DOTALL
    )
    html = re.sub(
        r'\s*<script>\(function\(\)\{try\{Object\.defineProperty\(navigator,"language".*?\}\}\)\(\);</script>',
        '', html, flags=re.DOTALL
    )
    html = re.sub(
        r'\s*<script>\s*\n\s*// ═══ PetAgent:pet.*?</script>',
        '', html, flags=re.DOTALL
    )
    html = re.sub(
        r'\s*<script>\s*\n\s*\(function\(\)\{.*?hermesPetBridge.*?\}\}\)\(\);</script>',
        '', html, flags=re.DOTALL
    )
    html = re.sub(
        r'\s*<link rel="stylesheet" href="petagent-theme\.css">',
        '', html
    )
    # 清理默认主题设置脚本
    html = re.sub(
        r'\s*<script>try\{if\(!localStorage\.getItem\("hermes-desktop-theme-v2"\)\).*?\}catch\(e\)\{\}</script>',
        '', html, flags=re.DOTALL
    )
    # 清理欢迎页品牌标识 DOM 注入脚本
    html = re.sub(
        r'\s*<script>\(function\(\)\{var done=!1;function inject\(\).*?}\)\(\);</script>',
        '', html, flags=re.DOTALL
    )

    # 注入一次性 localStorage 清理脚本（移除 petagent 主题 + 默认主题设置）
    cleanup_script = (
        '<script>(function(){try{'
        'var k="hermes-desktop-user-themes-v1";'
        'var v=localStorage.getItem(k);'
        'if(v){var t=JSON.parse(v);'
        'if(t.petagent){delete t.petagent;localStorage.setItem(k,JSON.stringify(t))}}'
        'var d="hermes-desktop-theme-v2";'
        'if(localStorage.getItem(d)==="petagent"){localStorage.removeItem(d)}'
        '}catch(e){}})();</script>'
    )
    html = html.replace("</head>", cleanup_script + "\n</head>")
    index_html.write_text(html, encoding="utf-8")
    emit("ok", "已清理 dist/index.html 并注入 localStorage 清理脚本")

    # 清理 CSS 中的 @import
    css_dir = app_dir / "dist" / "assets"
    if css_dir.exists():
        for css_file in css_dir.glob("index-*.css"):
            css = css_file.read_text(encoding="utf-8")
            css = re.sub(r"@import\s+['\"]\.\./petagent-theme\.css['\"];\s*", "", css)
            css_file.write_text(css, encoding="utf-8")
            emit("ok", f"已清理 {css_file.name}")

    # 删除注入的静态文件
    injected_files = [
        "dist/petagent-theme.css",
        "dist/petagent-adapter.js",
        "dist/petagent-config.js",
        "dist/petagent-engine.js",
        "dist/pet.html",
        "dist/pet-bubble.js",
        "dist/pet-bubble.html",
        "dist/pet-agent-logo.png",
    ]
    for f in injected_files:
        fp = app_dir / f
        if fp.exists():
            fp.unlink()
            emit("ok", f"删除: {f}")

    pet_assets = app_dir / "dist" / "pet-assets"
    if pet_assets.exists():
        shutil.rmtree(str(pet_assets), ignore_errors=True)
        emit("ok", "删除: dist/pet-assets/")

    # 重新打包
    emit("info", "重新打包 app.asar…")
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
            emit("error", "app.asar 被占用，请关闭 Hermes 后重试")
            shutil.rmtree(str(app_dir), ignore_errors=True)
            return
        asar_new.rename(asar_path)

        unpacked_dir = Path(str(asar_path) + ".unpacked")
        if asar_new_unpacked.exists():
            if unpacked_dir.exists():
                shutil.rmtree(str(unpacked_dir), ignore_errors=True)
            asar_new_unpacked.rename(unpacked_dir)

        shutil.rmtree(str(app_dir), ignore_errors=True)
        emit("ok", "app.asar 已清理并重新打包")
    else:
        emit("error", f"asar 打包失败: {r.stderr}")
        shutil.rmtree(str(app_dir), ignore_errors=True)


def main():
    target = Path.cwd()
    module_filter = None
    json_output = False
    args = sys.argv[1:]

    if '--target' in args:
        idx = args.index('--target')
        if idx + 1 < len(args):
            target = Path(args[idx + 1])
    if '--modules' in args:
        idx = args.index('--modules')
        if idx + 1 < len(args):
            module_filter = set(args[idx + 1].split(','))
    if '--json' in args:
        json_output = True

    def emit(level, msg):
        entry = {"level": level, "msg": str(msg)}
        if json_output:
            try:
                print(json.dumps(entry, ensure_ascii=False), flush=True)
            except UnicodeEncodeError:
                print(json.dumps(entry, ensure_ascii=True), flush=True)
        else:
            icon = {"ok": "[OK]", "warn": "[WARN]", "error": "[ERR]", "info": ""}.get(level, "")
            try:
                if level == "info":
                    print(msg)
                else:
                    print(f"  {icon} {msg}")
            except UnicodeEncodeError:
                # Fallback: strip non-ASCII characters for GBK consoles
                safe = msg.encode("ascii", errors="replace").decode("ascii")
                print(f"  {icon} {safe}")

    if not (target / 'pyproject.toml').exists():
        emit("error", f"错误: {target} 不是 Hermes Agent 根目录")
        sys.exit(1)

    hooks_map = _load_yaml(HOOKS_YAML)
    manifest = _load_yaml(MANIFEST)

    # 按模块建立 hook → 模块 的反向映射
    hook_to_modules = {}
    for mdef in manifest.get("modules", []):
        for h in mdef.get("hooks", []):
            hook_to_modules.setdefault(h, set()).add(mdef["id"])

    emit("info", "PetAgent 卸载器 v2 — 钩子注入模式")
    emit("info", f"目标: {target}")
    if module_filter:
        emit("info", f"模块: {', '.join(sorted(module_filter))}")

    # 1. 移除钩子
    removed_hooks = 0
    for hook_name, target_rel in hooks_map.items():
        if module_filter:
            hook_mods = hook_to_modules.get(hook_name, set())
            if not hook_mods.intersection(module_filter):
                continue

        target_file = target / target_rel
        if not target_file.exists():
            continue

        content = target_file.read_text(encoding="utf-8")
        if "PetAgent:" not in content:
            continue

        new_content = remove_css_hook_blocks(content) if target_rel.endswith(".css") else remove_hook_blocks(content)

        if new_content != content:
            target_file.write_text(new_content, encoding="utf-8")
            emit("ok", f"移除钩子: {target_rel}")
            removed_hooks += 1

    # 2. 删除拷贝的文件
    removed_files = 0
    for module_def in manifest.get("modules", []):
        if module_filter and module_def["id"] not in module_filter:
            continue

        for item in module_def.get("copy", []):
            src = COPY_DIR / module_def["id"] / "copy" / item
            dst = target / item
            if not src.exists() or not dst.exists():
                continue
            try:
                if dst.is_dir():
                    shutil.rmtree(dst, ignore_errors=True)
                else:
                    dst.unlink()
                emit("ok", f"删除: {item}")
                removed_files += 1
            except Exception as e:
                emit("error", f"删除失败: {item} — {e}")

        for sub in module_def.get("submodules", []):
            for item in sub.get("copy", []):
                src = COPY_DIR / module_def["id"] / "copy" / item
                dst = target / item
                if not src.exists() or not dst.exists():
                    continue
                try:
                    if dst.is_dir():
                        shutil.rmtree(dst, ignore_errors=True)
                    else:
                        dst.unlink()
                    emit("ok", f"删除: {item}")
                    removed_files += 1
                except Exception as e:
                    emit("error", f"删除失败: {item} — {e}")

    emit("info", f"移除了 {removed_hooks} 个钩子，删除了 {removed_files} 个文件")

    # 3. 清理源码 index.html（开发模式入口）
    source_html = target / "apps" / "desktop" / "index.html"
    if source_html.exists():
        html = source_html.read_text(encoding="utf-8")
        if "PetAgent" in html or "petagent" in html or "hermes-desktop-user-themes-v1" in html:
            html = _clean_html_injections(html)
            source_html.write_text(html, encoding="utf-8")
            emit("ok", "已清理源码 index.html")

    # 4. 恢复 app.asar
    _restore_asar(target, emit)

    # 5. 清理提取的 app/ 目录（如果存在）
    app_dir = target / "apps" / "desktop" / "release" / "win-unpacked" / "resources" / "app"
    if app_dir.exists():
        shutil.rmtree(str(app_dir), ignore_errors=True)
        emit("ok", "已删除 app/ 覆盖目录")

    # 6. 删除版本标记文件
    version_marker = target / ".petagent-version"
    if version_marker.exists():
        try:
            version_marker.unlink()
            emit("ok", "删除版本标记")
        except Exception as e:
            emit("warn", f"版本标记删除失败: {e}")

    emit("info", "卸载完成！")


if __name__ == "__main__":
    main()
