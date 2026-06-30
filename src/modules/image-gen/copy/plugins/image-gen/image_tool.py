"""
图片生成工具实现

提供两个工具：
- generate_image: 文生图 / 图生图
- modify_image: 迭代改图
"""

import os
import re
import asyncio
from typing import Optional, List, Dict, Any

# 延迟导入，避免循环依赖
_gemini_session = None
_doubao_session = None
_sessions = {}  # session_id -> session 对象


def _get_image_dir() -> str:
    """获取图片存储目录，与 gen_gemini.py 保持一致"""
    hermes_home = os.getenv("HERMES_HOME", os.path.expanduser("~/.hermes"))
    image_dir = os.path.join(hermes_home, "cache", "images")
    os.makedirs(image_dir, exist_ok=True)
    return image_dir


def _get_fleet_url() -> str:
    """获取 Fleet 网关地址"""
    return os.getenv("FLEET_URL", "http://10.10.100.10:8222")


def _extract_url_from_markdown(md_text: str) -> str:
    """从 Markdown 图片格式中提取 URL"""
    match = re.match(r'!\[.*?\]\((.*?)\)', md_text)
    return match.group(1) if match else md_text


def _get_local_path_from_session(session, model: str) -> str:
    """从 session 对象获取本地文件路径"""
    if hasattr(session, '_history') and session._history:
        fname = session._history[-1].get('filename', '')
        if fname:
            return os.path.join(_get_image_dir(), fname)
    if hasattr(session, '_last_url') and session._last_url:
        if os.path.isabs(session._last_url) and os.path.exists(session._last_url):
            return session._last_url
        fname = os.path.basename(session._last_url)
        if fname:
            local_path = os.path.join(_get_image_dir(), fname)
            if os.path.exists(local_path):
                return local_path
    return ''


async def generate_image(
    prompt: str,
    model: str = "gemini",
    aspect_ratio: str = "16:9",
    image_size: str = "2K",
    ref_urls: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    生成图片（文生图 / 图生图）

    Args:
        prompt: 图片描述（直接传用户原话，不要改写）
        model: 模型选择，"gemini" 或 "doubao"
        aspect_ratio: 宽高比，仅 Gemini 支持，可选 "1:1", "4:3", "16:9", "9:16", "3:4"
        image_size: 图片尺寸，可选 "1K", "2K", "4K"
        ref_urls: 参考图 URL 列表（图生图），必须是公网可访问的 URL

    Returns:
        {
            "success": True,
            "url": "http://...",      # 图片访问 URL
            "path": "/path/to/...",    # 本地文件路径
            "model": "gemini",         # 使用的模型
            "session_id": "xxx"        # 会话 ID，用于后续 modify_image
        }
        或
        {
            "success": False,
            "error": "错误描述"
        }
    """

    # 参数校验
    if not prompt or not prompt.strip():
        return {"success": False, "error": "prompt 不能为空"}

    if model not in ["gemini", "doubao"]:
        return {"success": False, "error": f"不支持的模型: {model}，可选 gemini 或 doubao"}

    if model == "doubao" and aspect_ratio != "16:9":
        aspect_ratio = "16:9"

    try:
        os.environ["FLEET_URL"] = _get_fleet_url()
        os.environ["IMAGE_DIR"] = _get_image_dir()

        if model == "gemini":
            from gen_gemini import ImageSession
            session = ImageSession()
            result = await session.generate(
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                image_size=image_size,
                ref_urls=ref_urls
            )
        else:
            from gen_doubao import ImageSession
            session = ImageSession()
            result = await session.generate(
                prompt=prompt,
                image_size=image_size,
                ref_urls=ref_urls
            )

        session_id = str(id(session))
        _sessions[session_id] = session
        cleanup_old_sessions(10)

        actual_url = _extract_url_from_markdown(result)
        local_path = _get_local_path_from_session(session, model)

        return {
            "success": True,
            "url": actual_url,
            "path": local_path,
            "model": model,
            "session_id": session_id
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"生成失败: {str(e)}",
            "model": model
        }


async def modify_image(
    prompt: str,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    迭代改图（基于上一张图继续修改）

    Args:
        prompt: 修改描述（直接传用户原话，不要改写）
        session_id: 会话 ID（来自 generate_image 返回值）
                   如果不提供，使用最近一次的会话

    Returns:
        {
            "success": True,
            "url": "http://...",
            "path": "/path/to/...",
            "model": "gemini"
        }
        或
        {
            "success": False,
            "error": "错误描述"
        }
    """

    if not prompt or not prompt.strip():
        return {"success": False, "error": "prompt 不能为空"}

    if session_id and session_id in _sessions:
        session = _sessions[session_id]
    elif _sessions:
        session = list(_sessions.values())[-1]
    else:
        return {"success": False, "error": "没有可用的会话，请先调用 generate_image"}

    try:
        result = await session.modify(prompt=prompt)
        actual_url = _extract_url_from_markdown(result)
        local_path = _get_local_path_from_session(session, getattr(session, 'model', 'unknown'))

        return {
            "success": True,
            "url": actual_url,
            "path": local_path,
            "model": getattr(session, 'model', 'unknown')
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"修改失败: {str(e)}"
        }


def cleanup_old_sessions(max_sessions: int = 10):
    """清理旧的会话，保留最近的 max_sessions 个"""
    if len(_sessions) > max_sessions:
        keys_to_keep = list(_sessions.keys())[-max_sessions:]
        keys_to_remove = [k for k in _sessions.keys() if k not in keys_to_keep]
        for k in keys_to_remove:
            del _sessions[k]