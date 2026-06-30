# Image Generation Plugin

AI 图片生成插件，支持 **Gemini** 和 **豆包** 两个模型。

## 功能

- **文生图**：根据文字描述生成图片
- **图生图**：基于参考图生成新图
- **迭代改图**：基于上一张图继续修改

## 工具

### generate_image

生成图片（文生图 / 图生图）

**参数**：
- `prompt` (str, 必填): 图片描述，直接传用户原话，不要改写
- `model` (str, 可选): 模型选择，"gemini" 或 "doubao"，默认 "gemini"
- `aspect_ratio` (str, 可选): 宽高比，仅 Gemini 支持，可选 "1:1", "4:3", "16:9", "9:16", "3:4"，默认 "16:9"
- `image_size` (str, 可选): 图片尺寸，可选 "1K", "2K", "4K"，默认 "2K"
- `ref_urls` (list, 可选): 参考图 URL 列表（图生图），必须是公网可访问的 URL

**返回**：
```json
{
  "success": true,
  "url": "http://10.10.100.10:1666/cache/xxx.jpg",
  "path": "C:/Users/.../image-cache/xxx.jpg",
  "model": "gemini",
  "session_id": "12345678"
}
```

### modify_image

迭代改图（基于上一张图继续修改）

**参数**：
- `prompt` (str, 必填): 修改描述，直接传用户原话，不要改写
- `session_id` (str, 可选): 会话 ID（来自 generate_image 返回值），不提供则使用最近一次会话

**返回**：
```json
{
  "success": true,
  "url": "http://10.10.100.10:1666/cache/yyy.jpg",
  "path": "C:/Users/.../image-cache/yyy.jpg",
  "model": "gemini"
}
```

## 配置

在 `.env` 中配置：

```bash
FLEET_URL=http://10.10.100.10:8222        # Fleet MCP 网关地址
IMAGE_DIR=%HERMES_HOME%/image-cache       # 图片存储目录
IMAGE_HOST=http://10.10.100.10:1666/cache # 图片访问地址
MCP_TIMEOUT=300                           # MCP 请求超时（秒）
```

## 使用示例

### 文生图

```
用户：画一只猫
AI 调用：generate_image(prompt="画一只猫", model="gemini")
```

### 图生图

```
用户：把这张图改成油画风格 [上传图片]
AI 调用：generate_image(
    prompt="把这张图改成油画风格",
    ref_urls=["https://uguu.se/xxx.jpg"]
)
```

### 迭代改图

```
用户：加一个蝴蝶结
AI 调用：modify_image(prompt="加一个蝴蝶结")
```

## 注意事项

1. **Prompt 不要改写**：直接传用户原话，不要润色、扩展、翻译
2. **参考图必须公网可访问**：POD 服务器无法访问内网
3. **图生图禁止预分析**：不要用 vision 分析参考图，模型自己会理解
4. **网络依赖**：需要访问 Fleet MCP 网关，离线环境无法使用

## 架构

```
用户 → Hermes AI → generate_image 工具
                      ↓
                  gen_gemini.py / gen_doubao.py
                      ↓
                  Fleet MCP 网关 (10.10.100.10:8222)
                      ↓
                  POD GPU 服务器（出图）
                      ↓
                  图片服务器 (10.10.100.10:1666)
                      ↓
                  返回图片 URL
```
