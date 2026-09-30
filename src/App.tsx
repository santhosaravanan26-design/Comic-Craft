import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Download,
  RotateCcw,
  Dice5,
  Eye,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Share2,
  FileCode2,
  Edit3,
  Layers,
  ChevronRight,
  ChevronLeft,
  X,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';

interface CharacterProfile {
  name: string;
  appearance: string;
  clothing: string;
  age?: string;
  personality: string;
  distinctive_features?: string;
}

interface DialogueItem {
  character: string;
  text: string;
}

interface ComicPanel {
  panel_number: number;
  title: string;
  scene_description: string;
  image_prompt: string;
  image_url: string;
  image_source?: 'gemini' | 'vector';
  narration: string;
  caption: string;
  action_note?: string;
  dialogue: DialogueItem[];
  mood: string;
  location: string;
  characters: string[];
}

interface ComicData {
  comic_id: string;
  story_title: string;
  character_profile: CharacterProfile;
  setting: string;
  tone: string;
  art_style: string;
  panels: ComicPanel[];
  created_at: string;
  models_used?: {
    text: string;
    image: string;
  };
}

const PRESET_STORIES = [
  {
    label: '🦊 Forest Portal',
    prompt: 'A brave young fox named Rusty discovers a glowing ancient portal hidden inside an enchanted forest leading to a forgotten realm of starlight.',
    character: 'Rusty the Fox',
    setting: 'Forest',
    tone: 'Adventure',
    artStyle: 'Comic Book',
  },
  {
    label: '🚀 Cosmic Scavenger',
    prompt: 'A lone scavenger pilot on a derelict space freighter receives a mysterious SOS frequency originating from inside an uncharted black hole event horizon.',
    character: 'Captain Jax Nova',
    setting: 'Space',
    tone: 'Mysterious',
    artStyle: 'Anime',
  },
  {
    label: '🕵️ Neon Cyber-Detective',
    prompt: 'A cyber-augmented detective investigates an unexplained citywide blackout in the rain-slicked neon skyscrapers of Neo-Veridia.',
    character: 'Detective Silas Vance',
    setting: 'City',
    tone: 'Dramatic',
    artStyle: 'Comic Book',
  },
  {
    label: '🧙‍♂️ Magic Academy Catastrophe',
    prompt: 'An eccentric apprentice wizard accidentally swaps his potion ingredients during the high-stakes royal alchemy examination with hilarious results.',
    character: 'Pip Bumblethorn',
    setting: 'School',
    tone: 'Funny',
    artStyle: 'Cartoon',
  },
  {
    label: '👑 The Stolen Crown',
    prompt: 'A valiant knight infiltrates the sunken fortress of shadows to reclaim the sun crystal before the blood moon rises.',
    character: 'Lady Rowena',
    setting: 'Fantasy Kingdom',
    tone: 'Dramatic',
    artStyle: 'Fantasy Illustration',
  },
];

const SETTINGS = ['Forest', 'School', 'City', 'Space', 'Fantasy Kingdom', 'Custom'];
const TONES = ['Adventure', 'Funny', 'Dramatic', 'Light-hearted', 'Poetic', 'Mysterious'];
const ART_STYLES = ['Comic Book', 'Anime', 'Cartoon', 'Pixel Art', 'Realistic', 'Fantasy Illustration'];

