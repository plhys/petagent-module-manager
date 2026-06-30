"""Hermes Agent 安装目录扫描（使用公共自动发现）"""

import os
from pathlib import Path

# 优先使用 installer.py 里的 find_hermes_installation
try:
    from installer import find_hermes_installation
    _use_installer = True
except ImportError:
    _use_installer = False


def scan_hermes_targets():
    """扫描可能的 Hermes Agent 安装目录，返回路径列表"""
    found = []

    # 使用 installer.py 的自动发现
    if _use_installer:
        try:
            path, desc = find_hermes_installation()
            if path:
                found.append(str(path))
        except Exception:
            pass

    # 补充旧版扫描逻辑
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    home = Path.home()
    fallback = [
        Path(local_app_data) / "hermes" / "hermes-agent" if local_app_data else None,
        Path(local_app_data) / "hermes" if local_app_data else None,
        home / "hermes-agent",
        home / "hermes" / "hermes-agent",
        Path("D:\\hermes-agent"),
        Path("D:\\hermes"),
    ]

    for p in fallback:
        if not p or not p.exists():
            continue
        s = str(p)
        if s not in found and (p / "pyproject.toml").exists():
            found.append(s)
        elif s not in found:
            sub = p / "hermes-agent"
            if sub.exists() and (sub / "pyproject.toml").exists():
                found.append(str(sub))

    return found