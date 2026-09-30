"""
Layout Builder module for ComicCraft.
Transforms outline, story, and image assets into a cohesive comic layout.
Section 12 Requirement.
"""

from typing import List, Dict, Any
from app.models import OutlineResponse, StoryResponse, FinalPanel, ComicResponse


def build_comic_layout(
    comic_id: str,
    outline: OutlineResponse,
    story: StoryResponse,
    image_paths: List[str],
    setting: str,
    tone: str,
    art_style: str
) -> ComicResponse:
    """
    Combines outline, story dialogue/narration, and generated image paths
    into an integrated ComicResponse layout model.
    """
    story_map = {p.panel_number: p for p in story.panels}
    final_panels: List[FinalPanel] = []

    for idx, outline_panel in enumerate(outline.panels):
        panel_num = outline_panel.panel_number
        story_panel = story_map.get(panel_num)

        image_url = image_paths[idx] if idx < len(image_paths) else ""
        narration = story_panel.narration if story_panel else outline_panel.scene_description
        caption = story_panel.caption if story_panel else f"PANEL {panel_num}"
        action_note = story_panel.action_note if story_panel else ""
        dialogue = story_panel.dialogue if story_panel else []

        final_panels.append(
            FinalPanel(
                panel_number=panel_num,
                title=outline_panel.title,
                scene_description=outline_panel.scene_description,
                image_prompt=outline_panel.image_prompt,
                image_url=image_url,
                narration=narration,
                caption=caption,
                action_note=action_note,
                dialogue=dialogue,
                mood=outline_panel.mood,
                location=outline_panel.location,
                characters=outline_panel.characters,
            )
        )

    return ComicResponse(
        comic_id=comic_id,
        story_title=outline.story_title,
        character_profile=outline.character_profile,
        setting=setting,
        tone=tone,
        art_style=art_style,
        panels=final_panels,
    )
