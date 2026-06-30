"""HookInstaller 单元测试"""
import json
import sys
import tempfile
from pathlib import Path

# 添加 src 到路径
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from installer import HookInstaller


# ── 测试夹具 ──
def make_manifest(modules=None):
    return {"modules": modules or []}


def make_hooks_map():
    return {
        "main.cjs.hook": "electron/main.cjs",
        "styles.css.hook": "src/styles.css",
    }


def make_installer(tmp_path, target=None, manifest=None, hooks_map=None):
    target = Path(target) if target else Path(tmp_path)
    return HookInstaller(
        target=target,
        hooks_map=hooks_map or make_hooks_map(),
        manifest=manifest or make_manifest(),
        copy_dir=Path(tmp_path) / "modules",
        backup_dir=Path(tmp_path) / "backup",
        json_output=False,
    )


# ── 依赖解析测试 ──

def test_resolve_simple():
    """简单模块：无依赖，直接解析"""
    m = make_manifest([{"id": "theme", "name": "主题"}])
    installer = make_installer("tmp", manifest=m)
    result = installer.resolve_deps(["theme"])
    assert result == ["theme"]


def test_resolve_with_dependency():
    """pet 依赖 theme，解析后 theme 在前"""
    m = make_manifest([
        {"id": "pet", "name": "宠物", "requires": ["theme"]},
        {"id": "theme", "name": "主题"},
    ])
    installer = make_installer("tmp", manifest=m)
    result = installer.resolve_deps(["pet"])
    assert result == ["theme", "pet"]


def test_resolve_transitive():
    """A 依赖 B，B 依赖 C，应全部解析"""
    m = make_manifest([
        {"id": "a", "requires": ["b"]},
        {"id": "b", "requires": ["c"]},
        {"id": "c"},
    ])
    installer = make_installer("tmp", manifest=m)
    result = installer.resolve_deps(["a"])
    assert result == ["c", "b", "a"]


def test_resolve_multiple():
    """多个模块一起解析"""
    m = make_manifest([
        {"id": "pet", "requires": ["theme"]},
        {"id": "theme"},
        {"id": "zh"},
    ])
    installer = make_installer("tmp", manifest=m)
    result = installer.resolve_deps(["pet", "zh"])
    assert "theme" in result
    assert "pet" in result
    assert "zh" in result
    assert result.index("theme") < result.index("pet")  # theme 在 pet 之前


# ── 子模块测试 ──

def test_resolve_submodule_resolves_parent():
    """传入子模块 ID 应自动解析父模块"""
    m = make_manifest([
        {"id": "image-gen", "name": "出图插件", "submodules": [
            {"id": "image-gen-gemini", "name": "Gemini 图片生成"}
        ]},
    ])
    installer = make_installer("tmp", manifest=m)
    result = installer.resolve_deps(["image-gen-gemini"])
    assert "image-gen" in result


def test_unknown_module():
    """未知模块 ID 应被忽略，不在结果中"""
    m = make_manifest([{"id": "theme"}])
    installer = make_installer("tmp", manifest=m)
    result = installer.resolve_deps(["nonexistent"])
    assert "nonexistent" not in result


def test_disabled_module_skipped():
    """禁用模块应被跳过"""
    m = make_manifest([
        {"id": "layout", "disabled": True},
        {"id": "theme"},
    ])
    installer = make_installer("tmp", manifest=m)
    result = installer.resolve_deps(["layout", "theme"])
    assert "layout" not in result
    assert "theme" in result


# ── 未知模块错误测试 ──

def test_install_unknown_module_fails():
    """安装未知模块应返回 False"""
    m = make_manifest([])
    installer = make_installer("tmp", manifest=m)
    ok = installer.install_module("nonexistent")
    assert ok is False


def test_install_module_returns_true():
    """安装已知模块（无 hook 无 copy）应返回 True"""
    m = make_manifest([{"id": "theme"}])
    installer = make_installer("tmp", manifest=m)
    installer._selected = set()
    ok = installer.install_module("theme")
    assert ok is True


# ── 安装流程测试 ──

def test_install_produces_log():
    """安装应产生日志"""
    m = make_manifest([{"id": "theme"}])
    installer = make_installer("tmp", manifest=m)
    result = installer.install(["theme"])
    assert "success" in result
    assert "log" in result
    assert len(result["log"]) > 0


def test_install_empty_list():
    """安装空列表也应成功"""
    installer = make_installer("tmp")
    result = installer.install([])
    assert result["success"] is True


# ── 标记检测测试 ──

def test_marker_detection_prevents_reinstall(tmp_path):
    """已安装的文件不应重复安装"""
    m = make_manifest([{"id": "pet", "hooks": ["main.cjs.hook"]}])
    hooks_map = {"main.cjs.hook": "main.cjs"}

    # 创建目标文件（已有标记）
    target_dir = Path(tmp_path) / "target"
    target_dir.mkdir()
    electron_dir = target_dir / "electron"
    electron_dir.mkdir(parents=True)
    target_file = electron_dir / "main.cjs"
    target_file.write_text("// ═══ PetAgent:pet ═══\n// existing hook\n// ═══ End PetAgent:pet ═══\n", encoding="utf-8")

    # 创建 hook 文件
    modules_dir = Path(tmp_path) / "modules" / "pet" / "hooks"
    modules_dir.mkdir(parents=True)
    hook_file = modules_dir / "main.cjs.hook"
    hook_file.write_text("// ═══ PetAgent:pet ═══\n// hook content\n// ═══ End PetAgent:pet ═══\n", encoding="utf-8")

    installer = HookInstaller(
        target=target_dir,
        hooks_map=hooks_map,
        manifest=m,
        copy_dir=Path(tmp_path) / "modules",
        backup_dir=Path(tmp_path) / "backup",
        json_output=False,
    )

    result = installer.install(["pet"])
    # 应该成功，但 hook 被跳过（已安装）
    assert result["success"] is True
    # 检查日志中有 skip
    levels = [e["level"] for e in result["log"]]
    assert "skip" in levels