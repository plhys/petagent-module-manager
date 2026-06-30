"""卸载器正则匹配测试"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from uninstall import remove_hook_blocks, remove_css_hook_blocks


# ── JS/TS 钩子移除测试 ──

def test_remove_hook_lf():
    """Unix LF 换行符"""
    content = "original code\n\n// ═══ PetAgent:pet ═══\n// hook code\n// ═══ End PetAgent:pet ═══\n"
    result = remove_hook_blocks(content)
    assert "PetAgent" not in result
    assert result.strip() == "original code"


def test_remove_hook_crlf():
    """Windows CRLF 换行符"""
    content = "original code\r\n\r\n// ═══ PetAgent:pet ═══\r\n// hook code\r\n// ═══ End PetAgent:pet ═══\r\n"
    result = remove_hook_blocks(content)
    assert "PetAgent" not in result
    assert result.strip() == "original code"


def test_remove_hook_no_leading_newline():
    """hook 紧跟前文（无多余空行的情况）"""
    content = "original code\n// ═══ PetAgent:pet ═══\n// hook code\n// ═══ End PetAgent:pet ═══\n"
    result = remove_hook_blocks(content)
    assert "PetAgent" not in result
    assert result.strip() == "original code"


def test_remove_hook_no_trailing_blank_line():
    """卸载后不留空行"""
    content = "line1\nline2\n\n// ═══ PetAgent:pet ═══\n// hook\n// ═══ End PetAgent:pet ═══\n\n"
    result = remove_hook_blocks(content)
    # 不应该残留空行
    assert "PetAgent" not in result
    assert not result.endswith("\n\n\n")
    assert result.strip() == "line1\nline2"


def test_remove_hook_multiple_blocks():
    """多个 hook 块全部移除"""
    content = (
        "code start\n"
        "// ═══ PetAgent:pet ═══\n// pet hook\n// ═══ End PetAgent:pet ═══\n"
        "middle code\n"
        "// ═══ PetAgent:theme ═══\n// theme hook\n// ═══ End PetAgent:theme ═══\n"
        "code end\n"
    )
    result = remove_hook_blocks(content)
    assert "PetAgent" not in result
    assert "code start" in result
    assert "middle code" in result
    assert "code end" in result


def test_remove_hook_mixed_line_endings():
    """混合 CRLF 和 LF"""
    content = "original\r\n// ═══ PetAgent:pet ═══\n// hook\n// ═══ End PetAgent:pet ═══\r\nmore\n"
    result = remove_hook_blocks(content)
    assert "PetAgent" not in result
    assert "original" in result
    assert "more" in result


def test_no_hook_present():
    """没有 hook 的文件保持不变"""
    content = "just some code\nnothing to see here\n"
    result = remove_hook_blocks(content)
    assert result == content


# ── CSS 钩子移除测试 ──

def test_remove_css_hook():
    """CSS 注释风格钩子"""
    content = ".btn { color: red; }\n/* ═══ PetAgent:theme ═══ */\n/* css hook */\n/* ═══ End PetAgent:theme ═══ */\n"
    result = remove_css_hook_blocks(content)
    assert "PetAgent" not in result
    assert ".btn" in result


def test_remove_css_hook_crlf():
    """CSS 钩子 CRLF"""
    content = ".btn { color: red; }\r\n/* ═══ PetAgent:theme ═══ */\r\n/* css hook */\r\n/* ═══ End PetAgent:theme ═══ */\r\n"
    result = remove_css_hook_blocks(content)
    assert "PetAgent" not in result
    assert ".btn" in result


# ── 边界情况测试 ──

def test_empty_content():
    """空内容"""
    assert remove_hook_blocks("") == ""
    assert remove_css_hook_blocks("") == ""


def test_content_with_only_marker_text():
    """内容含 PetAgent 字样但不是 hook 标记"""
    content = "// This mentions PetAgent but is not a hook marker\n"
    result = remove_hook_blocks(content)
    assert result == content  # 不应被误删


def test_marker_with_special_chars_in_module_id():
    """模块 ID 含特殊字符"""
    content = "// ═══ PetAgent:my-module_v2 ═══\n// hook\n// ═══ End PetAgent:my-module_v2 ═══\n"
    result = remove_hook_blocks(content)
    assert "PetAgent" not in result