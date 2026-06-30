"""
MCP 图片生成 — 独立可复用模块

从 deepseek-plus 抽取，零依赖（仅 aiohttp），
可作为 Hermes 技能、Python 库、或 CLI 使用。

用法:
    import asyncio
    from gen import ImageSession

    async def main():
        session = ImageSession()

        # 文生图
        url = await session.generate("一只猫", aspect_ratio="16:9", image_size="2K")
        print(url)

        # 无限迭代改图
        url = await session.modify("把猫改成橘色")
        url = await session.modify("加一个蝴蝶结")

        # 查看历史 / 回退
        print(session.history)
        session.rollback(0)

    asyncio.run(main())

环境变量:
    FLEET_URL       MCP Fleet 网关地址 (默认 http://10.10.100.10:8222)
    MCP_PATH        图片 MCP 路径 (默认 /mcp/proxy/multimodal-model-prod/mcp)
    MCP_TIMEOUT     超时秒数 (默认 300)
    IMAGE_DIR       图片保存目录 (默认 /vol1/1000/image-cache/mcp-image-gen)
    IMAGE_HOST      图片访问地址 (默认 http://10.10.100.10:1666/cache)
"""

import asyncio
import base64
import json
import logging
import os
import pathlib
import time
import uuid
from typing import Optional

import aiohttp

logger = logging.getLogger("mcp-image-gen")

# ---- 配置 ----

FLEET_URL = os.getenv("FLEET_URL", "http://10.10.100.10:8222")
MCP_PATH = os.getenv("MCP_PATH", "/mcp/proxy/multimodal-model-prod/mcp")
MCP_ENDPOINT = f"{FLEET_URL.rstrip('/')}{MCP_PATH}"
# 便携版默认路径：HERMES_HOME/cache/images（api/media 允许的目录）
_default_image_dir = os.path.join(
    os.getenv("HERMES_HOME", os.path.expanduser("~/.hermes")),
    "cache", "images"
)
IMAGE_DIR = os.getenv("IMAGE_DIR", _default_image_dir)
IMAGE_HOST = os.getenv("IMAGE_HOST", "http://localhost:1666/cache")

def _env_int(name: str, default: int) -> int:
    """安全读取整数环境变量，非法值时抛明确异常"""
    raw = os.getenv(name, str(default))
    try:
        return int(raw)
    except ValueError:
        raise ValueError(f"环境变量 {name} 值非法: {raw!r}，需要整数") from None

MCP_TIMEOUT = _env_int("MCP_TIMEOUT", 300)
IMAGE_MAX = _env_int("IMAGE_MAX", 500)
MAX_RETRIES = _env_int("MAX_RETRIES", 2)


# ---- 异常 ----

class MCPError(Exception):
    """MCP 调用错误"""


class MCPConnectionError(MCPError):
    """MCP 连接/网络错误（可重试）"""


class GenerateError(Exception):
    """图片生成错误"""


# ---- MCP 客户端 ----

