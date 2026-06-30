# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for PetAgent 卸载器"""

from pathlib import Path

SRC = Path(__file__).resolve().parent / "src"

added_files = []
added_files.append((str(SRC / "manifest.yaml"), "."))
added_files.append((str(SRC / "hooks.yaml"), "."))

modules_dir = SRC / "modules"
for item in modules_dir.rglob("*"):
    if item.is_file():
        rel = item.relative_to(modules_dir)
        dest = f"modules/{rel.parent}"
        added_files.append((str(item), dest))

a = Analysis(
    [str(SRC / "uninstall.py")],
    pathex=[str(SRC)],
    binaries=[],
    datas=added_files,
    hiddenimports=["yaml"],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "tkinter.ttk", "tkinter.messagebox"],
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
    name="PetAgent-Uninstaller",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(SRC / "electron-app" / "icon.ico") if (SRC / "electron-app" / "icon.ico").exists() else None,
)