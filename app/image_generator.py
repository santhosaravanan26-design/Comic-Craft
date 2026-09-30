"""
Image Generator module for ComicCraft.
Handles Gemini image model requests with character consistency and fallback illustration generation.
Section 9 & 10 Requirements.
"""

import base64
import logging
import time
from pathlib import Path
from typing import Tuple, Dict, Any
from google import genai
from google.genai import types
from PIL import Image, ImageDraw, ImageFont

from app.config import GEMINI_API_KEY, GEMINI_IMAGE_MODEL, PANELS_DIR
from app.models import CharacterProfile

logger = logging.getLogger(__name__)


def create_fallback_comic_image(
    panel_number: int,
    title: str,
    character_name: str,
    mood: str,
    art_style: str,
    setting: str,
    caption: str
) -> str:
    """
    Creates a styled, high-resolution comic panel image using Pillow
    when image generation API is restricted or encountering quotas.
    Returns the relative path under static/panels/.
    """
    width, height = 800, 600
    image = Image.new("RGB", (width, height), color="#1e1b4b")
    draw = ImageDraw.Draw(image)

    # Color palettes based on setting
    palettes = {
        "Forest": ("#14532d", "#15803d", "#86efac"),
        "Space": ("#090a1f", "#1e1b4b", "#c084fc"),
        "City": ("#0f172a", "#334155", "#38bdf8"),
        "School": ("#7c2d12", "#9a3412", "#fdba74"),
        "Fantasy Kingdom": ("#4c0519", "#881337", "#f43f5e"),
    }
    bg1, bg2, accent = palettes.get(setting, ("#1e1b4b", "#312e81", "#fbbf24"))

    # Background gradient approximation
    for y in range(height):
        ratio = y / height
        # Simple color blend
        r = int(int(bg1[1:3], 16) * (1 - ratio) + int(bg2[1:3], 16) * ratio)
        g = int(int(bg1[3:5], 16) * (1 - ratio) + int(bg2[3:5], 16) * ratio)
        b = int(int(bg1[5:7], 16) * (1 - ratio) + int(bg2[5:7], 16) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Comic dot pattern simulation
    for x in range(0, width, 24):
        for y in range(0, height, 24):
            draw.ellipse([x, y, x + 2, y + 2], fill="#ffffff")

    # Comic thick border
    draw.rectangle([6, 6, width - 7, height - 7], outline="#111827", width=6)
    draw.rectangle([12, 12, width - 13, height - 13], outline=accent, width=2)

    # Action speed lines in corners
    draw.line([(0, 0), (180, 120)], fill=accent, width=2)
    draw.line([(width, 0), (width - 180, 120)], fill=accent, width=2)
    draw.line([(0, height), (180, height - 120)], fill=accent, width=2)
    draw.line([(width, height), (width - 180, height - 120)], fill=accent, width=2)

    # Panel Number Badge (Top-left)
    draw.rectangle([30, 30, 200, 75], fill="#facc15", outline="#111827", width=3)
    draw.text((45, 42), f"PANEL {panel_number}", fill="#111827")

    # Mood Badge (Top-right)
    draw.rectangle([width - 220, 30, width - 30, 75], fill="#111827", outline=accent, width=2)
    draw.text((width - 200, 44), mood[:18].upper(), fill="#facc15")

    # Central Silhouette / Comic Shield
    cx, cy = width // 2, height // 2 - 20
    draw.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=bg2, outline=accent, width=3)
    draw.ellipse([cx - 40, cy - 60, cx + 40, cy + 20], fill=accent, outline="#111827", width=3)
    draw.polygon([(cx - 70, cy + 80), (cx + 70, cy + 80), (cx + 50, cy + 20), (cx - 50, cy + 20)], fill="#ffffff", outline="#111827")

    # Title & Setting description banner (Bottom)
    draw.rectangle([30, height - 100, width - 30, height - 30], fill="#ffffff", outline="#111827", width=4)
    info_text = f"{title.upper()} - {character_name} in {setting} ({art_style})"
    draw.text((50, height - 76), info_text[:60], fill="#111827")

    filename = f"panel_{panel_number}_{int(time.time())}.png"
    filepath = PANELS_DIR / filename
    image.save(filepath, "PNG")

    return f"/static/panels/{filename}"


def generate_image(
    panel_number: int,
    title: str,
    image_prompt: str,
    character_profile: CharacterProfile,
    setting: str,
    mood: str,
    art_style: str,
    caption: str = ""
) -> str:
    """
    Generates a comic illustration for a given panel using Gemini's image model.
    Falls back gracefully to a high-quality stylized illustration if quota or access limits are reached.
    """
    # Build consistent character prompt incorporating full character description
    character_desc = (
        f"{character_profile.name}, {character_profile.appearance}, "
        f"wearing {character_profile.clothing}, distinct feature: {character_profile.distinctive_features}"
    )

    full_prompt = (
        f"Comic book illustration of {character_desc}, standing in {setting}, "
        f"scene: {image_prompt}, mood: {mood}, dramatic cinematic lighting, "
        f"detailed background, consistent character design, high-quality comic illustration, {art_style} style."
    )

    if GEMINI_API_KEY:
        try:
            client = genai.Client(
                api_key=GEMINI_API_KEY,
                http_options={"headers": {"User-Agent": "aistudio-build"}}
            )

            logger.info(f"Requesting Gemini image generation for panel {panel_number}...")
            response = client.models.generate_content(
                model=GEMINI_IMAGE_MODEL,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    image_config=types.ImageConfig(aspect_ratio="4:3")
                )
            )

            if response.candidates and response.candidates[0].content:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.data:
                        image_bytes = base64.b64decode(part.inline_data.data)
                        filename = f"panel_{panel_number}_{int(time.time())}.png"
                        filepath = PANELS_DIR / filename
                        with open(filepath, "wb") as f:
                            f.write(image_bytes)
                        logger.info(f"Saved Gemini image to {filepath}")
                        return f"/static/panels/{filename}"

        except Exception as e:
            logger.warning(f"Gemini image generation for panel {panel_number} notice: {e}")

    # Fallback to generated comic illustration
    logger.info(f"Using comic illustration generator for panel {panel_number}")
    return create_fallback_comic_image(
        panel_number=panel_number,
        title=title,
        character_name=character_profile.name,
        mood=mood,
        art_style=art_style,
        setting=setting,
        caption=caption
    )