class MCPClient:
    """无状态 MCP JSON-RPC 客户端 — 单例复用连接"""

    def __init__(self, endpoint: str = MCP_ENDPOINT, timeout: int = MCP_TIMEOUT):
        self._endpoint = endpoint
        self._timeout = aiohttp.ClientTimeout(total=timeout)
        self._rid = 0

    def _next_id(self) -> int:
        self._rid += 1
        return self._rid

    async def _call(self, session: aiohttp.ClientSession, method: str, params: dict) -> dict:
        rid = self._next_id()
        payload = {"jsonrpc": "2.0", "id": rid, "method": method, "params": params}
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}

        try:
            async with session.post(
                self._endpoint, json=payload, headers=headers, timeout=self._timeout,
            ) as resp:
                body = await resp.text()
                if resp.status != 200:
                    raise MCPConnectionError(f"MCP returned {resp.status}: {body[:200]}")
                return self._parse_sse(body, rid)
        except MCPConnectionError:
            raise
        except MCPError:
            raise
        except Exception as e:
            raise MCPConnectionError(f"MCP connection failed: {e}") from e

    def _parse_sse(self, body: str, expected_id: int) -> dict:
        for line in body.split("\n"):
            line = line.strip()
            if line.startswith("data:"):
                try:
                    parsed = json.loads(line[5:].strip())
                    if parsed.get("id") == expected_id:
                        return parsed
                except json.JSONDecodeError:
                    continue
        # fallback: 解析后校验 ID
        try:
            parsed = json.loads(body)
            if parsed.get("id") != expected_id:
                raise MCPConnectionError(f"Response id mismatch: expected {expected_id}, got {parsed.get('id')}")
            return parsed
        except json.JSONDecodeError:
            raise MCPConnectionError(f"No matching SSE frame for id {expected_id}; body not valid JSON: {body[:200]}")

    def _extract_error_text(self, result: dict) -> str:
        """从 MCP 返回内容中提取错误文本"""
        for item in result.get("content", []):
            if item.get("type") == "text":
                return item.get("text", "")
        return ""

    async def call_tool(
        self, session: aiohttp.ClientSession, tool_name: str,
        arguments: dict, *, retries: int = MAX_RETRIES,
    ) -> dict:
        """调用 MCP 工具，返回 content 列表。指数退避重试 + 错误文本提取"""
        last_error = None
        for attempt in range(retries + 1):
            try:
                result = await self._call(session, "tools/call", {
                    "name": tool_name, "arguments": arguments,
                })
                if "error" in result:
                    raise MCPError(str(result["error"]))
                r = result.get("result", {})
                if r.get("isError"):
                    err_text = self._extract_error_text(r)
                    raise MCPError(err_text or "MCP tool returned error")
                return r.get("content", [])
            except MCPConnectionError as e:
                last_error = e
                if attempt < retries:
                    delay = 0.5 * (2 ** attempt)
                    logger.warning(f"[MCP] retry {attempt + 1}/{retries} after {delay}s: {e}")
                    await asyncio.sleep(delay)
            except MCPError:
                raise       # 工具级错误不重试
            except Exception as e:
                last_error = e
                if attempt < retries:
                    delay = 0.5 * (2 ** attempt)  # 指数退避: 0.5→1→2s
                    logger.warning(f"[MCP] retry {attempt + 1}/{retries} after {delay}s: {e}")
                    await asyncio.sleep(delay)
        raise MCPConnectionError(f"MCP call failed after {retries + 1} attempts: {last_error}")


# ---- MCP 单例 ----

_mcp_singleton: Optional[MCPClient] = None


def get_mcp() -> MCPClient:
    """获取 MCP 客户端单例，复用连接"""
    global _mcp_singleton
    if _mcp_singleton is None:
        _mcp_singleton = MCPClient(MCP_ENDPOINT, MCP_TIMEOUT)
    return _mcp_singleton


# ---- 图片存储 ----


async def _save_image(data: bytes) -> str:
    loop = asyncio.get_event_loop()
    pathlib.Path(IMAGE_DIR).mkdir(parents=True, exist_ok=True)
    ext = _detect_image_ext(data)
    fname = f"mcp_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}{ext}"
    fpath = os.path.join(IMAGE_DIR, fname)
    def _write():
        with open(fpath, "wb") as f:
            f.write(data)
    await loop.run_in_executor(None, _write)
    await _cleanup()
    return fname


async def _cleanup():
    loop = asyncio.get_event_loop()
    def _do():
        # 清理所有图片格式，不只 png
        all_files = []
        for ext in _IMAGE_EXTENSIONS:
            all_files.extend(pathlib.Path(IMAGE_DIR).glob(f"*{ext}"))
        files = sorted(all_files, key=lambda p: p.stat().st_mtime)
        overflow = files[: -IMAGE_MAX] if len(files) > IMAGE_MAX else []
        for old in overflow:
            try:
                old.unlink()
            except Exception:
                pass
    await loop.run_in_executor(None, _do)


# ---- 图床上传 ----

_MIME_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
}

_IMAGE_EXTENSIONS = tuple(_MIME_MAP.keys())


def _mime_type(ext: str) -> str:
    return _MIME_MAP.get(ext.lower(), "image/png")


def _detect_image_ext(data: bytes) -> str:
    """通过魔术字节检测图片格式，返回扩展名"""
    if data[:4] == b"\x89PNG":
        return ".png"
    if data[:2] == b"\xff\xd8":
        return ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    if data[:2] == b"BM":
        return ".bmp"
    return ".png"  # fallback

