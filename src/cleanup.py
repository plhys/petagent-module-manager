#!/usr/bin/env python3
"""PetAgent 一键清理工具 — 卸载旧版模块 + 删除残留文件

用法：
    python cleanup.py --target D:\hermes-agent
    python cleanup.py                     # 清理当前目录
"""

import re
import sys
import shutil
from pathlib import Path


def _root():
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


PACK = _root()

# hooks.yaml 映射表（硬编码，不依赖外部文件也能跑）
HOOKS_MAP = {
    "main.cjs.hook":           "apps/desktop/electron/main.cjs",
    "preload.cjs.hook":        "apps/desktop/electron/preload.cjs",
    "bootstrap-runner.hook":   "apps/desktop/electron/bootstrap-runner.cjs",
    "styles.css.hook":         "apps/desktop/src/styles.css",
    "presets.ts.hook":         "apps/desktop/src/themes/presets.ts",
    "intro.tsx.hook":          "apps/desktop/src/components/chat/intro.tsx",
    "zh.ts.hook":              "apps/desktop/src/i18n/zh.ts",
    "command-center.tsx.hook": "apps/desktop/src/app/command-center/index.tsx",
    "right-sidebar.tsx.hook":  "apps/desktop/src/app/right-sidebar/index.tsx",
}

# 旧版（错误路径）残留文件列表
OLD_FILES = [
    "electron/pet/",
    "src/pet/",
    "src/pet-bubble/",
    "public/pet-assets/",
    "public/pet-agent-logo.png",
    "public/pet-agent-logo.jpg",
    "public/logo.png",
    "dist-built/",
    "custom-theme.css",
    "petagent-theme.css",
    "provider-translations.ts",
    "skills/translations.ts",
]

# 新版（正确路径）文件列表
NEW_FILES = [
    "apps/desktop/electron/pet/",
    "apps/desktop/src/pet/",
    "apps/desktop/src/pet-bubble/",
    "apps/desktop/public/pet-assets/",
    "apps/desktop/public/pet-agent-logo.png",
    "apps/desktop/public/pet-agent-logo.jpg",
    "apps/desktop/public/logo.png",
    "apps/desktop/dist-built/",
    "apps/desktop/src/custom-theme.css",
    "apps/desktop/src/petagent-theme.css",
    "apps/desktop/src/provider-translations.ts",
    "apps/desktop/src/skills/translations.ts",
    "plugins/image-gen/",
    "plugins/image_gen/",
]


def remove_hook_blocks(content: str) -> str:
    """移除 JS/TS 钩子标记"""
    pattern = r'\s*// ═══ PetAgent:.+? ═══\r?\n.*?// ═══ End PetAgent:.+? ═══\s*'
    return re.sub(pattern, '', content, flags=re.DOTALL)


def remove_css_hook_blocks(content: str) -> str:
    """移除 CSS 钩子标记"""
    pattern = r'\s*/\* ═══ PetAgent:.+? ═══ \*/\r?\n.*?/\* ═══ End PetAgent:.+? ═══ \*/\s*'
    return re.sub(pattern, '', content, flags=re.DOTALL)


def delete_path(target: Path, rel: str):
    """删除目标路径（文件或目录）"""
    p = target / rel
    if not p.exists():
        return False
    try:
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        else:
            p.unlink()
        return True
    except Exception as e:
        print(f"  [ERR] 删除失败: {rel} — {e}")
        return False


def main():
    target = Path.cwd()
    args = sys.argv[1:]
    if '--target' in args:
        idx = args.index('--target')
        if idx + 1 < len(args):
            target = Path(args[idx + 1])

    if not (target / 'pyproject.toml').exists():
        print(f"错误: {target} 不是 Hermes Agent 根目录")
        sys.exit(1)

    print("PetAgent 清理工具")
    print(f"目标: {target}")
    print()

    # 1. 移除钩子代码
    print("[1/3] 移除钩子注入代码...")
    removed_hooks = 0
    for hook_name, target_rel in HOOKS_MAP.items():
        target_file = target / target_rel
        if not target_file.exists():
            continue
        content = target_file.read_text(encoding="utf-8")
        if "PetAgent:" not in content:
            continue
        new_content = remove_css_hook_blocks(content) if target_rel.endswith(".css") else remove_hook_blocks(content)
        if new_content != content:
            target_file.write_text(new_content, encoding="utf-8")
            print(f"  [OK] 清理钩子: {target_rel}")
            removed_hooks += 1
    if removed_hooks == 0:
        print("  (未发现钩子)")

    # 2. 删除旧版残留文件（错误路径）
    print(f"\n[2/3] 删除旧版残留文件（错误路径）...")
    removed_old = 0
    for rel in OLD_FILES:
        if delete_path(target, rel):
            print(f"  [OK] 删除: {rel}")
            removed_old += 1
    if removed_old == 0:
        print("  (未发现旧版残留)")

    # 3. 删除新版文件（如果之前装过）
    print(f"\n[3/3] 删除新版文件...")
    removed_new = 0
    for rel in NEW_FILES:
        if delete_path(target, rel):
            print(f"  [OK] 删除: {rel}")
            removed_new += 1
    if removed_new == 0:
        print("  (未发现新版文件)")

    print(f"\n清理完成: 移除了 {removed_hooks} 个钩子, 删除了 {removed_old + removed_new} 个文件/目录")
    print("现在可以重新安装 PetAgent 了。")


if __name__ == "__main__":
    main()