"""Gemini image generation provider via Fleet MCP gateway.

This provider uses the Fleet MCP gateway to call Gemini's image generation API.
Key feature: prompt pass-through - no prompt modification, direct transmission to upstream.

Iron rules:
1. NEVER modify user's prompt - pass it through exactly as received
2. NEVER analyze reference images with vision - let the model handle it
3. NEVER add quality modifiers or expand prompts
4. NEVER translate prompts - use the original language
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from agent.image_gen_provider import (
    DEFAULT_ASPECT_RATIO,
    ImageGenProvider,
    error_response,
    resolve_aspect_ratio,
    success_response,
)

logger = logging.getLogger(__name__)


class GeminiProvider(ImageGenProvider):
    """Gemini image generation via Fleet MCP gateway."""

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def display_name(self) -> str:
        return "Gemini (Fleet MCP)"

    def is_available(self) -> bool:
        """Check if FLEET_URL is configured."""
        fleet_url = os.getenv("FLEET_URL")
        return bool(fleet_url)

    def list_models(self) -> List[Dict[str, Any]]:
        """Return available models."""
        model_name = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-exp")
        return [
            {
                "id": model_name,
                "display": f"Gemini Image ({model_name})",
                "speed": "~20s",
                "strengths": "Fast, good quality, supports image editing",
            }
        ]

    def default_model(self) -> Optional[str]:
        return os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-exp")

    def get_setup_schema(self) -> Dict[str, Any]:
        """Return setup schema for the tools picker."""
        return {
            "name": "Gemini (Fleet MCP)",
            "badge": "custom",
            "tag": "Image generation via Fleet MCP gateway with prompt pass-through",
            "env_vars": [
                {
                    "key": "FLEET_URL",
                    "prompt": "Fleet MCP Gateway URL",
                    "url": "",
                    "default": "http://10.10.100.10:8222",
                }
            ],
        }

    def generate(
        self,
        prompt: str,
        aspect_ratio: str = DEFAULT_ASPECT_RATIO,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Generate an image using Gemini via Fleet MCP.

        CRITICAL: This method implements strict prompt pass-through.
        The prompt is sent to the upstream model EXACTLY as received.
        No modification, no enhancement, no translation.
        """
        # Iron rule: validate prompt is not empty but DO NOT modify it
        if not prompt or not prompt.strip():
            return error_response(
                error="Prompt cannot be empty",
                error_type="invalid_prompt",
                provider=self.name,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
            )

        # Resolve aspect ratio to Gemini's format
        resolved_ratio = resolve_aspect_ratio(aspect_ratio)
        gemini_ratio = self._convert_aspect_ratio(resolved_ratio)

        try:
            # Import here to avoid circular dependencies
            import sys
            sys.path.insert(0, str(Path(__file__).parent.parent.parent / "image-gen"))
            from gen_gemini import ImageSession

            logger.info(f"Starting Gemini generation: prompt='{prompt[:50]}...', ratio={gemini_ratio}")

            # Create session and generate
            # CRITICAL: We pass the prompt EXACTLY as received - no modification
            session = ImageSession()

            # Run async generation with timeout
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                logger.info("Calling session.generate...")
                # generate() returns Markdown format, but we need just the URL
                loop.run_until_complete(
                    asyncio.wait_for(
                        session.generate(
                            prompt=prompt,  # DIRECT PASS-THROUGH - NO MODIFICATION
                            aspect_ratio=gemini_ratio,
                            image_size="2K",
                            ref_urls=kwargs.get("ref_urls"),
                        ),
                        timeout=120  # 2分钟超时
                    )
                )
                # Get the pure URL from session.last_url
                url = session.last_url
                if not url:
                    raise Exception("session.generate() completed but no URL was returned")
                logger.info(f"Generation complete, URL: {url}")
            except asyncio.TimeoutError:
                logger.error("Generation timed out after 120 seconds")
                return error_response(
                    error="Image generation timed out after 2 minutes. Please try again or check Fleet gateway status.",
                    error_type="timeout_error",
                    provider=self.name,
                    model="gemini-2.0-flash-exp",
                    prompt=prompt,
                    aspect_ratio=aspect_ratio,
                )
            finally:
                loop.close()

            # Return the URL directly - it's accessible from the MCP server
            # for image-to-image workflows. The desktop app may not display it
            # inline, but the AI can describe the image content.
            image_path = url
            model_name = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-exp")
            logger.info(f"Gemini generated image: {image_path}")

            return success_response(
                image=image_path,
                model=model_name,
                prompt=prompt,  # Echo back the original prompt
                aspect_ratio=resolved_ratio,
                provider=self.name,
                extra={"session_id": str(id(session))},
            )

        except Exception as e:
            logger.error(f"Gemini generation failed: {e}", exc_info=True)
            model_name = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.0-flash-exp")
            return error_response(
                error=f"Gemini generation failed: {str(e)}",
                error_type="generation_error",
                provider=self.name,
                model=model_name,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
            )

    def _convert_aspect_ratio(self, ratio: str) -> str:
        """Convert Hermes aspect ratio to Gemini format.

        Hermes uses: landscape, square, portrait
        Gemini uses: 16:9, 1:1, 9:16, 4:3, 3:4
        """
        mapping = {
            "landscape": "16:9",
            "square": "1:1",
            "portrait": "9:16",
        }
        return mapping.get(ratio, "16:9")


# ---------------------------------------------------------------------------
# Plugin entry point
# ---------------------------------------------------------------------------


def register(ctx) -> None:
    """Plugin entry point — wire ``GeminiProvider`` into the registry."""
    ctx.register_image_gen_provider(GeminiProvider())


# Provider instance for registration
provider = GeminiProvider()