export default function App() {
  // Form State
  const [storyPrompt, setStoryPrompt] = useState(PRESET_STORIES[0].prompt);
  const [characterName, setCharacterName] = useState(PRESET_STORIES[0].character);
  const [setting, setSetting] = useState('Forest');
  const [customSetting, setCustomSetting] = useState('');
  const [tone, setTone] = useState('Adventure');
  const [artStyle, setArtStyle] = useState('Comic Book');
  const [geminiModel, setGeminiModel] = useState('gemini-flash-latest');

  // Generator & UI State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [comicData, setComicData] = useState<ComicData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'strip' | 'reader' | 'json'>('strip');
  const [readerPanelIndex, setReaderPanelIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isEditingDialogue, setIsEditingDialogue] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Load preset helper
  const handleSelectPreset = (preset: typeof PRESET_STORIES[0]) => {
    setStoryPrompt(preset.prompt);
    setCharacterName(preset.character);
    setSetting(preset.setting);
    setTone(preset.tone);
    setArtStyle(preset.artStyle);
    setErrorMessage(null);
  };

  // Randomizer
  const handleRandomize = () => {
    const randomPreset = PRESET_STORIES[Math.floor(Math.random() * PRESET_STORIES.length)];
    handleSelectPreset(randomPreset);
  };

  // Submit and Generate Comic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyPrompt.trim() || !characterName.trim()) {
      setErrorMessage('Please provide both a Story Prompt and Main Character Name.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep(1);
    setLoadingProgress(15);

    // Progress simulation while server computes
    const timer1 = setTimeout(() => {
      setLoadingStep(2);
      setLoadingProgress(40);
    }, 2000);

    const timer2 = setTimeout(() => {
      setLoadingStep(3);
      setLoadingProgress(65);
    }, 4500);

    const timer3 = setTimeout(() => {
      setLoadingStep(4);
      setLoadingProgress(88);
    }, 7000);

    try {
      const finalSetting = setting === 'Custom' && customSetting.trim() ? customSetting.trim() : setting;

      const response = await fetch('/api/generate-comic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_prompt: storyPrompt,
          character_name: characterName,
          setting: finalSetting,
          tone: tone,
          art_style: artStyle,
          gemini_model: geminiModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Server responded with ${response.status}`);
      }

      const data: ComicData = await response.json();
      setComicData(data);
      setReaderPanelIndex(0);
      setActiveTab('strip');

      // Celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#facc15', '#ef4444', '#3b82f6', '#10b981'],
        });
      } catch (_) {}
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate comic. Please try again or check API configuration.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsLoading(false);
    }
  };

  // Dialogue live editor updater
  const handleUpdateDialogue = (panelNumber: number, dialogueIndex: number, newText: string) => {
    if (!comicData) return;
    const updatedPanels = comicData.panels.map((p) => {
      if (p.panel_number === panelNumber) {
        const updatedDialogues = [...p.dialogue];
        if (updatedDialogues[dialogueIndex]) {
          updatedDialogues[dialogueIndex] = { ...updatedDialogues[dialogueIndex], text: newText };
        }
        return { ...p, dialogue: updatedDialogues };
      }
      return p;
    });
    setComicData({ ...comicData, panels: updatedPanels });
  };

  // PDF Exporter using jsPDF
  const handleDownloadPDF = async () => {
    if (!comicData) return;
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;

      // Cover banner on Page 1
      doc.setFillColor(30, 27, 75); // Indigo-950
      doc.rect(10, 15, 190, 45, 'F');
      doc.setDrawColor(250, 204, 21); // Yellow-400
      doc.setLineWidth(1.5);
      doc.rect(12, 17, 186, 41, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(254, 240, 138); // Yellow-200
      doc.text(comicData.story_title.toUpperCase(), pageWidth / 2, 32, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(
        `Starring: ${comicData.character_profile.name}  |  Setting: ${comicData.setting}  |  Art Style: ${comicData.art_style}`,
        pageWidth / 2,
        45,
        { align: 'center' }
      );

      // Render each panel
      for (let i = 0; i < comicData.panels.length; i++) {
        const panel = comicData.panels[i];

        // Page break logic: Panels 1-2 on Page 1, 3-4 on Page 2, Panel 5 on Page 3
        if (i === 2 || i === 4) {
          doc.addPage();
        }

        const startY = i === 0 ? 68 : i === 1 ? 175 : i === 2 ? 20 : i === 3 ? 145 : 25;

        // Panel Title Header
        doc.setFillColor(254, 240, 138);
        doc.rect(10, startY, 190, 8, 'F');
        doc.setDrawColor(17, 24, 39);
        doc.setLineWidth(0.5);
        doc.rect(10, startY, 190, 8, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        doc.text(
          `PANEL ${panel.panel_number}: ${panel.title.toUpperCase()}  [${panel.mood.toUpperCase()}]`,
          14,
          startY + 5.5
        );

        const contentY = startY + 10;
        const boxWidth = 90;
        const boxHeight = 65;

        // Artwork (or placeholder box)
        let imageDrawn = false;
        if (panel.image_url && panel.image_url.startsWith('data:image/png;base64,')) {
          try {
            doc.addImage(panel.image_url, 'PNG', 10, contentY, boxWidth, boxHeight);
            imageDrawn = true;
          } catch (_) {}
        }

        if (!imageDrawn) {
          doc.setFillColor(243, 244, 246);
          doc.rect(10, contentY, boxWidth, boxHeight, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(75, 85, 99);
          doc.text(`[Panel ${panel.panel_number} Artwork]`, 10 + boxWidth / 2, contentY + boxHeight / 2 - 3, {
            align: 'center',
          });
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.text(`"${panel.title}"`, 10 + boxWidth / 2, contentY + boxHeight / 2 + 5, { align: 'center' });
        }

        // Caption & Narration box on right
        const textX = 106;
        const textWidth = 94;

        // Vintage yellow caption box
        doc.setFillColor(254, 249, 195); // Amber-100
        doc.setDrawColor(245, 158, 11);
        doc.rect(textX, contentY, textWidth, 20, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9);
        doc.text(`CAPTION: ${panel.caption}`, textX + 3, contentY + 5);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(31, 41, 55);
        const narrationLines = doc.splitTextToSize(panel.narration, textWidth - 6);
        doc.text(narrationLines.slice(0, 3), textX + 3, contentY + 11);

        // Speech Bubbles
        let dialogueY = contentY + 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(220, 38, 38);
        doc.text('DIALOGUE:', textX, dialogueY);
        dialogueY += 4;

        panel.dialogue.slice(0, 3).forEach((d) => {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(17, 24, 39);
          doc.roundedRect(textX, dialogueY, textWidth, 12, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(17, 24, 39);
          doc.text(`${d.character}:`, textX + 3, dialogueY + 4.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          const speechLines = doc.splitTextToSize(`"${d.text}"`, textWidth - 6);
          doc.text(speechLines[0] || '', textX + 3, dialogueY + 9);
          dialogueY += 13.5;
        });
      }

      doc.save(`ComicCraft_${comicData.story_title.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Keyboard navigation for Reader Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'reader' || !comicData) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setReaderPanelIndex((prev) => Math.min(prev + 1, (comicData.panels.length || 1) - 1));
      } else if (e.key === 'ArrowLeft') {
        setReaderPanelIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, comicData]);

  return (
    <div className="min-h-screen comic-dots-bg py-8 px-4 sm:px-6 lg:px-8 selection:bg-amber-400 selection:text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* COMIC MASTHEAD / HEADER */}
        <header className="relative text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-red-600 text-white font-bangers text-base sm:text-lg px-4 py-1 rounded border-2 border-black shadow-[3px_3px_0px_#000] -rotate-2">
            <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
            AI COMIC STUDIO &bull; ISSUE #1
          </div>

          <h1 className="text-5xl sm:text-7xl font-bangers tracking-wide text-slate-900 drop-shadow-[4px_4px_0px_#facc15] leading-none">
            COMICCRAFT
          </h1>

          <p className="font-comic font-bold text-lg sm:text-xl text-slate-700 max-w-2xl mx-auto">
            Turn your imagination into an authentic, AI-powered 5-panel comic story complete with structured narrative arc and character consistency.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs sm:text-sm font-semibold text-slate-600">
            <span className="bg-white px-3 py-1 rounded-full border border-black shadow-[2px_2px_0px_#000]">
              ✨ Text Model: <strong className="text-indigo-600">{geminiModel}</strong>
            </span>
            <span className="bg-white px-3 py-1 rounded-full border border-black shadow-[2px_2px_0px_#000]">
              🎨 Image Engine: <strong className="text-amber-600">gemini-3.1-flash-lite-image</strong>
            </span>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-900 shadow-[2px_2px_0px_#065f46]">
              🛡️ High-Demand Failover Guard
            </span>
          </div>
        </header>

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div className="bg-red-50 border-3 border-red-700 rounded-xl p-4 shadow-[4px_4px_0px_#991b1b] flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bangers text-lg text-red-900">GENERATION NOTICE</h4>
              <p className="font-comic text-sm text-red-800">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-700 hover:text-red-900 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* QUICK PRESETS INSPIRATION BAR */}
        <section className="bg-white border-3 border-black rounded-xl p-4 shadow-[4px_4px_0px_#000]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <span className="font-bangers text-lg tracking-wide text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-amber-500" />
              QUICK STORY INSPIRATIONS:
            </span>
            <button
              type="button"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg border border-black shadow-[2px_2px_0px_#000] transition-transform active:translate-y-0.5"
            >
              <Dice5 className="w-4 h-4" />
              Surprise Me (Roll Story)
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_STORIES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="bg-amber-50 hover:bg-amber-200 text-slate-900 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] transition-all hover:-translate-y-0.5"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* MAIN CREATOR FORM */}
        <div className="bg-white border-4 border-black rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0px_#000] relative">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Field 1: Story Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="story_prompt" className="font-bangers text-2xl tracking-wide text-slate-900">
                  1. Story Prompt <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-semibold text-slate-500">
                  {storyPrompt.length}/1500 chars
                </span>
              </div>
              <textarea
                id="story_prompt"
                value={storyPrompt}
                onChange={(e) => setStoryPrompt(e.target.value)}
                rows={3}
                required
                maxLength={1500}
                placeholder="e.g. A brave fox discovers a glowing mysterious portal hidden inside an enchanted forest leading to a forgotten realm of starlight..."
                className="w-full p-3.5 text-base sm:text-lg font-comic font-bold text-slate-900 bg-amber-50/50 border-3 border-black rounded-xl shadow-[3px_3px_0px_#000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:shadow-[5px_5px_0px_#000] transition-all placeholder:text-slate-400"
              />
              <p className="text-xs font-medium text-slate-500 mt-1">
                Describe the key adventure, quest, encounter, or mystery for your 5-panel comic strip.
              </p>
            </div>

            {/* Row 2: Character Name & Setting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="character_name" className="font-bangers text-xl tracking-wide text-slate-900 block mb-1.5">
                  2. Main Character Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="character_name"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  required
                  placeholder="e.g. Rusty the Fox"
                  className="w-full p-3 text-base font-comic font-bold text-slate-900 bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_#000] focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label htmlFor="setting" className="font-bangers text-xl tracking-wide text-slate-900 block mb-1.5">
                  3. Setting
                </label>
                <div className="space-y-2">
                  <select
                    id="setting"
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    className="w-full p-3 text-base font-comic font-bold text-slate-900 bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_#000] focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {SETTINGS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {setting === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Describe custom setting (e.g. Underwater Atlantis)"
                      value={customSetting}
                      onChange={(e) => setCustomSetting(e.target.value)}
                      className="w-full p-2.5 text-sm font-comic text-slate-900 bg-amber-50 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Tone & Art Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="tone" className="font-bangers text-xl tracking-wide text-slate-900 block mb-1.5">
                  4. Story Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full p-3 text-base font-comic font-bold text-slate-900 bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_#000] focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="art_style" className="font-bangers text-xl tracking-wide text-slate-900 block mb-1.5">
                  5. Art Style
                </label>
                <select
                  id="art_style"
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full p-3 text-base font-comic font-bold text-slate-900 bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_#000] focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {ART_STYLES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Gemini AI Model Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="gemini_model" className="font-bangers text-xl tracking-wide text-slate-900">
                  6. Gemini AI Model (Flash Type)
                </label>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-800">
                  🛡️ Auto-Failover Guard Active
                </span>
              </div>
              <select
                id="gemini_model"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full p-3 text-base font-comic font-bold text-slate-900 bg-amber-50/70 border-3 border-black rounded-xl shadow-[3px_3px_0px_#000] focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="gemini-flash-latest">
                  ⚡ Gemini Flash Latest (Default: Fast, High Throughput & Resilient)
                </option>
                <option value="gemini-3.1-flash-lite">
                  🚀 Gemini 3.1 Flash Lite (Ultra-Low Latency & High Availability)
                </option>
                <option value="gemini-3.1-pro-preview">
                  🧠 Gemini 3.1 Pro (Deep Narrative Reasoning)
                </option>
                <option value="gemini-3.8-flash">
                  ✨ Gemini 3.8 Flash (Standard)
                </option>
              </select>
              <p className="text-xs font-medium text-slate-600 mt-1">
                If any chosen model experiences a temporary 503 high-demand spike in Google AI Studio, ComicCraft automatically and seamlessly retries with fallback Flash models.
              </p>
            </div>

            {/* ACTION SUBMIT BUTTON */}
            <div className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-10 py-4 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bangers text-2xl tracking-wider rounded-xl border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:-translate-y-1 active:translate-y-1 active:shadow-[2px_2px_0px_#000] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
              >
                <Sparkles className="w-6 h-6 text-red-600 fill-red-500" />
                CREATE MY COMIC
                <Sparkles className="w-6 h-6 text-red-600 fill-red-500" />
              </button>
            </div>
          </form>

          {/* LOADING MODAL OVERLAY */}
          {isLoading && (
            <div className="absolute inset-0 bg-amber-100/95 backdrop-blur-xs rounded-2xl z-30 flex items-center justify-center p-6">
              <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-md w-full text-center shadow-[10px_10px_0px_#000] space-y-5 animate-pulse-none">
                
                <div className="w-16 h-16 mx-auto rounded-full border-6 border-slate-200 border-t-amber-500 border-r-red-500 animate-spin" />

                <div>
                  <h3 className="font-bangers text-3xl text-slate-900 tracking-wide">
                    CRAFTING YOUR COMIC...
                  </h3>
                  <p className="font-comic font-bold text-indigo-700 text-base mt-1">
                    {loadingStep === 1 && '1. Establishing character profile & continuity tokens...'}
                    {loadingStep === 2 && '2. Gemini Flash structuring 5-panel dramatic arc...'}
                    {loadingStep === 3 && '3. Writing narration captions & character dialogue...'}
                    {loadingStep === 4 && '4. Illustrating comic panels with art style matching...'}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 border-2 border-black rounded-full h-3.5 overflow-hidden shadow-[2px_2px_0px_#000]">
                  <div
                    className="bg-amber-400 h-full transition-all duration-700 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>

                <div className="text-xs text-slate-500 font-comic">
                  Panels: 1 (Hook) &bull; 2 (Rising Action) &bull; 3 (Conflict) &bull; 4 (Climax) &bull; 5 (Resolution)
                </div>
              </div>
            </div>
          )}

        </div>

        {/* COMIC PREVIEW & VIEWER SECTION */}
        {comicData && (
          <section className="space-y-6 pt-4">
            
            {/* Header Toolbar */}
            <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_#000] space-y-4">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-red-500 text-white font-bangers text-sm px-3 py-0.5 rounded border border-black shadow-[2px_2px_0px_#000]">
                      {comicData.art_style.toUpperCase()}
                    </span>
                    <span className="bg-indigo-600 text-white font-bangers text-sm px-3 py-0.5 rounded border border-black shadow-[2px_2px_0px_#000]">
                      {comicData.tone.toUpperCase()}
                    </span>
                    <span className="bg-emerald-600 text-white font-bangers text-sm px-3 py-0.5 rounded border border-black shadow-[2px_2px_0px_#000]">
                      {comicData.setting.toUpperCase()}
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-bangers text-slate-900 tracking-wide">
                    {comicData.story_title}
                  </h2>

                  <p className="font-comic font-bold text-slate-700 text-sm sm:text-base">
                    Starring <strong>{comicData.character_profile.name}</strong> &bull;{' '}
                    <span className="text-slate-500 italic">
                      {comicData.character_profile.appearance}, wearing {comicData.character_profile.clothing}
                    </span>
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bangers text-xl px-5 py-2.5 rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    {isGeneratingPdf ? 'EXPORTING PDF...' : 'DOWNLOAD COMIC PDF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setComicData(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bangers text-lg px-4 py-2.5 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    CREATE ANOTHER
                  </button>
                </div>
              </div>

              {/* View Tabs & Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-slate-200">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border-2 border-black">
                  <button
                    type="button"
                    onClick={() => setActiveTab('strip')}
                    className={`font-bangers text-sm sm:text-base px-4 py-1.5 rounded-lg transition-all ${
                      activeTab === 'strip' ? 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#000]' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Classic Comic Strip (All 5 Panels)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reader')}
                    className={`font-bangers text-sm sm:text-base px-4 py-1.5 rounded-lg transition-all ${
                      activeTab === 'reader' ? 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#000]' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Reader Slideshow Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('json')}
                    className={`font-bangers text-sm sm:text-base px-4 py-1.5 rounded-lg transition-all ${
                      activeTab === 'json' ? 'bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#000]' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    View API JSON
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingDialogue(!isEditingDialogue)}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] transition-all ${
                    isEditingDialogue ? 'bg-red-500 text-white' : 'bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingDialogue ? 'Done Editing Speech' : 'Edit Character Speech'}
                </button>
              </div>
            </div>

            {/* TAB 1: 5-PANEL STRIP VIEW */}
            {activeTab === 'strip' && (
              <div className="space-y-8">
                {comicData.panels.map((panel) => (
                  <article
                    key={panel.panel_number}
                    className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0px_#000] transition-all hover:shadow-[10px_10px_0px_#000]"
                  >
                    {/* Panel Header Banner */}
                    <div className="bg-slate-100 border-b-3 border-black p-3.5 px-5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-amber-400 font-bangers text-lg text-slate-950 px-3 py-0.5 rounded border-2 border-black shadow-[2px_2px_0px_#000]">
                          PANEL {panel.panel_number}
                        </span>
                        <h3 className="font-bangers text-xl sm:text-2xl text-slate-900 tracking-wide">
                          {panel.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {panel.action_note && (
                          <span className="font-bangers text-xs sm:text-sm bg-red-100 text-red-700 px-2.5 py-1 rounded border border-red-900 font-bold">
                            💥 {panel.action_note}
                          </span>
                        )}
                        <span className="bg-slate-900 text-amber-300 font-bold text-xs px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {panel.mood}
                        </span>
                      </div>
                    </div>

                    {/* Panel Content Grid (Art + Story) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                      
                      {/* Artwork Column (7 cols) */}
                      <div className="lg:col-span-7 bg-slate-950 relative border-b-3 lg:border-b-0 lg:border-r-3 border-black flex items-center justify-center overflow-hidden min-h-[320px] max-h-[480px]">
                        {panel.image_url ? (
                          <div
                            className="relative w-full h-full cursor-pointer group"
                            onClick={() => setLightboxImage(panel.image_url)}
                          >
                            <img
                              src={panel.image_url}
                              alt={`Panel ${panel.panel_number}: ${panel.title}`}
                              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> Click to enlarge
                            </div>
                          </div>
                        ) : (
                          <div className="p-12 text-center text-slate-400 font-comic">
                            Visual Illustration Frame
                          </div>
                        )}
                      </div>

                      {/* Story, Captions & Dialogue Column (5 cols) */}
                      <div className="lg:col-span-5 p-5 sm:p-6 bg-white space-y-4 flex flex-col justify-between">
                        
                        <div className="space-y-3.5">
                          {/* Vintage Comic Caption Box */}
                          {panel.caption && (
                            <div className="bg-amber-100 border-2.5 border-black rounded-lg p-3 shadow-[3px_3px_0px_#000]">
                              <span className="font-bangers tracking-wider text-amber-800 text-xs sm:text-sm block">
                                CAPTION:
                              </span>
                              <p className="font-comic font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                {panel.caption}
                              </p>
                            </div>
                          )}

                          {/* Atmospheric Narration */}
                          {panel.narration && (
                            <p className="font-comic text-slate-800 text-sm sm:text-base leading-relaxed">
                              {panel.narration}
                            </p>
                          )}

                          {/* Dialogue Balloons */}
                          {panel.dialogue && panel.dialogue.length > 0 && (
                            <div className="space-y-2.5 pt-2">
                              {panel.dialogue.map((d, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="bg-white border-2.5 border-black rounded-2xl p-3 shadow-[3px_3px_0px_#000] relative"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bangers tracking-wide text-xs text-red-600">
                                      {d.character} SPEAKS:
                                    </span>
                                  </div>

                                  {isEditingDialogue ? (
                                    <input
                                      type="text"
                                      value={d.text}
                                      onChange={(e) =>
                                        handleUpdateDialogue(panel.panel_number, dIdx, e.target.value)
                                      }
                                      className="w-full p-1.5 font-comic text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  ) : (
                                    <p className="font-comic font-bold text-slate-900 text-sm sm:text-base">
                                      "{d.text}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Scene metadata footnote */}
                        <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 font-comic">
                          <strong>Scene Direction:</strong> {panel.scene_description}
                        </div>

                      </div>

                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* TAB 2: READER MODE SLIDESHOW */}
            {activeTab === 'reader' && (
              <div className="bg-slate-900 border-4 border-black rounded-2xl p-4 sm:p-8 shadow-[8px_8px_0px_#000] text-white space-y-6">
                
                {/* Slideshow Progress Bar */}
                <div className="flex items-center justify-between text-sm font-bangers tracking-wider text-amber-400">
                  <span>
                    PANEL {comicData.panels[readerPanelIndex].panel_number} OF {comicData.panels.length}
                  </span>
                  <span>
                    {comicData.panels[readerPanelIndex].title.toUpperCase()}
                  </span>
                </div>

                {/* Main Large Artwork */}
                <div className="relative rounded-xl overflow-hidden border-3 border-amber-400 shadow-[6px_6px_0px_#000] max-h-[560px] bg-black flex items-center justify-center">
                  <img
                    src={comicData.panels[readerPanelIndex].image_url}
                    alt={comicData.panels[readerPanelIndex].title}
                    className="w-full h-full object-contain max-h-[560px]"
                  />

                  {/* On-screen caption overlay */}
                  <div className="absolute top-4 left-4 max-w-md bg-amber-200 text-slate-950 border-2 border-black p-3 rounded-lg shadow-[3px_3px_0px_#000] font-comic font-bold text-sm">
                    {comicData.panels[readerPanelIndex].caption}
                  </div>
                </div>

                {/* Slideshow Narration & Dialogue Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4 space-y-2">
                    <span className="font-bangers text-amber-400 text-base">NARRATION</span>
                    <p className="font-comic text-slate-200 text-base leading-relaxed">
                      {comicData.panels[readerPanelIndex].narration}
                    </p>
                  </div>

                  <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4 space-y-2">
                    <span className="font-bangers text-red-400 text-base">DIALOGUE</span>
                    <div className="space-y-2">
                      {comicData.panels[readerPanelIndex].dialogue.map((d, i) => (
                        <div key={i} className="bg-white text-slate-900 p-2.5 rounded-lg font-comic font-bold text-sm">
                          <span className="text-red-600">{d.character}:</span> "{d.text}"
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Slideshow Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={readerPanelIndex === 0}
                    onClick={() => setReaderPanelIndex((prev) => Math.max(prev - 1, 0))}
                    className="inline-flex items-center gap-1 font-bangers text-lg bg-amber-400 disabled:opacity-40 text-black px-5 py-2 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" /> Previous Panel
                  </button>

                  <div className="flex gap-2">
                    {comicData.panels.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setReaderPanelIndex(idx)}
                        className={`w-4 h-4 rounded-full border-2 border-black transition-all ${
                          readerPanelIndex === idx ? 'bg-amber-400 scale-125' : 'bg-slate-700 hover:bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={readerPanelIndex === comicData.panels.length - 1}
                    onClick={() => setReaderPanelIndex((prev) => Math.min(prev + 1, comicData.panels.length - 1))}
                    className="inline-flex items-center gap-1 font-bangers text-lg bg-amber-400 disabled:opacity-40 text-black px-5 py-2 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next Panel <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

              </div>
            )}

            {/* TAB 3: JSON VIEW */}
            {activeTab === 'json' && (
              <div className="bg-slate-900 border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_#000] text-emerald-400 font-mono text-xs overflow-x-auto space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700 text-slate-400">
                  <span>Structured ComicResponse Schema (Matches FastAPI /generate-comic/json)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(comicData, null, 2));
                    }}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded border border-slate-600"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="max-h-[500px] overflow-y-auto">
                  {JSON.stringify(comicData, null, 2)}
                </pre>
              </div>
            )}

          </section>
        )}

        {/* LIGHTBOX MODAL */}
        {lightboxImage && (
          <div
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-black border-4 border-amber-400 rounded-xl overflow-hidden shadow-[8px_8px_0px_#000]">
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 bg-red-600 text-white rounded-full p-1.5 border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-red-500"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={lightboxImage}
                alt="Enlarged Comic Art"
                className="w-full h-full object-contain max-h-[85vh]"
              />
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="text-center font-comic font-bold text-xs sm:text-sm text-slate-600 py-6 border-t-2 border-black/20 space-y-1">
          <p>ComicCraft &bull; AI Comic Story Creator &bull; Powered by Google Gemini API</p>
          <p className="text-slate-500 font-normal">
            Models: Gemini 3.8 Flash (Narrative Outline & Dialogue) & Gemini 3.1 Flash Image (Panel Artwork)
          </p>
        </footer>

      </div>
    </div>
  );
}
