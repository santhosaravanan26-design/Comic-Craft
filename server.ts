import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure directories exist
const staticPanelsDir = path.join(__dirname, 'static', 'panels');
const staticExportsDir = path.join(__dirname, 'static', 'exports');
fs.mkdirSync(staticPanelsDir, { recursive: true });
fs.mkdirSync(staticExportsDir, { recursive: true });

app.use('/static', express.static(path.join(__dirname, 'static')));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DEFAULT_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';

const TEXT_MODEL_CANDIDATES = [
  DEFAULT_TEXT_MODEL,
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
];

// Helper to execute generateContent with automatic failover if a model experiences 503 high demand
async function generateContentWithFailover(
  requestedModel: string | undefined,
  contents: any,
  config: any
) {
  const modelsToTry = [
    ...(requestedModel ? [requestedModel] : []),
    ...TEXT_MODEL_CANDIDATES,
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`Calling Gemini text model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      console.warn(`Model ${model} encountered error:`, err?.status || err?.message || err);
      lastError = err;
      // If 503 (high demand), 429 (rate limit), or UNAVAILABLE, proceed to next candidate
      const isOverloaded =
        err?.status === 503 ||
        err?.code === 503 ||
        err?.status === 'UNAVAILABLE' ||
        String(err?.message || '').toLowerCase().includes('high demand') ||
        String(err?.message || '').toLowerCase().includes('unavailable');

      if (!isOverloaded && modelsToTry.indexOf(model) === 0) {
        // Continue to try fallback model even if general error
      }
    }
  }
  throw lastError || new Error('All candidate models failed');
}

// Fallback SVG Comic Generator for panels if image model is restricted or quota exceeded
function generateFallbackComicSvg(
  panelNumber: number,
  title: string,
  characterName: string,
  mood: string,
  artStyle: string,
  setting: string,
  caption: string
): string {
  const themes: Record<string, { bg1: string; bg2: string; accent: string; elements: string }> = {
    Forest: {
      bg1: '#14532d',
      bg2: '#166534',
      accent: '#86efac',
      elements: '<polygon points="50,300 120,120 190,300" fill="#15803d"/><polygon points="150,320 230,100 310,320" fill="#166534"/><polygon points="280,310 340,150 400,310" fill="#14532d"/>'
    },
    Space: {
      bg1: '#090a1f',
      bg2: '#1e1b4b',
      accent: '#c084fc',
      elements: '<circle cx="380" cy="90" r="45" fill="#e0e7ff" opacity="0.9"/><circle cx="100" cy="80" r="3" fill="#ffffff"/><circle cx="220" cy="140" r="2" fill="#ffffff"/><circle cx="310" cy="50" r="2.5" fill="#ffffff"/><ellipse cx="140" cy="220" rx="35" ry="12" fill="#a855f7" opacity="0.6"/>'
    },
    City: {
      bg1: '#1e293b',
      bg2: '#334155',
      accent: '#38bdf8',
      elements: '<rect x="40" y="120" width="70" height="230" fill="#0f172a"/><rect x="130" y="80" width="90" height="270" fill="#1e293b"/><rect x="240" y="140" width="80" height="210" fill="#0f172a"/><rect x="340" y="100" width="80" height="250" fill="#334155"/>'
    },
    School: {
      bg1: '#7c2d12',
      bg2: '#9a3412',
      accent: '#fdba74',
      elements: '<rect x="60" y="100" width="360" height="180" fill="#1e293b" rx="8"/><rect x="70" y="110" width="340" height="160" fill="#15803d" rx="4"/><line x1="80" y1="160" x2="200" y2="160" stroke="#fef08a" stroke-width="4"/>'
    },
    'Fantasy Kingdom': {
      bg1: '#4c0519',
      bg2: '#881337',
      accent: '#f43f5e',
      elements: '<polygon points="80,300 80,140 110,80 140,140 140,300" fill="#4c0519"/><polygon points="200,300 200,100 240,40 280,100 280,300" fill="#881337"/><polygon points="320,300 320,160 350,110 380,160 380,300" fill="#4c0519"/>'
    }
  };

  const currentTheme = themes[setting] || {
    bg1: '#1e1b4b',
    bg2: '#312e81',
    accent: '#fbbf24',
    elements: '<circle cx="240" cy="180" r="80" fill="#4338ca" opacity="0.6"/>'
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 340" width="100%" height="100%">
    <defs>
      <linearGradient id="grad${panelNumber}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${currentTheme.bg1}"/>
        <stop offset="100%" stop-color="${currentTheme.bg2}"/>
      </linearGradient>
      <pattern id="comicDots${panelNumber}" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="#ffffff" opacity="0.12"/>
      </pattern>
    </defs>
    <rect width="480" height="340" fill="url(#grad${panelNumber})"/>
    <rect width="480" height="340" fill="url(#comicDots${panelNumber})"/>
    ${currentTheme.elements}
    <!-- Comic Speed / Action Lines -->
    <path d="M0,0 L120,80 M480,0 L360,80 M0,340 L140,240 M480,340 L340,240" stroke="${currentTheme.accent}" stroke-width="2" stroke-dasharray="4,8" opacity="0.4"/>
    <!-- Silhouette / Comic Figure -->
    <g transform="translate(190, 110)">
      <circle cx="50" cy="35" r="28" fill="${currentTheme.accent}" stroke="#111827" stroke-width="3"/>
      <path d="M15,95 C15,65 85,65 85,95 L95,170 L5,170 Z" fill="#ffffff" stroke="#111827" stroke-width="3"/>
      <circle cx="40" cy="30" r="4" fill="#111827"/>
      <circle cx="60" cy="30" r="4" fill="#111827"/>
      <path d="M42,45 Q50,52 58,45" stroke="#111827" stroke-width="3" fill="none"/>
    </g>
    <!-- Comic Action Burst Badge -->
    <g transform="translate(16, 20)">
      <rect x="0" y="0" width="100" height="30" fill="#facc15" stroke="#111827" stroke-width="2" rx="4"/>
      <text x="50" y="20" font-family="Impact, Bangers, sans-serif" font-size="14" fill="#111827" text-anchor="middle" font-weight="bold">PANEL ${panelNumber}</text>
    </g>
    <!-- Style & Mood tag -->
    <g transform="translate(360, 20)">
      <rect x="0" y="0" width="104" height="26" fill="#111827" rx="13" opacity="0.85"/>
      <text x="52" y="17" font-family="sans-serif" font-size="11" fill="#facc15" text-anchor="middle" font-weight="bold">${mood.toUpperCase()}</text>
    </g>
    <!-- Subtitle caption banner inside artwork -->
    <rect x="16" y="278" width="448" height="46" fill="#ffffff" stroke="#111827" stroke-width="2.5" rx="4"/>
    <text x="30" y="307" font-family="'Comic Sans MS', sans-serif" font-size="13" fill="#1f2937" font-weight="bold">${characterName} in ${setting} (${artStyle})</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 1. Generate Character Profile & 5-Panel Outline
async function generateOutline(
  promptText: string,
  characterName: string,
  setting: string,
  tone: string,
  artStyle: string,
  preferredModel?: string
) {
  const prompt = `You are a legendary comic book creator and screenwriter.
Task: Create a structured 5-panel comic story outline based on the following:
- Story Prompt: "${promptText}"
- Main Character: "${characterName}"
- Setting: "${setting}"
- Tone: "${tone}"
- Art Style: "${artStyle}"

Follow the classic 5-panel narrative arc:
Panel 1: Introduction (The Hook, character introduction, daily life or starting scene)
Panel 2: Development (Inciting incident or rising action, discovery, travel)
Panel 3: Conflict / Problem (The twist, obstacle, antagonist, or immediate challenge)
Panel 4: Climax (The peak dramatic moment, face-off, realization, or courageous action)
Panel 5: Resolution (The aftermath, emotional closure, victory, punchline, or forward outlook)

Also construct a consistent character profile with:
- name: "${characterName}"
- appearance (hair, eyes, build, distinct traits)
- clothing (signature colors and costume items)
- age
- personality
- distinctive_features

Return strict JSON conforming to this schema. Exactly 5 panels.`;

  const { response, modelUsed } = await generateContentWithFailover(
    preferredModel,
    prompt,
    {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          character_profile: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              appearance: { type: Type.STRING },
              clothing: { type: Type.STRING },
              age: { type: Type.STRING },
              personality: { type: Type.STRING },
              distinctive_features: { type: Type.STRING },
            },
            required: ['name', 'appearance', 'clothing', 'personality'],
          },
          story_title: { type: Type.STRING },
          panels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                panel_number: { type: Type.INTEGER },
                title: { type: Type.STRING },
                scene_description: { type: Type.STRING },
                image_prompt: { type: Type.STRING },
                characters: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                location: { type: Type.STRING },
                mood: { type: Type.STRING },
              },
              required: ['panel_number', 'title', 'scene_description', 'image_prompt', 'characters', 'location', 'mood'],
            },
          },
        },
        required: ['character_profile', 'story_title', 'panels'],
      },
    }
  );

  const text = response.text || '{}';
  return { outline: JSON.parse(text), modelUsed };
}

// 2. Generate Detailed Story, Narration & Dialogue
async function generateStory(
  outlineData: any,
  tone: string,
  artStyle: string,
  preferredModel?: string
) {
  const prompt = `You are a master comic book letterer and writer.
Given this 5-panel comic outline and character profile:
Character Profile: ${JSON.stringify(outlineData.character_profile)}
Panels: ${JSON.stringify(outlineData.panels)}
Tone: "${tone}"
Art Style: "${artStyle}"

Generate rich comic book copy for EVERY panel (1 through 5):
1. "narration": Expressive, engaging third-person narration that sets the dramatic scene.
2. "caption": A classic comic box text (e.g. "MEANWHILE...", "MOMENTS LATER...", "WITH BATED BREATH...").
3. "dialogue": An array of spoken lines with character name and text (punchy, expressive, authentic comic speech).
4. "action_note": Brief visual cue or sound effect (e.g. "WHOOSH!", "CRACKLE!", "GASPS!").

Ensure character personality and voice are consistent across all panels.`;

  const { response, modelUsed } = await generateContentWithFailover(
    preferredModel,
    prompt,
    {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          panels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                panel_number: { type: Type.INTEGER },
                narration: { type: Type.STRING },
                caption: { type: Type.STRING },
                action_note: { type: Type.STRING },
                dialogue: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      character: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                    required: ['character', 'text'],
                  },
                },
              },
              required: ['panel_number', 'narration', 'caption', 'dialogue'],
            },
          },
        },
        required: ['panels'],
      },
    }
  );

  const text = response.text || '{}';
  return { story: JSON.parse(text), modelUsed };
}

// 3. Generate Panel Illustration (with Gemini Image model & Fallback)
async function generatePanelImage(
  panelNumber: number,
  title: string,
  imagePrompt: string,
  characterProfile: any,
  setting: string,
  mood: string,
  artStyle: string,
  caption: string
): Promise<{ imageUrl: string; generatedBy: 'gemini' | 'vector' }> {
  // Construct a consistent prompt emphasizing character continuity
  const fullPrompt = `${artStyle} comic book panel illustration. ${imagePrompt}. Main character: ${characterProfile.name} (${characterProfile.appearance}, wearing ${characterProfile.clothing}, ${characterProfile.distinctive_features}). Setting: ${setting}. Atmosphere & Mood: ${mood}. Dramatic comic book composition, vibrant colors, clear outlines, consistent character design, cinematic panel lighting, masterpiece comic art.`;

  try {
    if (apiKey) {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '4:3',
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          const base64 = part.inlineData.data;
          const dataUri = `data:${mime};base64,${base64}`;

          // Also save to disk in static/panels/
          const buffer = Buffer.from(base64, 'base64');
          const filename = `panel_${panelNumber}_${Date.now()}.png`;
          const filepath = path.join(staticPanelsDir, filename);
          fs.writeFileSync(filepath, buffer);

          return { imageUrl: dataUri, generatedBy: 'gemini' };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Panel ${panelNumber}] Gemini image generation notice:`, err?.message || err);
    // Proceed to high-fidelity vector comic illustration fallback
  }

  // Graceful fallback to styled vector comic illustration
  const fallbackSvg = generateFallbackComicSvg(
    panelNumber,
    title,
    characterProfile.name,
    mood,
    artStyle,
    setting,
    caption
  );
  return { imageUrl: fallbackSvg, generatedBy: 'vector' };
}