# 图床列表，按优先级排列
IMAGE_HOSTS = [
    {
        "name": "uguu.se",
        "url": "https://uguu.se/upload.php",
        "field": "files[]",
    },
    {
        "name": "imgbb.com",
        "url": "https://imgbb.com/json",
        "field": "source",
        "extra_fields": {"type": "file", "action": "upload"},
    },
    ]


def _extract_filename(url: str) -> str:
    """从 URL 提取文件名，如 http://x/images/abc.png → abc.png"""
    fname = url.rstrip("/").rsplit("/", 1)[-1].split("?")[0]
    if not fname:
        raise GenerateError(f"无法从 URL 提取文件名: {url!r}")
    return fname


async def _upload_to_host(session: aiohttp.ClientSession, filepath: str, host: dict) -> str:
    """上传到单个图床，返回公网 URL"""
    loop = asyncio.get_event_loop()
    def _read():
        with open(filepath, "rb") as f:
            return f.read()
    file_data = await loop.run_in_executor(None, _read)
    data = aiohttp.FormData()
    data.add_field(host["field"], file_data,
                   filename=os.path.basename(filepath),
                   content_type=_mime_type(os.path.splitext(filepath)[1]))
    for k, v in host.get("extra_fields", {}).items():
        data.add_field(k, v)

    async with session.post(host["url"], data=data,
                                 timeout=aiohttp.ClientTimeout(total=20)) as resp:
        if resp.status != 200:
            raise Exception(f"{host['name']} HTTP {resp.status}")
        text = await resp.text()
        try:
            j = json.loads(text)
        except json.JSONDecodeError:
            raise Exception(f"{host['name']} invalid response: {text[:100]}")

        # uguu.se: {"files": [{"url": "..."}]}
        if "files" in j and j["files"]:
            return j["files"][0]["url"]
        # imgbb.com: {"image": {"url": "..."}}
        if "image" in j and isinstance(j["image"], dict):
            return j["image"]["url"]
        raise Exception(f"{host['name']} unexpected: {text[:100]}")


async def _upload_image(filepath: str) -> str:
    """上传图片到图床，多个图床自动切换，返回公网 URL"""
    last_error = None
    timeout = aiohttp.ClientTimeout(total=60)  # 给两个图床各留 20s + 余量
    async with aiohttp.ClientSession(timeout=timeout) as session:
        for host in IMAGE_HOSTS:
            try:
                url = await _upload_to_host(session, filepath, host)
                logger.info(f"图床上传: {host['name']} → {url[:60]}")
                return url
            except Exception as e:
                last_error = e
                logger.warning(f"图床 {host['name']} 失败: {e}")
                continue
    raise GenerateError(f"所有图床上传失败，最后错误: {last_error}")


# ---- 图片生成 ----


