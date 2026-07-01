#!/usr/bin/env python3
"""PetAgent 模块化安装器 — CLI 入口

用法：
    python install.py                       # 自动发现 Hermes 并安装
    python install.py -i pet theme zh       # 命令行安装指定模块
    python install.py --target /path        # 指定目标目录
    python install.py --no-asar             # 仅源码钩子，不动 asar
"""

import argparse
import sys
import yaml
from pathlib import Path

from installer import (
    HookInstaller,
    find_hermes_installation,
    kill_hermes_process,
    check_hermes_version,
    get_asar_path,
)


def _root():
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


PACK = _root()


def _load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _safe_print(s):
    """Print fallback: strip unicode if console can't handle it."""
    try:
        print(s)
    except UnicodeEncodeError:
        safe = s.encode("ascii", errors="replace").decode("ascii")
        print(safe)


def main():
    p = argparse.ArgumentParser(
        description="PetAgent — Hermes Agent 一键补丁工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python install.py                          # 自动发现 Hermes，安装推荐模块
  python install.py -i pet theme zh          # 指定模块
  python install.py --target "D:\\hermes"    # 指定目标
  python install.py --no-asar                # 仅源码钩子
        """
    )
    p.add_argument("--target", "-t", default=None, help="Hermes 安装目录（不指定则自动发现）")
    p.add_argument("--install", "-i", nargs="*", help="要安装的模块（默认推荐配置）")
    p.add_argument("--list", "-l", action="store_true", help="列出所有可用模块")
    p.add_argument("--json", action="store_true", help="JSON Lines 输出")
    p.add_argument("--no-asar", action="store_true", help="跳过 asar 解包重打包（仅源码钩子）")
    p.add_argument("--no-kill", action="store_true", help="不自动关闭 Hermes 进程")
    args = p.parse_args()

    # 加载配置
    hooks_map = _load_yaml(PACK / "hooks.yaml")
    manifest = _load_yaml(PACK / "manifest.yaml")

    if args.list:
        for m in manifest.get("modules", []):
            name = m.get("name", m["id"])
            disabled = " [暂不可用]" if m.get("disabled") else ""
            _safe_print(f"  {m['id']:20s} {name}{disabled}")
        return

    # 确定目标目录
    if args.target:
        target = Path(args.target)
    else:
        target, desc = find_hermes_installation()
        if target is None:
            _safe_print("[ERR] 未找到 Hermes 安装目录。请用 --target 指定路径。")
            _safe_print("   常见路径: %LOCALAPPDATA%\\hermes\\hermes-agent")
            sys.exit(1)
        _safe_print(f"[..] 自动发现 Hermes: {target}")
        _safe_print(f"   ({desc})")

    if not target.exists():
        _safe_print(f"[ERR] 目标目录不存在: {target}")
        sys.exit(1)

    # 版本检查
    stamp, warnings = check_hermes_version(target)
    if stamp:
        commit = stamp.get("commit", "?")[:12]
        branch = stamp.get("branch", "?")
        _safe_print(f"[..] Hermes 版本: {commit} ({branch})")
    for w in warnings:
        _safe_print(f"[WARN] {w}")

    # 自动关闭 Hermes
    if not args.no_kill:
        asar_path = get_asar_path(target)
        if asar_path and asar_path.exists():
            if kill_hermes_process():
                _safe_print("[OK] 已关闭 Hermes 进程")
            else:
                _safe_print("[WARN] Hermes 可能正在运行，asar 注入可能失败。请手动关闭后重试")

    # 确定模块
    if args.install is not None:
        ids = args.install if args.install else ["pet", "theme", "zh", "image-gen"]
    else:
        # 默认推荐配置
        ids = ["pet", "theme", "zh", "image-gen"]

    # 安装
    installer = HookInstaller(
        target=target,
        hooks_map=hooks_map,
        manifest=manifest,
        copy_dir=PACK / "modules",
        backup_dir=PACK / "backup",
        json_output=args.json,
    )

    if args.no_asar:
        # 临时替换 _handle_asar 为空操作
        installer._handle_asar = lambda: None

    _safe_print(f"[..] 安装模块: {', '.join(ids)}")
    r = installer.install(ids)

    if r["success"]:
        _safe_print("[OK] 安装完成！重新启动 Hermes 即可看到效果。")
    else:
        _safe_print("[ERR] 安装过程中出现错误，请检查日志。")
        sys.exit(1)


if __name__ == "__main__":
    main()