// REST API Endpoints

// GET /api/config
app.get('/api/config', (_req, res) => {
  res.json({
    defaultTextModel: DEFAULT_TEXT_MODEL,
    availableTextModels: [
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest (Fast & Reliable)' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (High Availability)' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Deep Reasoning)' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
    ],
    imageModel: IMAGE_MODEL,
    hasApiKey: Boolean(apiKey),
  });
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/test-image (Required by Section 13)
app.get('/api/test-image', async (_req, res) => {
  try {
    const testResult = await generatePanelImage(
      1,
      'Hero Under the Stars',
      'A brave fox holding a lantern in an enchanted forest',
      {
        name: 'Rusty',
        appearance: 'orange fur, emerald green eyes, fluffy tail',
        clothing: 'a brown leather aviator vest and blue bandana',
        distinctive_features: 'notched right ear',
      },
      'Forest',
      'Mysterious and adventurous',
      'Comic Book',
      'The journey begins...'
    );
    res.json({ success: true, result: testResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Error generating test image' });
  }
});

// POST /api/generate-comic & POST /api/generate-comic/json
app.post(['/api/generate-comic', '/api/generate-comic/json'], async (req, res) => {
  const { story_prompt, character_name, setting, tone, art_style, gemini_model } = req.body;

  if (!story_prompt || !character_name) {
    return res.status(400).json({
      error: 'story_prompt and character_name are required fields.',
    });
  }

  try {
    console.log(`Starting comic generation for character: "${character_name}", prompt: "${story_prompt.substring(0, 40)}...", model: "${gemini_model || DEFAULT_TEXT_MODEL}"`);

    // 1. Generate Outline (with failover if 503 high demand occurs)
    const { outline, modelUsed: outlineModelUsed } = await generateOutline(
      story_prompt,
      character_name,
      setting || 'Forest',
      tone || 'Adventure',
      art_style || 'Comic Book',
      gemini_model
    );

    // 2. Generate Story & Dialogues (with failover)
    const { story, modelUsed: storyModelUsed } = await generateStory(
      outline,
      tone || 'Adventure',
      art_style || 'Comic Book',
      outlineModelUsed || gemini_model
    );

    // 3. Assemble and Generate Images for all 5 panels
    const storyPanelsMap = new Map();
    (story.panels || []).forEach((p: any) => storyPanelsMap.set(p.panel_number, p));

    const finalPanels = [];
    for (let i = 0; i < (outline.panels || []).length; i++) {
      const outlinePanel = outline.panels[i];
      const storyPanel = storyPanelsMap.get(outlinePanel.panel_number) || {
        narration: outlinePanel.scene_description,
        caption: 'MOMENTS LATER...',
        dialogue: [{ character: character_name, text: 'We must press on!' }],
        action_note: 'DETERMINED'
      };

      const imageResult = await generatePanelImage(
        outlinePanel.panel_number,
        outlinePanel.title,
        outlinePanel.image_prompt,
        outline.character_profile,
        setting || outlinePanel.location,
        outlinePanel.mood,
        art_style || 'Comic Book',
        storyPanel.caption || outlinePanel.title
      );

      finalPanels.push({
        panel_number: outlinePanel.panel_number,
        title: outlinePanel.title,
        scene_description: outlinePanel.scene_description,
        image_prompt: outlinePanel.image_prompt,
        image_url: imageResult.imageUrl,
        image_source: imageResult.generatedBy,
        narration: storyPanel.narration,
        caption: storyPanel.caption,
        action_note: storyPanel.action_note || '',
        dialogue: storyPanel.dialogue || [],
        mood: outlinePanel.mood,
        location: outlinePanel.location,
        characters: outlinePanel.characters,
      });
    }

    const comicId = `comic_${Date.now()}`;
    const resultPayload = {
      comic_id: comicId,
      story_title: outline.story_title || `${character_name}'s Adventure`,
      character_profile: outline.character_profile,
      setting: setting || 'Forest',
      tone: tone || 'Adventure',
      art_style: art_style || 'Comic Book',
      panels: finalPanels,
      created_at: new Date().toISOString(),
      models_used: {
        text: storyModelUsed || outlineModelUsed || gemini_model || DEFAULT_TEXT_MODEL,
        image: IMAGE_MODEL,
      },
    };

    res.json(resultPayload);
  } catch (err: any) {
    console.error('Error generating comic:', err);
    res.status(500).json({
      error: 'Comic generation failed',
      details: err?.message || 'Internal server error',
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ComicCraft server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
