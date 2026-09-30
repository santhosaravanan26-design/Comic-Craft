"""
Gemini Flash module for generating structured 5-panel comic outlines.
Section 7 Requirement.
"""

import json
import logging
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY, GEMINI_TEXT_MODEL, FALLBACK_TEXT_MODELS
from app.models import OutlineResponse

logger = logging.getLogger(__name__)


def get_genai_client() -> genai.Client:
    """Initialize and return the Google GenAI client."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in the environment.")
    return genai.Client(
        api_key=GEMINI_API_KEY,
        http_options={"headers": {"User-Agent": "aistudio-build"}}
    )


def generate_outline(
    story_prompt: str,
    character_name: str,
    setting: str,
    tone: str,
    art_style: str,
    preferred_model: str = "",
    max_retries: int = 2
) -> OutlineResponse:
    """
    Generates a structured 5-panel comic outline and consistent character profile using Gemini.
    Validates output with Pydantic with safe model failover capability.
    """
    client = get_genai_client()

    prompt = f"""You are a master comic book screenwriter and story architect.
Your task is to transform this user story idea into a tight, dramatic 5-panel comic outline:

- Story Prompt: "{story_prompt}"
- Main Character Name: "{character_name}"
- Setting: "{setting}"
- Tone: "{tone}"
- Art Style: "{art_style}"

Follow the classic 5-panel narrative arc strictly:
Panel 1: Introduction (The Hook, the protagonist's world or immediate situation)
Panel 2: Development (Rising action, discovery, travel, or inciting incident)
Panel 3: Conflict / Problem (The twist, antagonist emergence, or obstacle)
Panel 4: Climax (The peak intensity, bold choice, or confrontation)
Panel 5: Resolution (The aftermath, emotional closure, victory, or twist punchline)

Create a detailed character profile for visual consistency:
- name: "{character_name}"
- appearance: Hair, eye color, facial features, body build
- clothing: Signature outfit, materials, iconic colors
- age: Approximate age or era
- personality: Key traits
- distinctive_features: Marks, scars, emblems, or accessories

Return ONLY valid JSON matching this schema:
{{
  "story_title": "Short punchy comic title",
  "character_profile": {{
    "name": "{character_name}",
    "appearance": "...",
    "clothing": "...",
    "age": "...",
    "personality": "...",
    "distinctive_features": "..."
  }},
  "panels": [
    {{
      "panel_number": 1,
      "title": "...",
      "scene_description": "...",
      "image_prompt": "...",
      "characters": ["{character_name}"],
      "location": "...",
      "mood": "..."
    }}
  ]
}}
Ensure the panels list contains EXACTLY 5 panels numbered 1 to 5.
"""

    models_to_try = [
        m for m in ([preferred_model] if preferred_model else []) + FALLBACK_TEXT_MODELS
        if m
    ]
    # Unique preserve order
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
                logger.info(f"Generating outline with model {model_name} (attempt {attempt + 1})...")
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
                    raise ValueError("Empty response received from Gemini API")

                data = json.loads(text_output)
                outline = OutlineResponse(**data)

                # Ensure exactly 5 panels
                if len(outline.panels) != 5:
                    logger.warning(f"Returned {len(outline.panels)} panels instead of 5. Adjusting...")
                    outline.panels = outline.panels[:5]

                return outline

            except Exception as e:
                logger.warning(f"Outline generation failed with {model_name} (attempt {attempt + 1}): {e}")
                last_error = e
                # If model is unavailable (503 / high demand), break inner loop to try next model
                err_str = str(e).lower()
                if "503" in err_str or "high demand" in err_str or "unavailable" in err_str:
                    logger.info(f"Model {model_name} is under high demand (503). Switching to fallback model...")
                    break

    raise RuntimeError(f"Failed to generate structured comic outline across candidate models: {last_error}")
