"""
Gemini Pro module for generating comic story dialogue, narration, and captions.
Section 8 Requirement.
"""

import json
import logging
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY, GEMINI_TEXT_MODEL, FALLBACK_TEXT_MODELS
from app.models import OutlineResponse, StoryResponse

logger = logging.getLogger(__name__)


def generate_story(
    outline: OutlineResponse,
    tone: str,
    art_style: str,
    preferred_model: str = "",
    max_retries: int = 2
) -> StoryResponse:
    """
    Generates rich, comic-authentic captions, third-person narration, and dialogue
    for all 5 panels from the structured outline, with model failover.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in the environment.")

    client = genai.Client(
        api_key=GEMINI_API_KEY,
        http_options={"headers": {"User-Agent": "aistudio-build"}}
    )

    outline_dict = outline.model_dump()
    panels_summary = [
        {
            "panel_number": p["panel_number"],
            "title": p["title"],
            "scene_description": p["scene_description"],
            "mood": p["mood"]
        }
        for p in outline_dict["panels"]
    ]

    prompt = f"""You are an award-winning comic book writer and dialogue specialist.
Given this 5-panel comic outline and character profile:

Character Profile: {json.dumps(outline_dict["character_profile"])}
Tone: "{tone}"
Art Style: "{art_style}"
Panels: {json.dumps(panels_summary)}

Write the comic text for EVERY panel (1 through 5).
For each panel, provide:
1. "narration": Atmospheric, cinematic narrative text that sets the scene.
2. "caption": A classic comic box caption (e.g. "MEANWHILE IN THE SHADOWS...", "SECONDS BEFORE DISASTER...", "WITH UNWAVERING RESOLVE...").
3. "action_note": Sound effect or dramatic stage note (e.g. "WHOOSH!", "CRACKLE!", "HEART POUNDING").
4. "dialogue": List of character speech bubbles. Authentic, punchy comic dialogue that reflects personality.

Return ONLY valid JSON matching this schema:
{{
  "panels": [
    {{
      "panel_number": 1,
      "narration": "...",
      "caption": "...",
      "action_note": "...",
      "dialogue": [
        {{
          "character": "{outline.character_profile.name}",
          "text": "..."
        }}
      ]
    }}
  ]
}}
Ensure exactly 5 panels are returned for panels 1 to 5.
"""

    models_to_try = [
        m for m in ([preferred_model] if preferred_model else []) + FALLBACK_TEXT_MODELS
        if m
    ]
    seen = set()
    unique_models = []
    for m in models_to_try:
        if m not in seen:
            seen.add(m)
            unique_models.append(m)

    last_error = None
    for model_name in unique_models:
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Generating comic dialogue with model {model_name} (attempt {attempt + 1})...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7,
                    )
                )

                text_output = response.text
                if not text_output:
                    raise ValueError("Empty response from Gemini story generation")

                data = json.loads(text_output)
                story = StoryResponse(**data)
                return story

            except Exception as e:
                logger.warning(f"Story generation failed with {model_name} (attempt {attempt + 1}): {e}")
                last_error = e
                err_str = str(e).lower()
                if "503" in err_str or "high demand" in err_str or "unavailable" in err_str:
                    logger.info(f"Model {model_name} is under high demand (503). Switching to fallback model...")
                    break

    raise RuntimeError(f"Failed to generate story dialogue across candidate models: {last_error}")