class ImageSession:
    """图片生成会话 — 封装迭代状态，支持多链路并发"""

    def __init__(self):
        self._history: list[dict] = []  # {url, prompt, timestamp, filename}
        self._last_url: Optional[str] = None

    # ---- 公共 API ----

    @property
    def last_url(self) -> Optional[str]:
        """上一次生成的图片 URL"""
        return self._last_url

    @property
    def history(self) -> list[dict]:
        """迭代历史，最近的在末尾"""
        return list(self._history)

    def rollback(self, index: int) -> str:
        """回退到历史中的某一步，后续历史被丢弃"""
        if not self._history:
            raise GenerateError("回退失败：历史为空，请先调用 generate()")
        if index < 0 or index >= len(self._history):
            raise GenerateError(f"回退失败：索引 {index} 超出范围 (0-{len(self._history) - 1})")
        self._history = self._history[: index + 1]
        self._last_url = self._history[-1]["url"]
        return self._last_url

    def reset(self):
        """重置会话状态"""
        self._history.clear()
        self._last_url = None

    async def generate(
        self,
        prompt: str,
        *,
        image_size: str = "2K",
        ref_urls: Optional[list[str]] = None,
        session: Optional[aiohttp.ClientSession] = None,
    ) -> str:
        """调用 MCP 生成图片，返回 Markdown 图片文本

        Args:
            prompt: 图片描述（中文原文直传）
            image_size: 尺寸 (1K, 2K, 4K)
            ref_urls: 参考图 URL 列表（图生图）
            session: 可复用的 aiohttp session

        Returns:
            Markdown 格式: ![生成图片](url)

        Raises:
            GenerateError: 出图失败
        """
        logger.info(f"生成图片: prompt={prompt[:80]} size={image_size} refs={bool(ref_urls)}")

        mcp = get_mcp()
        tool_name = "generate_image_model2"
        args = {"prompt": prompt, "size": image_size}

        # 统一 session 管理
        own_session = session is None
        if own_session:
            session = aiohttp.ClientSession()
        try:
            # 图生图：传公网 URL，让 MCP 服务端自己下载
            if ref_urls:
                args["referenceImageUrls"] = ref_urls

            # 调用 MCP
            content = await mcp.call_tool(session, tool_name, args)

            for item in content:
                if isinstance(item, dict) and item.get("type") == "image":
                    img_data = base64.b64decode(item["data"])
                    fname = await _save_image(img_data)
                    url = f"{IMAGE_HOST.rstrip('/')}/{fname}"
                    self._last_url = url
                    self._history.append({
                        "url": url,
                        "filename": fname,
                        "prompt": prompt,
                        "image_size": image_size,
                        "timestamp": time.time(),
                    })
                    logger.info(f"生成完成: {fname} ({len(img_data)} bytes)")
                    return f"![生成图片]({url})"

            raise GenerateError("MCP 未返回图片数据")
        except MCPError as e:
            raise GenerateError(str(e)) from e
        finally:
            if own_session and session:
                await session.close()

    async def modify(
        self,
        prompt: str,
        *,
        aspect_ratio: Optional[str] = None,
        image_size: Optional[str] = None,
        session: Optional[aiohttp.ClientSession] = None,
    ) -> str:
        """基于上一次生成的图片继续修改，无限迭代

        自动上传上一张图到图床获取公网 URL，再传给 POD。
        未指定 aspect_ratio/image_size 时继承上一张图的参数。

        Raises:
            GenerateError: 没有上一张图片或出图失败
        """
        if not self._last_url:
            raise GenerateError("没有上一张图片，请先调用 generate()")
        fname = _extract_filename(self._last_url)
        fpath = os.path.join(IMAGE_DIR, fname)
        if not os.path.exists(fpath):
            raise GenerateError(f"本地图片不存在: {fpath}")
        public_url = await _upload_image(fpath)

        # 继承上一张图的参数
        if image_size is None and self._history:
            image_size = self._history[-1].get("image_size", "2K")
        image_size = image_size or "2K"

        return await self.generate(
            prompt,
            image_size=image_size,
            ref_urls=[public_url],
            session=session,
        )


# ---- 模块级便捷函数（向后兼容） ----

_default_session = ImageSession()


async def generate(
    prompt: str,
    *,
    aspect_ratio: str = "16:9",
    image_size: str = "2K",
    ref_urls: Optional[list[str]] = None,
    session: Optional[aiohttp.ClientSession] = None,
) -> str:
    """模块级便捷函数，内部使用默认 ImageSession"""
    return await _default_session.generate(
        prompt, image_size=image_size,
        ref_urls=ref_urls, session=session,
    )


async def modify(
    prompt: str,
    *,
    aspect_ratio: Optional[str] = None,
    image_size: Optional[str] = None,
    session: Optional[aiohttp.ClientSession] = None,
) -> str:
    """模块级便捷函数，内部使用默认 ImageSession"""
    return await _default_session.modify(
        prompt, image_size=image_size,
        session=session,
    )


def last_url() -> Optional[str]:
    """模块级便捷函数"""
    return _default_session.last_url


def reset() -> None:
    """模块级便捷函数"""
    _default_session.reset()


# ---- CLI ----

async def _cli():
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if len(sys.argv) < 2:
        print("用法: python gen.py '图片描述' [--size 2K] [--ref URL]")
        print("示例: python gen.py '一只猫' --size 2K")
        sys.exit(1)

    prompt = sys.argv[1]
    ratio = "16:9"
    size = "2K"
    model = "gemini"
    refs = []

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--ratio" and i + 1 < len(sys.argv):
            ratio = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--size" and i + 1 < len(sys.argv):
            size = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--model" and i + 1 < len(sys.argv):
            model = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--ref" and i + 1 < len(sys.argv):
            refs.append(sys.argv[i + 1])
            i += 2
        else:
            i += 1

    try:
        result = await generate(prompt, image_size=size, ref_urls=refs or None)
        print(result)
    except GenerateError as e:
        print(f"出图失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(_cli())