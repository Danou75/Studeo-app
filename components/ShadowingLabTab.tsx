import React, { useEffect, useRef, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShadowingMode, ShadowingPhase, SessionDuration } from './language-lab/hooks/useShadowingMode';
import { useTTS } from '../hooks/useTTS';
import { Tutor, SavedShadowingSession } from '../types';

// ---------------------------------------------------------------------------
// Thèmes Shadowing
// ---------------------------------------------------------------------------

const SHADOWING_THEMES = [
    { label: 'Salutations & présentations', emoji: '👋', level: 'débutant' as const,       focus: 'Intonation montante' },
    { label: 'Ma routine quotidienne',      emoji: '☀️', level: 'débutant' as const,       focus: 'Verbes réflexifs' },
    { label: 'Au café & restaurant',        emoji: '☕', level: 'débutant' as const,       focus: 'Liaisons & élision' },
    { label: 'Les émotions',                emoji: '❤️', level: 'débutant' as const,       focus: 'Accent expressif' },
    { label: 'À la maison',                 emoji: '🏠', level: 'débutant' as const,       focus: 'Articles & genre' },
    { label: 'Chez le médecin',             emoji: '🩺', level: 'débutant' as const,       focus: 'Débit lent & précis' },
    { label: 'En voyage',                   emoji: '✈️', level: 'intermédiaire' as const,  focus: 'Rythme de phrase' },
    { label: 'Faire ses courses',           emoji: '🛒', level: 'intermédiaire' as const,  focus: 'Négociation & chiffres' },
    { label: 'Le travail & bureau',         emoji: '💼', level: 'intermédiaire' as const,  focus: 'Registre formel' },
    { label: 'Parler de soi',               emoji: '🪞', level: 'intermédiaire' as const,  focus: 'Fluidité naturelle' },
    { label: 'Opinions & préférences',      emoji: '💬', level: 'intermédiaire' as const,  focus: 'Intonation interrogative' },
    { label: 'Téléphoner',                  emoji: '📞', level: 'intermédiaire' as const,  focus: 'Débit rapide' },
    { label: 'Weekend & loisirs',           emoji: '🎮', level: 'intermédiaire' as const,  focus: 'Contractions orales' },
    { label: 'Demander son chemin',         emoji: '🗺️', level: 'intermédiaire' as const,  focus: 'Directions & chiffres' },
    { label: 'Raconter une histoire',       emoji: '📖', level: 'avancé' as const,         focus: 'Cadence narrative' },
    { label: 'Débattre & argumenter',       emoji: '🗣️', level: 'avancé' as const,         focus: 'Emphase & connecteurs' },
    { label: "Parler de l'actualité",       emoji: '📰', level: 'avancé' as const,         focus: 'Registre soutenu' },
    { label: 'Exprimer des regrets',        emoji: '😔', level: 'avancé' as const,         focus: 'Conditionnel passé' },
    { label: 'Expressions idiomatiques',    emoji: '🌶️', level: 'avancé' as const,         focus: 'Rythme natif & flot' },
    { label: 'Humour & ironie',             emoji: '😄', level: 'avancé' as const,         focus: 'Prosodie affective' },
];

const LEVEL_GROUPS = ['débutant', 'intermédiaire', 'avancé'] as const;
const LEVEL_LABELS: Record<string, string> = {
    'débutant': '🌱 Débutant', 'intermédiaire': '🌿 Intermédiaire', 'avancé': '🌳 Avancé',
};

const PHASE_META: Record<ShadowingPhase, { step: number; icon: string; label: string; color: string; gradient: string }> = {
    listen:  { step: 1, icon: 'headphones',  label: 'Écoute active',    color: 'text-blue-500',   gradient: 'from-blue-500 to-cyan-500' },
    guided:  { step: 2, icon: 'eye',         label: 'Shadowing guidé',  color: 'text-primary',    gradient: 'from-primary to-indigo-500' },
    blind:   { step: 3, icon: 'eye-slash',   label: 'Shadowing aveugle',color: 'text-orange-500', gradient: 'from-orange-500 to-red-500' },
};

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// ---------------------------------------------------------------------------
// JSON utilities (outside component for type stability)
// ---------------------------------------------------------------------------

type JsonKind = 'native' | 'vocab-list' | 'flashcard' | 'generic';

function detectJsonKind(data: any): JsonKind {
    if (Array.isArray(data?.phrases) && typeof data.phrases[0]?.text === 'string') return 'native';
    if ((Array.isArray(data?.words) && data.words.length > 0) ||
        (Array.isArray(data?.expressions) && data.expressions.length > 0)) return 'vocab-list';
    const cards = Array.isArray(data) ? data : data?.cards;
    if (Array.isArray(cards) && cards?.[0]?.terms) return 'flashcard';
    return 'generic';
}

