"""
Image Generation Plugin for Hermes

提供 AI 出图能力，支持 Gemini 和豆包两个模型。
- 文生图：根据文字描述生成图片
- 图生图：基于参考图生成新图
- 迭代改图：基于上一张图继续修改

使用方式：
    AI 调用 generate_image 工具生成图片
    AI 调用 modify_image 工具迭代修改
"""

from .image_tool import generate_image, modify_image

__all__ = ['generate_image', 'modify_image']
