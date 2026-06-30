# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for PetAgent 安装器"""

from pathlib import Path

SRC = Path(__file__).resolve().parent / "src"

added_files = []
added_files.append((str(SRC / "manifest.yaml"), "."))
added_files.append((str(SRC / "hooks.yaml"), "."))
added_files.append((str(SRC / "panel.html"), "."))
added_files.append((str(SRC / "panel.css"), "."))
added_files.append((str(SRC / "panel.js"), "."))

modules_dir = SRC / "modules"
for item in modules_dir.rglob("*"):
    if item.is_file():
        rel = item.relative_to(modules_dir)
        dest = f"modules/{rel.parent}"
        added_files.append((str(item), dest))

a = Analysis(
    [str(SRC / "install.py")],
    pathex=[str(SRC)],
    binaries=[],
    datas=added_files,
    hiddenimports=["yaml", "installer", "scanner", "server"],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "tkinter.ttk", "tkinter.messagebox", "matplotlib", "numpy", "pandas"],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="PetAgent-Installer",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(SRC / "electron-app" / "icon.ico") if (SRC / "electron-app" / "icon.ico").exists() else None,
)