function jsonToContextText(data: any, kind: JsonKind): string {
    if (kind === 'vocab-list') {
        const lines: string[] = [];
        if (data.theme) lines.push(`# ${data.theme}\n`);
        (data.words || []).forEach((w: any) => {
            lines.push(`- **${w.word}** — ${w.translation}`);
            if (w.example) lines.push(`  *${w.example}*`);
        });
        (data.expressions || []).forEach((ex: any) => {
            lines.push(`- **${ex.expression}** — ${ex.translation}`);
            if (ex.example) lines.push(`  *${ex.example}*`);
        });
        return lines.join('\n');
    }
    if (kind === 'flashcard') {
        const arr: any[] = Array.isArray(data) ? data : (data.cards || []);
        return arr.slice(0, 120).map((c: any) => {
            const v = (Object.values(c.terms || {}) as string[]).filter(Boolean);
            return v.length >= 2 ? `- **${v[0]}** — ${v[1]}` : `- ${v.join(' ')}`;
        }).join('\n');
    }
    // Generic: walk all strings
    const strs: string[] = [];
    const walk = (o: any, d = 0) => {
        if (d > 6 || strs.length > 300) return;
        if (typeof o === 'string' && o.length > 2 && o.length < 400) strs.push(o);
        else if (Array.isArray(o)) o.forEach(v => walk(v, d + 1));
        else if (typeof o === 'object' && o) Object.values(o).forEach(v => walk(v, d + 1));
    };
    walk(data);
    return strs.map(s => `- ${s}`).join('\n');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShadowingLabTabProps {
    config: any;
    activeLang: string;
    tutor: Tutor | null;
    onSaveSession?: (session: SavedShadowingSession) => void;
    /** Quand on arrive depuis Mes Leçons: pré-charge la session */
    initialSession?: SavedShadowingSession;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const ShadowingLabTab: React.FC<ShadowingLabTabProps> = ({ config, activeLang, tutor, onSaveSession, initialSession }) => {
    // ── TTS ──────────────────────────────────────────────────────────────────
    const { availableVoices, selectedVoice, setSelectedVoice } = useTTS(activeLang, tutor?.id);
    const [showVoicePanel, setShowVoicePanel] = useState(false);

    // ── Theme/level UI ───────────────────────────────────────────────────────
    const [selectedTheme, setSelectedTheme] = useState('');
    const [customTheme, setCustomTheme]     = useState('');
    const [level, setLevel] = useState<'débutant' | 'intermédiaire' | 'avancé'>('intermédiaire');
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [sessionSaved, setSessionSaved] = useState(false);


    // ── Source mode: theme / file / transcript / json ─────────────────────────
    const [contentMode, setContentMode] = useState<'theme' | 'file' | 'transcript' | 'json'>('theme');

    // file tab
    const [fileContent, setFileContent] = useState('');
    const [filePreview, setFilePreview] = useState('');
    const [fileName, setFileName]       = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // transcript tab
    const [transcriptContent, setTranscriptContent] = useState('');

    // json tab
    const [jsonData, setJsonData]         = useState<any>(null);
    const [jsonFileName, setJsonFileName] = useState('');
    const [jsonKind, setJsonKind]         = useState<JsonKind | null>(null);
    const [jsonPreview, setJsonPreview]   = useState<string[]>([]);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

    // ── Session recordings ───────────────────────────────────────────────────
    const [sessionRecordings, setSessionRecordings] = useState<Record<string, string>>({});
    const pendingRecKeyRef = useRef<string | null>(null);

    // ── Auto-sequence ────────────────────────────────────────────────────────
    const autoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // ── Core hook ─────────────────────────────────────────────────────────────
    const shadow = useShadowingMode({ activeLang, config });

    // Auto-load a saved session when navigating from Mes Leçons
    useEffect(() => {
        if (initialSession && shadow.loadNativeSession) {
            shadow.loadNativeSession({
                theme:          initialSession.theme,
                targetLanguage: initialSession.targetLanguage,
                level:          initialSession.level,
                phrases:        initialSession.phrases,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSession?.id]);

    // ── Derived theme label ──────────────────────────────────────────────────
    const currentTheme = selectedTheme || customTheme || fileName || jsonFileName || 'Session';

    // ── Markdown parser ──────────────────────────────────────────────────────
    const parseMdContent = (raw: string): string => raw
        .replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^[\s]*[-*+]\s+/gm, '').replace(/^[\s]*\d+\.\s+/gm, '')
        .replace(/\|/g, ' ').replace(/^[-*_]{3,}$/gm, '')
        .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    // ── File import ──────────────────────────────────────────────────────────
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const raw = ev.target?.result as string;
            const parsed = parseMdContent(raw);
            setFileContent(parsed);
            setFilePreview(parsed.slice(0, 300) + (parsed.length > 300 ? '...' : ''));
            setFileName(file.name.replace(/\.(md|txt)$/i, ''));
        };
        reader.readAsText(file); e.target.value = '';
    };

    // ── JSON import ──────────────────────────────────────────────────────────
    const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                const kind = detectJsonKind(data);
                setJsonData(data); setJsonFileName(file.name.replace(/\.json$/i, '')); setJsonKind(kind);
                let items: string[] = [];
                if (kind === 'native') {
                    items = (data.phrases || []).slice(0, 4).map((p: any) => p.text);
                } else if (kind === 'vocab-list') {
                    items = [
                        ...(data.words || []).slice(0, 2).map((w: any) => w.word),
                        ...(data.expressions || []).slice(0, 2).map((x: any) => x.expression),
                    ];
                } else if (kind === 'flashcard') {
                    const c: any[] = Array.isArray(data) ? data : (data.cards || []);
                    items = c.slice(0, 4).map((x: any) => (Object.values(x.terms || {})[0] as string) || '');
                } else {
                    const s: string[] = [];
                    const w = (o: any, d = 0) => {
                        if (d > 3 || s.length > 4) return;
                        if (typeof o === 'string' && o.length > 2) s.push(o);
                        else if (Array.isArray(o)) o.forEach(x => w(x, d + 1));
                        else if (typeof o === 'object' && o) Object.values(o).forEach(x => w(x, d + 1));
                    };
                    w(data); items = s.slice(0, 4);
                }
                setJsonPreview(items.filter(Boolean));
            } catch {
                setJsonData(null); setJsonKind(null);
                setJsonPreview(['❌ Fichier JSON invalide ou corrompu']);
            }
        };
        reader.readAsText(file); e.target.value = '';
    };

    // ── sourceContext (AI generation modes) ──────────────────────────────────
    const sourceContext = contentMode === 'file' && fileContent
        ? { text: fileContent, label: fileName || 'Fichier .md' }
        : contentMode === 'transcript' && transcriptContent
        ? { text: transcriptContent, label: 'Transcript YouTube' }
        : contentMode === 'json' && jsonData && jsonKind && jsonKind !== 'native'
        ? { text: jsonToContextText(jsonData, jsonKind), label: jsonFileName || 'Fichier JSON' }
        : undefined;

    // ── canLaunch ─────────────────────────────────────────────────────────────
    const canLaunch =
        contentMode === 'theme'      ? (selectedTheme || customTheme).trim().length > 0
        : contentMode === 'file'      ? fileContent.length > 0
        : contentMode === 'transcript'? transcriptContent.trim().length > 10
        : contentMode === 'json'      ? (jsonData !== null && jsonKind !== null)
        : false;

    // ── handleLaunch ──────────────────────────────────────────────────────────
    const handleLaunch = useCallback(() => {
        if (contentMode === 'json' && jsonKind === 'native' && jsonData) {
            shadow.loadNativeSession(jsonData);
        } else {
            shadow.generate(currentTheme, level, sourceContext);
        }
    }, [contentMode, jsonKind, jsonData, currentTheme, level, sourceContext, shadow]);

    // ── TTS speakAndThen ──────────────────────────────────────────────────────
    const speakAndThen = useCallback((text: string, onDone: () => void) => {
        window.speechSynthesis.cancel();
        const clean = text.replace(/[*_#`~]/g, '').trim();
        const utt   = new SpeechSynthesisUtterance(clean);
        utt.lang    = activeLang;
        utt.rate    = 0.85;
        if (selectedVoice) utt.voice = selectedVoice;
        utt.onend   = onDone;
        window.speechSynthesis.speak(utt);
    }, [activeLang, selectedVoice]);

    // ── Clear timers + TTS ────────────────────────────────────────────────────
    const clearAutoSeq = useCallback(() => {
        autoTimersRef.current.forEach(t => clearTimeout(t));
        autoTimersRef.current = [];
        window.speechSynthesis.cancel();
    }, []);

    // ── Auto-sequence on phrase/phase change ──────────────────────────────────
    const autoKey = `${shadow.phase}-${shadow.currentIndex}`;

    useEffect(() => {
        if (!shadow.session || !shadow.currentPhrase || shadow.phaseTransition) return;
        clearAutoSeq();
        const phrase = shadow.currentPhrase;

        if (shadow.phase === 'listen') {
            const t = setTimeout(() => speakAndThen(phrase.text, () => {}), 600);
            autoTimersRef.current = [t];
        } else if (shadow.phase === 'guided') {
            const t1 = setTimeout(() => {
                speakAndThen(phrase.text, () => {
                    const t2 = setTimeout(() => {
                        speakAndThen(phrase.text, () => {
                            const t3 = setTimeout(() => shadow.startShadowRecording(), 500);
                            autoTimersRef.current.push(t3);
                        });
                    }, 1500);
                    autoTimersRef.current.push(t2);
                });
            }, 300);
            autoTimersRef.current = [t1];
        } else if (shadow.phase === 'blind') {
            const t1 = setTimeout(() => {
                speakAndThen(phrase.text, () => {
                    const t2 = setTimeout(() => shadow.startShadowRecording(), 500);
                    autoTimersRef.current.push(t2);
                });
            }, 300);
            autoTimersRef.current = [t1];
        }
        return clearAutoSeq;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoKey, shadow.phaseTransition]);

    useEffect(() => () => clearAutoSeq(), [clearAutoSeq]);

    // ── Store recordings ──────────────────────────────────────────────────────
    useEffect(() => {
        if (shadow.shadowAudioSrc && pendingRecKeyRef.current) {
            const key = pendingRecKeyRef.current;
            setSessionRecordings(prev => ({ ...prev, [key]: shadow.shadowAudioSrc! }));
            pendingRecKeyRef.current = null;
        }
    }, [shadow.shadowAudioSrc]);

    const handleNext = useCallback(() => {
        clearAutoSeq();
        if (shadow.isRecordingShadow && shadow.currentPhrase) {
            pendingRecKeyRef.current = `${shadow.phase}-${shadow.currentPhrase.id}`;
            shadow.stopShadowRecording();
        }
        shadow.goNext();
    }, [clearAutoSeq, shadow]);

    const handlePrev = useCallback(() => {
        clearAutoSeq();
        if (shadow.isRecordingShadow) shadow.stopShadowRecording();
        shadow.goPrev();
    }, [clearAutoSeq, shadow]);

    useEffect(() => {
        if (shadow.session && shadow.currentIndex === 0 && shadow.phase === 'listen') {
            shadow.startTimer();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shadow.session]);

    useEffect(() => {
        if (!shadow.session) setSessionRecordings({});
    }, [shadow.session]);

    // =========================================================================
    // SETUP SCREEN
    // =========================================================================
    if (!shadow.session) {
        const filtered = filterLevel === 'all' ? SHADOWING_THEMES : SHADOWING_THEMES.filter(t => t.level === filterLevel);

        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-8">
                {/* Header + Voice */}
                <div className="relative text-center pt-2">
                    <div className="text-5xl mb-2">🎙️</div>
                    <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">Labo Shadowing</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>Prosodie & fluidité en </span><strong>{shadow.targetLangName}</strong>
                    </p>
                    <button onClick={() => setShowVoicePanel(p => !p)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-all"
                    >
                        <i className="fas fa-microphone-alt text-primary text-[10px]" />
                        <span className="truncate max-w-[180px]">{selectedVoice?.name || 'Voix par défaut'}</span>
                        <i className={`fas fa-chevron-${showVoicePanel ? 'up' : 'down'} text-[9px] text-gray-400`} />
                    </button>
                    {showVoicePanel && <VoicePanel voices={availableVoices} selected={selectedVoice} onSelect={v => { setSelectedVoice(v); setShowVoicePanel(false); }} onClose={() => setShowVoicePanel(false)} />}
                </div>

                {/* Flow info */}
                <div className="bg-gradient-to-r from-primary/5 to-indigo-500/5 dark:from-primary/10 dark:to-indigo-500/10 rounded-2xl p-3 border border-primary/10">
                    <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">🔄 Déroulement automatique</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1"><i className="fas fa-headphones text-blue-500" /> Écoute</span>
                        <i className="fas fa-arrow-right text-gray-300 text-[9px]" />
                        <span className="flex items-center gap-1"><i className="fas fa-eye text-primary" /> Guidé (×2)</span>
                        <i className="fas fa-arrow-right text-gray-300 text-[9px]" />
                        <span className="flex items-center gap-1"><i className="fas fa-eye-slash text-orange-500" /> Aveugle</span>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">Enregistrement automatique en phases Guidé & Aveugle</p>
                </div>

                {/* Duration */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2"><i className="fas fa-clock" /> Durée</h3>
                    <div className="flex gap-2">
                        {([10, 15, 20] as SessionDuration[]).map(d => (
                            <button key={d} onClick={() => shadow.setDuration(d)}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${shadow.duration === d ? 'bg-primary text-white border-primary shadow-md' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary'}`}>
                                <div className="text-lg">{d === 10 ? '⚡' : d === 15 ? '🔥' : '🏆'}</div>
                                <div>{d} min</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Level */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2"><i className="fas fa-layer-group" /> Niveau</h3>
                    <div className="flex gap-2">
                        {LEVEL_GROUPS.map(l => (
                            <button key={l} onClick={() => { setLevel(l); setFilterLevel(l); }}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border capitalize ${level === l ? 'bg-primary text-white border-primary shadow-md' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary'}`}>
                                {LEVEL_LABELS[l]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Themes */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2"><i className="fas fa-list-ul" /> Thèmes</h3>
                        <div className="flex gap-1">
                            {['all', ...LEVEL_GROUPS].map(f => (
                                <button key={f} onClick={() => setFilterLevel(f)}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${filterLevel === f ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                                    {f === 'all' ? 'Tous' : LEVEL_LABELS[f].split(' ')[1]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {filtered.map(theme => {
                            const isSel = selectedTheme === theme.label;
                            return (
                                <button key={theme.label} onClick={() => { setSelectedTheme(theme.label); setCustomTheme(''); setLevel(theme.level); setContentMode('theme'); }}
                                    className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${isSel ? 'bg-primary text-white border-primary shadow-md scale-[1.02]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary hover:scale-[1.01]'}`}>
                                    <div className="flex items-center gap-1.5 w-full">
                                        <span className="text-base flex-shrink-0">{theme.emoji}</span>
                                        <span className="text-xs font-semibold leading-snug">{theme.label}</span>
                                    </div>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isSel ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>🎯 {theme.focus}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Source tabs ── */}
                <div>
                    {/* Tab selector */}
                    <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        {([
                            { id: 'theme',      icon: 'pen',         label: 'Thème' },
                            { id: 'file',       icon: 'file-alt',    label: 'Fichier .md' },
                            { id: 'transcript', icon: 'play-circle', label: 'Transcript' },
                            { id: 'json',       icon: 'code',        label: 'JSON' },
                        ] as const).map(tab => (
                            <button key={tab.id} onClick={() => { setContentMode(tab.id); setSelectedTheme(''); }}
                                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all ${contentMode === tab.id ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                                <i className={`fas fa-${tab.icon} text-[10px]`} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* TAB: Thème libre */}
                    {contentMode === 'theme' && (
                        <div className="space-y-2">
                            <textarea
                                value={customTheme}
                                onChange={e => { setCustomTheme(e.target.value); setSelectedTheme(''); }}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && canLaunch && handleLaunch()}
                                placeholder="Ex: La météo, Les animaux, Mon quartier..."
                                rows={customTheme.length > 50 ? 3 : 1}
                                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 resize-none"
                            />
                            <button
                                onClick={async () => {
                                    try {
                                        const text = await navigator.clipboard.readText();
                                        if (text) {
                                            setCustomTheme(text);
                                            setSelectedTheme('');
                                        }
                                    } catch (err) {
                                        console.error('Erreur lecture presse-papier', err);
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                            >
                                <i className="fas fa-clipboard" /> <span>Coller depuis le presse-papier</span>
                            </button>
                        </div>
                    )}

                    {/* TAB: Fichier .md */}
                    {contentMode === 'file' && (
                        <div>
                            <input ref={fileInputRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFileImport} />
                            {fileContent ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i className="fas fa-check-circle" /> {fileName}</span>
                                        <button onClick={() => { setFileContent(''); setFilePreview(''); setFileName(''); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors"><i className="fas fa-times" /> Retirer</button>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">{filePreview}</div>
                                </div>
                            ) : (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-all">
                                    <i className="fas fa-file-upload text-2xl" />
                                    <span className="text-sm font-medium">Importer un fichier .md ou .txt</span>
                                    <span className="text-xs">Liste d'expressions, vocabulaire, notes...</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* TAB: Transcript */}
                    {contentMode === 'transcript' && (
                        <div className="space-y-2">
                            <textarea value={transcriptContent} onChange={e => setTranscriptContent(e.target.value)}
                                placeholder={`Collez ici le transcript de votre vidéo YouTube...\n\nAstuce : sur YouTube, cliquez ⋯ sous la vidéo → "Ouvrir la transcription", puis copiez tout le texte.`}
                                rows={6} className="w-full px-4 py-3 rounded-xl border text-xs leading-relaxed focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 resize-none"
                            />
                            {transcriptContent.length > 10 && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <i className="fas fa-check-circle" /> {transcriptContent.length} caractères — prêt à générer
                                </p>
                            )}
                        </div>
                    )}

                    {/* TAB: JSON */}
                    {contentMode === 'json' && (
                        <div className="space-y-3">
                            <input ref={jsonFileInputRef} type="file" accept=".json" className="hidden" onChange={handleJsonImport} />
                            {!jsonData ? (
                                <button onClick={() => jsonFileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-all">
                                    <i className="fas fa-file-code text-2xl" />
                                    <span className="text-sm font-medium">Importer un fichier .json</span>
                                    <span className="text-xs text-center px-4">Format natif Shadowing, liste de vocabulaire, flashcards ou tout JSON</span>
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-file-code text-primary text-sm" />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 flex-1 truncate">{jsonFileName}.json</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            jsonKind === 'native'     ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : jsonKind === 'vocab-list'? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : jsonKind === 'flashcard' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                        }`}>
                                            {jsonKind === 'native' ? '✅ Format natif' : jsonKind === 'vocab-list' ? '📚 Vocabulaire' : jsonKind === 'flashcard' ? '🃏 Flashcards' : '🔍 Inconnu'}
                                        </span>
                                        <button onClick={() => { setJsonData(null); setJsonFileName(''); setJsonKind(null); setJsonPreview([]); }} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <i className="fas fa-times text-xs" />
                                        </button>
                                    </div>
                                    <div className={`rounded-xl p-3 text-xs border ${jsonKind === 'native' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-700'}`}>
                                        {jsonKind === 'native' ? (
                                            <p className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 mb-1.5"><i className="fas fa-bolt" /> Chargement direct — pas d'IA nécessaire</p>
                                        ) : (
                                            <p className="text-gray-500 dark:text-gray-400 mb-1.5">
                                                {jsonKind === 'vocab-list' ? 'Mots & expressions extraits — l\'IA générera les phrases de shadowing.'
                                                : jsonKind === 'flashcard' ? 'Cartes importées — l\'IA créera les phrases de shadowing.'
                                                : 'Format inconnu — toutes les chaînes seront passées à l\'IA.'}
                                            </p>
                                        )}
                                        {jsonPreview.filter(Boolean).map((item, i) => (
                                            <p key={i} className="text-gray-600 dark:text-gray-300 truncate">‣ {item}</p>
                                        ))}
                                        {jsonPreview.length > 0 && <p className="text-gray-400 text-[10px] mt-1">…</p>}
                                    </div>
                                    <button onClick={() => jsonFileInputRef.current?.click()} className="text-[10px] text-gray-400 hover:text-primary transition-colors flex items-center gap-1">
                                        <i className="fas fa-exchange-alt" /> Changer de fichier
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CTA */}
                <button onClick={handleLaunch} disabled={shadow.isGenerating || !canLaunch}
                    className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-3 transition-all ${!canLaunch ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-indigo-600 text-white hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]'}`}
                >
                    {shadow.isGenerating
                        ? <><i className="fas fa-spinner fa-spin" /> <span>Génération en cours...</span></>
                        : contentMode === 'json' && jsonKind === 'native'
                        ? <><i className="fas fa-bolt" /> <span>Charger directement ({shadow.duration} min)</span></>
                        : <><i className={`fas fa-${contentMode === 'file' ? 'file-alt' : contentMode === 'transcript' ? 'play-circle' : contentMode === 'json' ? 'code' : 'microphone'}`} /> <span>Lancer la session de {shadow.duration} min</span></>
                    }
                </button>
            </div>
        );
    }

    // =========================================================================
    // PHASE TRANSITION
    // =========================================================================
    if (shadow.phaseTransition) {
        const isToGuided     = shadow.phaseTransition === 'to-guided';
        const completedPhase: ShadowingPhase = isToGuided ? 'listen' : 'guided';
        const nextPhase: ShadowingPhase      = isToGuided ? 'guided' : 'blind';
        const completedMeta  = PHASE_META[completedPhase];
        const nextMeta       = PHASE_META[nextPhase];
        const phaseRecs      = shadow.sessionQueue
            .map(p => ({ phrase: p, src: sessionRecordings[`${completedPhase}-${p.id}`] }))
            .filter(r => r.src);

        return (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-8">
                <div className={`bg-gradient-to-r ${completedMeta.gradient} rounded-2xl p-5 text-white text-center`}>
                    <div className="text-4xl mb-2">✅</div>
                    <p className="font-black text-lg">Phase {completedMeta.step}/3 terminée !</p>
                    <p className="text-sm opacity-80">{completedMeta.label}</p>
                    <p className="text-xs opacity-60 mt-1">{shadow.sessionQueue.length} expressions complétées</p>
                </div>
                {phaseRecs.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2"><i className="fas fa-headphones" /> Vos enregistrements ({phaseRecs.length})</h3>
                        <div className="space-y-2">
                            {phaseRecs.map(({ phrase, src }) => (
                                <div key={phrase.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1.5">{phrase.text}</p>
                                    <audio src={src} controls className="w-full h-8" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <i className={`fas fa-${nextMeta.icon} ${nextMeta.color} text-xl`} />
                        <span className="font-bold text-gray-800 dark:text-gray-100">Phase {nextMeta.step}/3 — {nextMeta.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {nextPhase === 'guided'
                            ? 'Chaque expression sera jouée 2 fois. Répétez — enregistrement auto.'
                            : 'Expression jouée 1 fois, texte masqué. Faites confiance à votre oreille — enregistrement auto.'}
                    </p>
                </div>
                <button onClick={shadow.advancePhase}
                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 bg-gradient-to-r ${nextMeta.gradient} hover:opacity-90 active:scale-[0.98] transition-all`}>
                    <i className={`fas fa-${nextMeta.icon}`} /> Commencer — {nextMeta.label}
                </button>
                <button onClick={shadow.quitSession} className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1">
                    <i className="fas fa-times" /> Terminer ici
                </button>
            </div>
        );
    }

    // =========================================================================
    // SESSION COMPLETE
    // =========================================================================
    if (shadow.sessionComplete) {
        const guidedRecs = shadow.sessionQueue.filter(p => sessionRecordings[`guided-${p.id}`]);
        const blindRecs  = shadow.sessionQueue.filter(p => sessionRecordings[`blind-${p.id}`]);
        return (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-8">
                <div className="text-center pt-4">
                    <div className="text-6xl mb-3">🏆</div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">Session terminée !</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">"{shadow.session!.theme}"</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Expressions', value: shadow.sessionQueue.length, color: 'text-primary' },
                        { label: 'Durée', value: formatTime(shadow.elapsedSeconds), color: 'text-emerald-500' },
                        { label: 'Révisions', value: shadow.sessionQueue.filter(p => p.isRepetition).length, color: 'text-orange-500' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                            <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                            <div className="text-[10px] text-gray-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
                {guidedRecs.length > 0 && <RecordingSection title={`👁️ Guidé — ${guidedRecs.length} enregistrements`} phrases={guidedRecs} phase="guided" recordings={sessionRecordings} />}
                {blindRecs.length > 0  && <RecordingSection title={`🙈 Aveugle — ${blindRecs.length} enregistrements`} phrases={blindRecs}  phase="blind"  recordings={sessionRecordings} />}
                <button onClick={() => { shadow.quitSession(); setSessionRecordings({}); setSessionSaved(false); }}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all">
                    <i className="fas fa-redo mr-2" /> Nouvelle session
                </button>
                {onSaveSession && (
                    <button
                        disabled={sessionSaved}
                        onClick={() => {
                            const s = shadow.session!;
                            const saved: SavedShadowingSession = {
                                id: uuidv4(),
                                theme: s.theme,
                                targetLanguage: s.targetLanguage,
                                level: s.level,
                                phrases: s.phrases.map(p => ({
                                    text: p.text,
                                    translation: p.translation,
                                    phonetic: p.phonetic,
                                    priority: p.priority,
                                })),
                                phraseCount: s.phrases.length,
                                savedAt: new Date().toISOString(),
                                tutorId: tutor?.id,
                                sourceMode: contentMode,
                            };
                            onSaveSession(saved);
                            setSessionSaved(true);
                        }}
                        className={`w-full py-3 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                            sessionSaved
                                ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 cursor-default'
                                : 'border-primary text-primary hover:bg-primary/10'
                        }`}
                    >
                        {sessionSaved
                            ? <><i className="fas fa-check" /> Session sauvegardée !</>
                            : <><i className="fas fa-save" /> Sauvegarder dans Mes Leçons</>
                        }
                    </button>
                )}
            </div>
        );
    }

    // =========================================================================
    // ACTIVE SESSION
    // =========================================================================
    const phrase    = shadow.currentPhrase!;
    const total     = shadow.sessionQueue.length;
    const phaseMeta = PHASE_META[shadow.phase];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Stepper */}
            <div className="px-4 pt-3 pb-0">
                <div className="flex items-center justify-between mb-2">
                    {(['listen', 'guided', 'blind'] as ShadowingPhase[]).map((p, i) => {
                        const m = PHASE_META[p]; const isActive = shadow.phase === p; const isDone = m.step < phaseMeta.step;
                        return (
                            <React.Fragment key={p}>
                                <div className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${isActive ? m.color : isDone ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? `bg-gradient-to-br ${m.gradient} text-white shadow-md` : isDone ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                        {isDone ? <i className="fas fa-check text-[10px]" /> : <i className={`fas fa-${m.icon} text-[10px]`} />}
                                    </div>
                                </div>
                                {i < 2 && <div className={`flex-1 h-0.5 mx-1 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Timer */}
            <div className="px-4 pb-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <div className="flex items-center gap-1.5">
                        <button onClick={shadow.isTimerRunning ? shadow.pauseTimer : shadow.startTimer}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${shadow.isTimerRunning ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                            <i className={`fas fa-${shadow.isTimerRunning ? 'pause' : 'play'} text-[9px]`} />
                        </button>
                        <span className="font-mono font-bold text-sm text-gray-700 dark:text-gray-200">{formatTime(shadow.elapsedSeconds)}</span>
                        <span className="text-gray-400">/ {shadow.duration}:00</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-600 dark:text-gray-300">{shadow.currentIndex + 1} / {total}{phrase.isRepetition && <span className="ml-1 text-orange-400 text-[10px]">🔄</span>}</span>
                        <div className="relative">
                            <button onClick={() => setShowVoicePanel(p => !p)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all" title={selectedVoice?.name}>
                                <i className="fas fa-microphone-alt text-[9px]" />
                            </button>
                            {showVoicePanel && (
                                <div className="absolute right-0 top-8 z-50 w-60">
                                    <VoicePanel voices={availableVoices} selected={selectedVoice} onSelect={v => { setSelectedVoice(v); setShowVoicePanel(false); }} onClose={() => setShowVoicePanel(false)} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${phaseMeta.gradient} transition-all duration-500`} style={{ width: `${((shadow.currentIndex + 1) / total) * 100}%` }} />
                </div>
            </div>

            {/* Phrase card */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 space-y-3">
                <div className={`rounded-3xl overflow-hidden shadow-lg border ${phrase.isRepetition ? 'border-orange-300 dark:border-orange-700' : 'border-gray-100 dark:border-gray-700'}`}>
                    <div className={`bg-gradient-to-r ${phaseMeta.gradient} px-4 py-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                            <i className={`fas fa-${phaseMeta.icon}`} /> {phaseMeta.label}
                            {shadow.phase === 'guided' && <span className="text-white/60 text-xs font-normal">× 2 avec pause</span>}
                        </div>
                        {phrase.isRepetition && <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">🔄 Révision</span>}
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5">
                        <div className="text-center mb-4">
                            {shadow.phase === 'blind' ? (
                                <div className="relative py-3">
                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 blur-md select-none">{phrase.text}</p>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 px-4 py-1.5 rounded-full text-sm font-bold">👂 Fiez-vous à votre oreille</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-snug">{phrase.text}</p>
                            )}
                            {phrase.phonetic && shadow.phase !== 'blind' && <p className="text-gray-400 dark:text-gray-500 font-mono text-sm mt-1 italic">/{phrase.phonetic}/</p>}
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">{phrase.translation}</p>
                        </div>
                        {shadow.phase !== 'listen' && (
                            <div className="mt-4 flex items-center justify-center">
                                {shadow.isRecordingShadow ? (
                                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-500 px-4 py-2 rounded-full animate-pulse">
                                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                                        <span className="text-xs font-bold">Enregistrement en cours...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600 text-xs"><i className="fas fa-circle" /> En attente</div>
                                )}
                            </div>
                        )}
                        <div className="mt-3 flex justify-center">
                            <button onClick={() => speakAndThen(phrase.text, () => {})} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs hover:bg-blue-100 transition-all">
                                <i className="fas fa-redo text-[10px]" /> Rejouer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-3">
                    <button onClick={handlePrev} disabled={shadow.currentIndex === 0}
                        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        <i className="fas fa-chevron-left text-sm" /> Précédent
                    </button>
                    <button onClick={handleNext}
                        className={`flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md bg-gradient-to-r ${phaseMeta.gradient} hover:opacity-90`}>
                        {shadow.currentIndex === total - 1 ? <><i className="fas fa-flag-checkered" /> Terminer la phase</> : <>Suivant <i className="fas fa-chevron-right text-sm" /></>}
                    </button>
                </div>
                <button onClick={() => { clearAutoSeq(); if (shadow.isRecordingShadow) shadow.stopShadowRecording(); shadow.quitSession(); }}
                    className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1">
                    <i className="fas fa-times" /> Quitter la session
                </button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const VoicePanel: React.FC<{ voices: SpeechSynthesisVoice[]; selected: SpeechSynthesisVoice | null; onSelect: (v: SpeechSynthesisVoice) => void; onClose: () => void }> =
    ({ voices, selected, onSelect, onClose }) => (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Voix disponibles</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-6 h-6 flex items-center justify-center"><i className="fas fa-times text-xs" /></button>
            </div>
            <div className="max-h-52 overflow-y-auto">
                {voices.length === 0
                    ? <p className="px-3 py-4 text-xs text-gray-400 text-center">Aucune voix disponible pour cette langue</p>
                    : voices.map(v => (
                        <button key={v.name} onClick={() => onSelect(v)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-all hover:bg-gray-50 dark:hover:bg-gray-700/60 ${selected?.name === v.name ? 'bg-primary/5 dark:bg-primary/10 text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                            <i className={`fas fa-${selected?.name === v.name ? 'check-circle text-primary' : 'circle text-gray-200 dark:text-gray-600'} text-[11px] flex-shrink-0`} />
                            <span className="truncate flex-1">{v.name}</span>
                            {v.localService && <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">local</span>}
                        </button>
                    ))
                }
            </div>
        </div>
    );

const RecordingSection: React.FC<{ title: string; phrases: { id: string; text: string }[]; phase: string; recordings: Record<string, string> }> =
    ({ title, phrases, phase, recordings }) => (
        <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{title}</h3>
            <div className="space-y-2">
                {phrases.map(p => (
                    <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1.5 truncate">{p.text}</p>
                        <audio src={recordings[`${phase}-${p.id}`]} controls className="w-full h-8" />
                    </div>
                ))}
            </div>
        </div>
    );
