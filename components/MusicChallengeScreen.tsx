import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { DrawingSubmissionModal } from './DrawingSubmissionModal';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';
import { AILoader } from './AILoader';

interface MusicChallengeScreenProps {
    onBack: () => void;
}

const PianoKeyboard = ({ onKeyPress, status = {} }: { onKeyPress?: (index: number) => void, status?: Record<number, 'correct' | 'error' | 'active'> }) => {
    const { t } = useTranslation();
    const [activeKeys, setActiveKeys] = useState<number[]>([]);
    
    const notes = [
        { name: t('music.notes.do'), freq: 130.81, isBlack: false }, { name: t('music.notes.do') + '#', freq: 138.59, isBlack: true },
        { name: t('music.notes.re'), freq: 146.83, isBlack: false }, { name: t('music.notes.re') + '#', freq: 155.56, isBlack: true },
        { name: t('music.notes.mi'), freq: 164.81, isBlack: false },
        { name: t('music.notes.fa'), freq: 174.61, isBlack: false }, { name: t('music.notes.fa') + '#', freq: 185.00, isBlack: true },
        { name: t('music.notes.sol'), freq: 196.00, isBlack: false }, { name: t('music.notes.sol') + '#', freq: 207.65, isBlack: true },
        { name: t('music.notes.la'), freq: 220.00, isBlack: false }, { name: t('music.notes.la') + '#', freq: 233.08, isBlack: true },
        { name: t('music.notes.si'), freq: 246.94, isBlack: false },
        { name: t('music.notes.do'), freq: 261.63, isBlack: false }, { name: t('music.notes.do') + '#', freq: 277.18, isBlack: true },
        { name: t('music.notes.re'), freq: 293.66, isBlack: false }, { name: t('music.notes.re') + '#', freq: 311.13, isBlack: true },
        { name: t('music.notes.mi'), freq: 329.63, isBlack: false },
        { name: t('music.notes.fa'), freq: 349.23, isBlack: false }, { name: t('music.notes.fa') + '#', freq: 369.99, isBlack: true },
        { name: t('music.notes.sol'), freq: 392.00, isBlack: false }, { name: t('music.notes.sol') + '#', freq: 415.30, isBlack: true },
        { name: t('music.notes.la'), freq: 440.00, isBlack: false }, { name: t('music.notes.la') + '#', freq: 466.16, isBlack: true },
        { name: t('music.notes.si'), freq: 493.88, isBlack: false },
        { name: t('music.notes.do'), freq: 523.25, isBlack: false }, { name: t('music.notes.do') + '#', freq: 554.37, isBlack: true },
        { name: t('music.notes.re'), freq: 587.33, isBlack: false }, { name: t('music.notes.re') + '#', freq: 622.25, isBlack: true },
        { name: t('music.notes.mi'), freq: 659.25, isBlack: false },
        { name: t('music.notes.fa'), freq: 698.46, isBlack: false }, { name: t('music.notes.fa') + '#', freq: 739.99, isBlack: true },
        { name: t('music.notes.sol'), freq: 783.99, isBlack: false }, { name: t('music.notes.sol') + '#', freq: 830.61, isBlack: true },
        { name: t('music.notes.la'), freq: 880.00, isBlack: false }, { name: t('music.notes.la') + '#', freq: 932.33, isBlack: true },
        { name: t('music.notes.si'), freq: 987.77, isBlack: false },
        { name: t('music.notes.do'), freq: 1046.50, isBlack: false }
    ];

    const playSound = (freq: number) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
            setTimeout(() => audioCtx.close(), 500);
        } catch (e) {}
    };

    const handleKeyPress = (index: number, freq: number) => {
        setActiveKeys(prev => [...prev, index]);
        playSound(freq);
        if (onKeyPress) onKeyPress(index);
        setTimeout(() => setActiveKeys(prev => prev.filter(k => k !== index)), 300);
    };

    return (
        <div className="flex flex-col items-center mb-8">
            <div className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                <i className="fas fa-keyboard text-primary"></i>
                {t('music.keyboardHint')}
            </div>
            <div className="relative flex h-32 md:h-44 w-full max-w-5xl bg-black p-1 rounded-xl shadow-2xl border-4 border-gray-800 select-none">
                <div className="flex w-full h-full gap-px">
                    {notes.filter(n => !n.isBlack).map((note, i) => {
                        const originalIndex = notes.findIndex(n => n.freq === note.freq);
                        const keyStatus = status[originalIndex];
                        return (
                            <button 
                                key={i}
                                onClick={() => handleKeyPress(originalIndex, note.freq)}
                                className={`flex-1 bg-white rounded-b-sm border-x border-gray-200 cursor-pointer transition-all active:bg-gray-200 active:pt-2 flex flex-col justify-end items-center pb-2 translate-no appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 relative ${
                                    activeKeys.includes(originalIndex) || keyStatus === 'active' ? 'bg-primary/20 pt-2' : ''
                                } ${keyStatus === 'correct' ? 'bg-green-500/30' : ''} ${keyStatus === 'error' ? 'bg-red-500/30' : ''}`}
                                translate="no"
                                type="button"
                                aria-label={`Note ${note.name}`}
                            >
                                <span className="text-[10px] uppercase font-bold text-gray-400 pointer-events-none" translate="no">{note.name}</span>
                            </button>
                        );
                    })}
                </div>
                
                <div className="absolute inset-0 flex pointer-events-none px-1">
                    <div className="w-full h-full relative">
                        {notes.map((note, i) => {
                            if (!note.isBlack) return null;
                            const whiteBefore = notes.slice(0, i).filter(n => !n.isBlack).length;
                            const totalWhite = notes.filter(n => !n.isBlack).length;
                            const leftPercent = (whiteBefore / totalWhite) * 100;
                            const keyStatus = status[i];

                            return (
                                <button 
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleKeyPress(i, note.freq);
                                    }}
                                    className={`absolute top-0 w-[2.8%] h-[60%] bg-black rounded-b-md cursor-pointer pointer-events-auto shadow-lg transition-all border-x border-gray-700 active:h-[62%] appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                        activeKeys.includes(i) || keyStatus === 'active' ? 'bg-primary' : 'hover:bg-gray-900'
                                    } ${keyStatus === 'correct' ? 'bg-green-600' : ''} ${keyStatus === 'error' ? 'bg-red-600' : ''}`}
                                    style={{ left: `${leftPercent - 1.4}%` }}
                                    type="button"
                                    aria-label={`Note ${note.name}`}
                                >
                                    <div className="h-full w-full flex flex-col justify-end pb-2 items-center" translate="no">
                                        <span className="text-[8px] text-gray-500 font-bold" translate="no">#</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MusicChallengeScreen: React.FC<MusicChallengeScreenProps> = ({ onBack }) => {
    const { config } = useAIConfig();
    const { showToast } = useToast();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customChallenge, setCustomChallenge] = useState('');
    const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
    const [userSequence, setUserSequence] = useState<number[]>([]);
    const [keyStatus, setKeyStatus] = useState<Record<number, 'correct' | 'error' | 'active'>>({});
    const [isSuccess, setIsSuccess] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [aiGeneratedChallenges, setAiGeneratedChallenges] = useState<Record<string, any[]>>({});
    const [isRenewing, setIsRenewing] = useState(false);
    
    const [midiEnabled, setMidiEnabled] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ text: string, type: 'neutral' | 'success' | 'error' } | null>(null);
    const [dynamicChallengeData, setDynamicChallengeData] = useState<{ 
        playback?: number[], 
        expected: number[], 
        description?: string, 
        hint?: string,
        mode?: 'sequence' | 'collection' | 'photo'
    } | null>(null);
    const lastRootRef = React.useRef<number | null>(null);
    const handleKeyPressRef = React.useRef<((index: number) => void) | null>(null);

    // Keep the Ref up to date with the latest handleKeyPress
    useEffect(() => {
        handleKeyPressRef.current = handleKeyPress;
    });

    // MIDI Integration
    useEffect(() => {
        if (!midiEnabled) return;

        let midiAccess: any = null;

        const onMIDIMessage = (event: any) => {
            const data = event.data;
            if (data.length < 3) return;
            const status = data[0];
            const note = data[1];
            const velocity = data[2];

            // Note On message: 0x90 to 0x9F (144-159)
            if (status >= 144 && status <= 159 && velocity > 0) {
                // Mapping: MIDI 48 (C3) -> Index 0
                const index = note - 48;
                if (index >= 0 && index <= 36) {
                    playNote(index);
                    if (handleKeyPressRef.current) {
                        handleKeyPressRef.current(index);
                    }
                    
                    // Visual feedback on screen keyboard
                    setKeyStatus(prev => ({ ...prev, [index]: 'active' }));
                    setTimeout(() => {
                        setKeyStatus(prev => {
                            const newState = { ...prev };
                            if (newState[index] === 'active') {
                                delete (newState as any)[index];
                            }
                            return newState;
                        });
                    }, 200);
                }
            }
        };

        const onMIDISuccess = (access: any) => {
            midiAccess = access;
            for (const input of access.inputs.values()) {
                input.onmidimessage = onMIDIMessage;
            }
            
            access.onstatechange = (e: any) => {
                if (e.port.type === 'input' && e.port.state === 'connected') {
                    e.port.onmidimessage = onMIDIMessage;
                }
            };
        };

        const onMIDIFailure = () => {
            setFeedbackMessage({ text: t('music.midiError'), type: 'error' });
            setMidiEnabled(false);
        };

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
        } else {
            setFeedbackMessage({ text: t('music.midiNotSupported'), type: 'error' });
            setMidiEnabled(false);
        }

        return () => {
            if (midiAccess) {
                for (const input of midiAccess.inputs.values()) {
                    input.onmidimessage = null;
                }
                midiAccess.onstatechange = null;
            }
        };
    }, [midiEnabled]);

    const getNoteName = (index: number) => {
        const names = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
        return names[index % 12];
    };

    const generateCustomChallenge = async () => {
        setFeedbackMessage(null);
        
        const provider = config.provider || 'gemini';
        let apiKey = '';
        let model = '';
        let url = '';
        let headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let body: any = {};

        // Configuration selon le provider
        if (provider === 'gemini') {
            apiKey = config.geminiApiKey;
            model = config.geminiModel || 'gemini-2.5-flash';
            if (!apiKey) {
                setFeedbackMessage({ text: t('music.missingApiKey', { provider: 'Gemini' }), type: 'error' });
                return;
            }
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        } else if (provider === 'mistral') {
            apiKey = config.mistralApiKey || '';
            model = config.mistralModel || 'mistral-medium';
            if (!apiKey) {
                setFeedbackMessage({ text: t('music.missingApiKey', { provider: 'Mistral' }), type: 'error' });
                return;
            }
            url = 'https://api.mistral.ai/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider === 'openai') {
            apiKey = config.openaiApiKey || '';
            model = config.openaiModel || 'gpt-3.5-turbo';
            if (!apiKey) {
                setFeedbackMessage({ text: t('music.missingApiKey', { provider: 'OpenAI' }), type: 'error' });
                return;
            }
            url = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider === 'local') {
            url = config.localApiUrl || 'http://localhost:11434/v1/chat/completions';
            model = config.localModelName || 'llama3';
        }

        if (!customChallenge.trim()) {
            setFeedbackMessage({ text: t('music.describeChallenge'), type: 'error' });
            return;
        }

        setIsGenerating(true);
        console.log(`Starting generation with ${provider} for:`, customChallenge);
        
        try {
            const prompt = `
            Act as a music theory engine. 
            Keyboard: 37 keys (indices 0-36). 
            Important Note: Middle C (Do4) is Index 12.
            Reference Mapping:
            - Do: 0, 12, 24, 36
            - Do#: 1, 13, 25
            - Ré: 2, 14, 26
            - Ré#: 3, 15, 27
            - Mi: 4, 16, 28
            - Fa: 5, 17, 29
            - Fa#: 6, 18, 30
            - Sol: 7, 19, 31
            - Sol#: 8, 20, 32
            - La: 9, 21, 33
            - La#: 10, 22, 34
            - Si: 11, 23, 35
            
            Use European notation: Do, Ré, Mi, Fa, Sol, La, Si (NEVER use C, D, E, F, G, A, B).
            Request: "${customChallenge}"
            Generate ONLY a JSON object (no markdown, no explanations):
            {
              "expected": [indices],
              "playback": [indices],
              "hint": "short french hint using Do, Ré, Mi...",
              "mode": "sequence" or "collection"
            }
            Indices MUST be between 0 and 36 and correspond strictly to the mapping above.
            Example: For "Gamme de Ré Majeur starting at Ré4", expected would be [14, 16, 18, 19, 21, 23, 25, 26].
            CRITICAL: For scales, melodies or sequences, "expected" MUST contain the FULL sequence of notes. Never return a single note if a multiple-note exercise is requested.
            - Use "sequence" if the order of notes matters (melodies, scales).
            - Use "collection" if the user must find all occurrences of specific notes.
            `;

            if (provider === 'gemini') {
                body = { contents: [{ parts: [{ text: prompt }] }] };
            } else {
                body = {
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || `Erreur API ${provider}`);
            }

            const data = await response.json();
            let text = '';

            if (provider === 'gemini') {
                text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
                text = data.choices?.[0]?.message?.content || '';
            }
            
            if (!text) throw new Error("Réponse vide de l'IA");

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonStr);

            // Force indices to be numbers to avoid string vs number comparison issues
            if (result.expected) result.expected = result.expected.map(Number);
            if (result.playback) result.playback = result.playback.map(Number);

            if (result.expected && Array.isArray(result.expected)) {
                setDynamicChallengeData({
                    expected: result.expected,
                    playback: result.playback || result.expected,
                    hint: result.hint || result.criteria,
                    description: customChallenge,
                    mode: result.mode || 'sequence'
                });
                
                if (result.playback || result.expected) {
                    const playList = (result.playback || result.expected) as number[];
                    setTimeout(() => {
                        playList.forEach((note: number, i: number) => setTimeout(() => playNote(note), i * 400));
                    }, 500);
                }
            }

            setFeedbackMessage({ text: t('music.challengeCreated'), type: 'success' });
        } catch (error: any) {
            console.error("AI Generation Error:", error);
            setFeedbackMessage({ text: t('music.aiError', { message: error.message }), type: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };

    const renewLevelChallenges = async () => {
        setIsRenewing(true);
        setFeedbackMessage(null);
        
        const provider = config.provider || 'gemini';
        let apiKey = '';
        let model = '';
        let url = '';
        let headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let body: any = {};

        if (provider === 'gemini') {
            apiKey = config.geminiApiKey;
            model = config.geminiModel || 'gemini-2.5-flash';
            if (!apiKey) {
                setFeedbackMessage({ text: "⚠️ Clé API Gemini manquante.", type: 'error' });
                setIsRenewing(false);
                return;
            }
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        } else if (provider === 'mistral') {
            apiKey = config.mistralApiKey || '';
            model = config.mistralModel || 'mistral-medium';
            if (!apiKey) {
                setFeedbackMessage({ text: "⚠️ Clé API Mistral manquante.", type: 'error' });
                setIsRenewing(false);
                return;
            }
            url = 'https://api.mistral.ai/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider === 'openai') {
            apiKey = config.openaiApiKey || '';
            model = config.openaiModel || 'gpt-3.5-turbo';
            if (!apiKey) {
                setFeedbackMessage({ text: "⚠️ Clé API OpenAI manquante.", type: 'error' });
                setIsRenewing(false);
                return;
            }
            url = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider === 'local') {
            url = config.localApiUrl || 'http://localhost:11434/v1/chat/completions';
            model = config.localModelName || 'llama3';
        }

        try {
            const levelLabel = difficulty === 'beginner' ? t('music.difficulty.beginner') : difficulty === 'intermediate' ? t('music.difficulty.intermediate') : t('music.difficulty.advanced');
            const levelDesc = difficulty === 'beginner' ? 'notes simples, intervalles de base' : difficulty === 'intermediate' ? 'accords maj/min, gammes relatives' : 'accords de 7ème, mélodies complexes';
            
            const prompt = `
            Tu es Mélodia, prof de musique. Génère 4 défis musicaux variés pour le niveau "${levelLabel}" (${levelDesc}).
            Le clavier a 37 touches (0-36). 
            Mapping de référence :
            - Do: 0, 12 (Central), 24, 36
            - Ré: 2, 14, 26
            - Fa#: 6, 18, 30
            (suite logique chromatique)
            
            CONSIGNE IMPORTANTE : Utilise EXCLUSIVEMENT la notation européenne (Do, Ré, Mi, Fa, Sol, La, Si).
            Interdiction formelle d'utiliser C, D, E, F, G, A, B.
            
            Retourne UNIQUEMENT un tableau JSON de 4 objets:
            [
              {
                "id": "ai-${difficulty}-" + random numeric suffix,
                "title": "Titre court",
                "challenge": "Consigne précise (ex: Jouez la gamme de Ré Majeur)",
                "criteria": "Indice de Mélodia (ex: Attention au Fa# et au Do#)",
                "mode": "sequence" | "collection" | "photo",
                "expected": [indices des touches attendues entre 0 et 36],
                "playback": [indices pour l'exemple sonore]
              }
            ]
            CONSIGNE CRITIQUE : Pour les gammes, arpèges ou mélodies, "expected" DOIT contenir la séquence COMPLÈTE des notes (ex: [12, 14, 16, 17, 19, 21, 23, 24] pour une gamme).
            Ne mets aucun texte avant ou après le JSON.
            `;

            if (provider === 'gemini') {
                body = { contents: [{ parts: [{ text: prompt }] }] };
            } else {
                body = {
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error(`Erreur API ${provider}`);

            const data = await response.json();
            let text = provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.[0]?.text : data.choices?.[0]?.message?.content;
            
            if (!text) throw new Error("Pas de réponse de l'IA");

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const newChallenges = JSON.parse(jsonStr).map((c: any) => ({
                ...c,
                expected: c.expected ? c.expected.map(Number) : [],
                playback: c.playback ? c.playback.map(Number) : (c.expected ? c.expected.map(Number) : [])
            }));

            if (Array.isArray(newChallenges)) {
                setAiGeneratedChallenges(prev => ({
                    ...prev,
                    [difficulty]: newChallenges
                }));
                setSelectedId(newChallenges[0].id);
                setFeedbackMessage({ text: t('music.newChallenges'), type: 'success' });
            }

        } catch (error: any) {
            console.error("Renew Challenges Error:", error);
            setFeedbackMessage({ text: `❌ Erreur: ${error.message}`, type: 'error' });
        } finally {
            setIsRenewing(false);
        }
    };

    // Génération dynamique unifiée pour tous les exercices
    const generateChallengeData = (id: string) => {
        let newData: any = null;
        let root: number = 0;
        
        // --- CAS PARTICULIER : DÉFIS GÉNÉRÉS PAR l'IA ---
        const aiCard = (aiGeneratedChallenges[difficulty] || []).find(c => c.id === id);
        if (aiCard) {
            setDynamicChallengeData({
                expected: aiCard.expected || [],
                playback: aiCard.playback || aiCard.expected || [],
                description: aiCard.challenge,
                hint: aiCard.criteria,
                mode: aiCard.mode
            });
            
            // Auto-play si playback existe
            // Auto-play si playback existe
            if (aiCard.playback || aiCard.expected) {
                const playList = aiCard.playback || aiCard.expected;
                setTimeout(() => {
                    playList.forEach((note: number, i: number) => setTimeout(() => playNote(note), i * 400));
                }, 500);
            }
            return;
        }

        // Helper pour éviter la répétition
        const getNewRoot = (candidates: number[]) => {
            const available = lastRootRef.current ? candidates.filter(c => c !== lastRootRef.current) : candidates;
            const selected = available[Math.floor(Math.random() * available.length)];
            lastRootRef.current = selected;
            return selected;
        };

        switch (id) {
            case 'piano-collection': {
                // Trouver toutes les notes X
                const roots = [0, 2, 4, 5, 7, 9, 11]; // Notes naturelles
                root = getNewRoot(roots);
                const targetName = getNoteName(root);
                const expected = [];
                for (let i = 0; i <= 36; i++) {
                    if (i % 12 === root) expected.push(i);
                }
                newData = {
                    expected: expected,
                    description: t('music.challenges.pianoCollection.challenge').replace('la note demandée', `"${targetName}"`),
                    hint: t('music.challenges.pianoCollection.criteria').replace('les notes', `${expected.length} touches "${targetName}"`),
                    mode: 'collection' as const
                };
                break;
            }
            case 'ear-note-simple': {
                // Dictée simple 1 note
                const roots = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
                root = getNewRoot(roots);
                newData = {
                    playback: [root],
                    expected: [root],
                    description: t('music.challenges.earNoteSimple.challenge'),
                    hint: t('music.challenges.earNoteSimple.criteria'),
                    mode: 'sequence' as const
                };
                break;
            }
            case 'theory-key-simple': {
                // Tonalités simples : Sol (Fa#) ou Fa (Sib/La#)
                const keys = [
                    { name: 'Sol', expected: [6, 18], hint: '1 dièse' }, // Fa#
                    { name: 'Fa', expected: [10, 22], hint: '1 bémol' }  // Sib (La#)
                ];
                // Avoid repetition logic manually if needed, or just random
                const k = keys[Math.floor(Math.random() * keys.length)];
                newData = {
                    expected: k.expected,
                    description: t('music.challenges.theoryKeySimple.challenge').replace('la tonalité demandée', k.name + ' Majeur'),
                    hint: t('music.challenges.theoryKeySimple.criteria'),
                    mode: 'collection' as const
                };
                break;
            }
            case 'ear-chord-type': {
                const roots = [0, 2, 4, 5, 7, 9];
                root = getNewRoot(roots);
                const isMajor = Math.random() > 0.5;
                const third = isMajor ? 4 : 3;
                const playback = [root, root + third, root + 7];
                newData = {
                    playback: playback,
                    expected: playback,
                    description: t('music.challenges.earChordType.challenge'),
                    hint: t('music.challenges.earChordType.criteria'),
                    mode: 'sequence' as const
                };
                break;
            }
            case 'intervals-id': {
                // Quinte juste (7 demi-tons)
                const roots = [0, 2, 4, 5, 7, 9, 11, 12, 14];
                root = getNewRoot(roots);
                newData = {
                    expected: [root, root + 7],
                    description: t('music.challenges.intervalsId.challenge').replace('la note donnée', getNoteName(root)),
                    hint: t('music.challenges.intervalsId.criteria'),
                    mode: 'sequence' as const
                };
                break;
            }
            case 'theory-relative': {
                // Gammes mineures naturelles (La, Mi, Ré, Si) qui tiennent sur le clavier et n'ont pas trop de noires pour l'affichage
                // La mineur (0#), Mi mineur (1#), Ré mineur (1b), Si mineur (2#)
                // Mapping simplifié : Root -> Notes de la gamme
                const scales = [
                    { root: 9, name: 'La', notes: [9, 11, 12, 14, 16, 17, 19, 21] },     // La min
                    { root: 4, name: 'Mi', notes: [4, 6, 7, 9, 11, 12, 14, 16] },       // Mi min
                    { root: 2, name: 'Ré', notes: [2, 4, 5, 7, 9, 10, 12, 14] },        // Ré min
                    { root: 11, name: 'Si', notes: [11, 13, 14, 16, 18, 19, 21, 23] }   // Si min
                ];
                // Filter out last used scale if possible? reusing lastRoot for index of scales
                const scale = scales[Math.floor(Math.random() * scales.length)];
                newData = {
                    expected: scale.notes,
                    description: t('music.challenges.theoryRelative.challenge').replace('relative demandée', scale.name + ' mineur naturelle'),
                    hint: t('music.challenges.theoryRelative.criteria'),
                    mode: 'sequence' as const
                };
                break;
            }
            case 'ear-melody-3': {
                const startNotes = [12, 14, 16, 17, 19];
                root = getNewRoot(startNotes);
                // Générer une mélodie simple : Root -> +2 -> +4 (Do Re Mi) ou +4 -> +7 (Arpège)
                const patterns = [
                    [0, 2, 4], // Major 1-2-3
                    [0, 4, 7], // Major Triad
                    [0, 3, 7], // Minor Triad
                    [0, 2, 7], // 1-2-5
                    [7, 4, 0]  // 5-3-1 down
                ];
                const pat = patterns[Math.floor(Math.random() * patterns.length)];
                const playback = pat.map(interval => root + interval);
                newData = {
                    playback: playback,
                    expected: playback,
                    description: t('music.challenges.earMelody3.challenge'),
                    hint: t('music.challenges.earMelody3.criteria'),
                    mode: 'sequence' as const
                };
                break;
            }
            case 'advanced-chord': {
                // Accord de 7ème de dominante (Majeur + 7ème mineure = 0, 4, 7, 10)
                const roots = [0, 2, 5, 7, 9]; // Do, Ré, Fa, Sol, La
                root = getNewRoot(roots);
                newData = {
                    expected: [root, root + 4, root + 7, root + 10],
                    description: t('music.challenges.advancedChord.challenge').replace('demandé', `de ${getNoteName(root)} 7ème`),
                    hint: t('music.challenges.advancedChord.criteria'),
                    mode: 'sequence' as const
                };
                break;
            }
            case 'theory-key-sig': {
                // Armures : Sol (1# : Fa#), Ré (2# : Fa# Do#), La (3# : Fa# Do# Sol#), Mi (4# : Fa# Do# Sol# Ré#)
                const keys = [
                    { name: 'Sol', sharps: [6] },
                    { name: 'Ré', sharps: [6, 1] },
                    { name: 'La', sharps: [6, 1, 8] },
                    { name: 'Mi', sharps: [6, 1, 8, 3] }
                ];
                const k = keys[Math.floor(Math.random() * keys.length)];
                newData = {
                    expected: k.sharps,
                    description: t('music.challenges.theoryKeySig.challenge').replace('l\'armure demandée', `l'armure de ${k.name} Majeur`),
                    hint: t('music.challenges.theoryKeySig.criteria'),
                    mode: 'sequence' as const
                };
                break;
            }
            default:
                setDynamicChallengeData(null);
                return;
        }

        if (newData) {
            setDynamicChallengeData(newData);
            // Auto-play if playback exists
            if (newData.playback) {
                setTimeout(() => {
                    newData.playback!.forEach((note: number, i: number) => setTimeout(() => playNote(note), i * 400));
                }, 500);
            }
        }
    };

    const challengesByLevel = {
        beginner: [
            {
                id: 'piano-collection',
                title: t('music.challenges.pianoCollection.title'),
                challenge: t('music.challenges.pianoCollection.challenge'),
                criteria: t('music.challenges.pianoCollection.criteria'),
                expected: [],
                mode: 'collection'
            },
            {
                id: 'ear-note-simple',
                title: t('music.challenges.earNoteSimple.title'),
                challenge: t('music.challenges.earNoteSimple.challenge'),
                criteria: t('music.challenges.earNoteSimple.criteria'),
                mode: 'sequence',
                expected: []
            },
            {
                id: 'theory-key-simple',
                title: t('music.challenges.theoryKeySimple.title'),
                challenge: t('music.challenges.theoryKeySimple.challenge'),
                criteria: t('music.challenges.theoryKeySimple.criteria'),
                mode: 'collection',
                expected: []
            },
            {
                id: 'rhythm-simple',
                title: t('music.challenges.rhythmSimple.title'),
                challenge: t('music.challenges.rhythmSimple.challenge'),
                criteria: t('music.challenges.rhythmSimple.criteria'),
                mode: 'photo'
            }
        ],
        intermediate: [
            {
                id: 'ear-chord-type',
                title: t('music.challenges.earChordType.title'),
                challenge: t('music.challenges.earChordType.challenge'),
                criteria: t('music.challenges.earChordType.criteria'),
                mode: 'sequence',
                expected: []
            },
            {
                id: 'intervals-id',
                title: t('music.challenges.intervalsId.title'),
                challenge: t('music.challenges.intervalsId.challenge'),
                criteria: t('music.challenges.intervalsId.criteria'),
                expected: [],
                mode: 'sequence'
            },
            {
                id: 'theory-relative',
                title: t('music.challenges.theoryRelative.title'),
                challenge: t('music.challenges.theoryRelative.challenge'),
                criteria: t('music.challenges.theoryRelative.criteria'),
                expected: [],
                mode: 'sequence'
            },
            {
                id: 'notation-nuance',
                title: t('music.challenges.notationNuance.title'),
                challenge: t('music.challenges.notationNuance.challenge'),
                criteria: t('music.challenges.notationNuance.criteria'),
                mode: 'photo'
            }
        ],
        advanced: [
            {
                id: 'ear-melody-3',
                title: t('music.challenges.earMelody3.title'),
                challenge: t('music.challenges.earMelody3.challenge'),
                criteria: t('music.challenges.earMelody3.criteria'),
                mode: 'sequence',
                expected: []
            },
            {
                id: 'advanced-chord',
                title: t('music.challenges.advancedChord.title'),
                challenge: t('music.challenges.advancedChord.challenge'),
                criteria: t('music.challenges.advancedChord.criteria'),
                expected: [],
                mode: 'sequence'
            },
            {
                id: 'theory-key-sig',
                title: t('music.challenges.theoryKeySig.title'),
                challenge: t('music.challenges.theoryKeySig.challenge'),
                criteria: t('music.challenges.theoryKeySig.criteria'),
                expected: [],
                mode: 'sequence'
            }
        ]
    };

    const currentChallenges = aiGeneratedChallenges[difficulty] || challengesByLevel[difficulty];
    const [selectedId, setSelectedId] = useState<string>(currentChallenges[0].id);

    useEffect(() => {
        if (challengesByLevel[difficulty][0].id !== selectedId) {
             setSelectedId(challengesByLevel[difficulty][0].id);
        } else {
             // Force refresh if same ID but difficulty changed (edge case) or just init
             generateChallengeData(selectedId);
        }
        resetValidation();
    }, [difficulty]);

    // Hook unifié pour générer le défi
    useEffect(() => {
        generateChallengeData(selectedId);
    }, [selectedId]);

    const selectedChallenge = currentChallenges.find(c => c.id === selectedId) || { 
        id: 'custom', 
        title: t('music.freeChallengeTitle'), 
        challenge: '', 
        criteria: '', 
        mode: dynamicChallengeData?.mode || (dynamicChallengeData ? 'sequence' : 'photo'),
        expected: [] as number[], 
        playback: [] as number[] 
    };

    const resetValidation = () => {
        setUserSequence([]);
        setKeyStatus({});
        setIsSuccess(false);
        setFeedbackMessage(null);
        // Regenerate challenge data if applicable
        if ([
            'piano-collection', 'ear-note-simple', 'theory-key-simple',
            'ear-chord-type', 'intervals-id', 'theory-relative', 
            'ear-melody-3', 'advanced-chord', 'theory-key-sig'
        ].includes(selectedId)) {
            generateChallengeData(selectedId);
        }
    };

    const playNote = (index: number) => {
        const notes = [
            130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94,
            261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88,
            523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77, 1046.50
        ];
        const freq = notes[index];
        if (!freq) return;

        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.4);
            setTimeout(() => audioCtx.close(), 500);
        } catch (e) {}
    };

    const handlePlayback = () => {
        if (!(selectedChallenge as any).playback && !dynamicChallengeData?.playback) return;
        
        const playbackNotes = dynamicChallengeData?.playback || (selectedChallenge as any).playback;

        playbackNotes?.forEach((noteIndex: number, i: number) => {
            setTimeout(() => playNote(noteIndex), i * (selectedId === 'ear-chord-type' ? 400 : 500));
        });
    };

    const handleKeyPress = (index: number) => {
        if (selectedChallenge.mode === 'photo') return;
        if (isSuccess) return;

        setFeedbackMessage(null);

        const currentExpected = dynamicChallengeData?.expected || selectedChallenge.expected;

        if (selectedChallenge.mode === 'collection') {
            if (currentExpected?.includes(index)) {
                setKeyStatus(prev => ({ ...prev, [index]: 'correct' }));
                const newSequence = Array.from(new Set([...userSequence, index]));
                setUserSequence(newSequence);
                setFeedbackMessage({ text: t('music.feedback.wellDone'), type: 'success' });
                if (newSequence.length === currentExpected.length) {
                    setIsSuccess(true);
                    setFeedbackMessage({ text: "Défi validé ! Excellent.", type: 'success' });
                }
            } else {
                setKeyStatus(prev => ({ ...prev, [index]: 'error' }));
                setFeedbackMessage({ text: t('music.feedback.wrongKey'), type: 'error' });
                setTimeout(() => setKeyStatus(prev => ({ ...prev, [index]: undefined } as any)), 500);
            }
        } 
        else if (selectedChallenge.mode === 'sequence') {
            const nextExpectedIndex = currentExpected?.[userSequence.length];
            if (index === nextExpectedIndex) {
                setKeyStatus(prev => ({ ...prev, [index]: 'correct' }));
                const newSequence = [...userSequence, index];
                setUserSequence(newSequence);
                setFeedbackMessage({ text: t('music.feedback.correctContinue'), type: 'success' });
                
                if (newSequence.length === currentExpected!.length) {
                    setIsSuccess(true);
                    setFeedbackMessage({ text: "Défi validé ! Excellent.", type: 'success' });
                }
            } else {
                setKeyStatus(prev => ({ ...prev, [index]: 'error' }));
                setFeedbackMessage({ text: t('music.feedback.incorrect'), type: 'error' });
                setTimeout(() => setKeyStatus(prev => ({ ...prev, [index]: undefined } as any)), 500);
                setUserSequence([]); // Restart sequence on error
                setKeyStatus({});
            }
        }
    };

    const handleStartChallenge = () => {
        if (selectedId === 'custom') {
            if (!customChallenge.trim()) {
                showToast(t('music.customWarning'), 'warning');
                return;
            }
        }
        setIsModalOpen(true);
    };

    const getCurrentChallenge = () => {
        if (selectedId === 'custom') {
            return customChallenge || t('music.freeChallengeTitle');
        }
        return dynamicChallengeData?.description || selectedChallenge.challenge;
    };

    const getCurrentCriteria = () => {
        if (selectedId === 'custom') {
            return t('music.labels.details');
        }
        return dynamicChallengeData?.hint || selectedChallenge.criteria;
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <header className="shrink-0 pt-safe p-4 md:p-6 border-b bg-background-secondary shadow-sm relative z-10">
                <div className="max-w-4xl mx-auto w-full">
                    <Button onClick={onBack} variant="secondary" size="sm" className="mb-4">
                        <i className="fas fa-home mr-2"></i> Accueil
                    </Button>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-4xl md:text-5xl">🎹</span>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-primary">{t('music.titleMain')}</h1>
                            <p className="text-text-secondary text-sm md:text-base">{t('music.subtitleMain')}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0 bg-background/50">
                <div className="max-w-4xl mx-auto w-full pb-32">

            <div className="flex justify-center mb-4 gap-4">
                <PianoKeyboard 
                    onKeyPress={handleKeyPress} 
                    status={keyStatus}
                />
            </div>

            {/* MIDI Control */}
            <div className="flex justify-center mb-6">
                <button
                    onClick={() => setMidiEnabled(!midiEnabled)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all shadow-sm border ${
                        midiEnabled 
                        ? 'bg-green-500 text-white border-green-600 scale-105' 
                        : 'bg-background-secondary text-text-secondary border-border hover:bg-background-tertiary'
                    }`}
                >
                    <i className={`fas ${midiEnabled ? 'fa-plug-circle-check' : 'fa-plug-circle-xmark'}`}></i>
                    {midiEnabled ? t('music.midiConnected') : t('music.midiEnable')}
                </button>
            </div>

            {/* Feedback Message (Immediate) */}
            {feedbackMessage && !isSuccess && (
                <div className={`mb-4 mx-auto w-fit px-4 py-2 rounded-full font-bold text-sm animate-pulse ${
                    feedbackMessage.type === 'success' ? 'bg-green-100 text-green-700' : 
                    feedbackMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                    {feedbackMessage.type === 'success' ? <i className="fas fa-check mr-2"></i> : 
                     feedbackMessage.type === 'error' ? <i className="fas fa-times mr-2"></i> : null}
                    {feedbackMessage.text}
                </div>
            )}

            {/* Success Feedback (Final) */}
            {isSuccess && (
                <div className="mb-6 p-4 bg-green-100 border border-green-500 text-green-700 rounded-xl text-center font-bold animate-bounce shadow-lg">
                    <i className="fas fa-check-circle mr-2"></i>
                    {t('music.feedback.successMessage')}
                </div>
            )}

            {/* Level Selector */}
            <div className="flex gap-2 mb-8 bg-background-secondary p-1 rounded-xl w-fit mx-auto border border-border">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lv) => (
                    <button
                        key={lv}
                        onClick={() => {
                            setDifficulty(lv);
                            resetValidation();
                        }}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${
                            difficulty === lv 
                            ? 'bg-primary text-white shadow-md' 
                            : 'text-text-muted hover:text-text'
                        }`}
                    >
                        {lv === 'beginner' ? t('music.difficulty.beginner') : lv === 'intermediate' ? t('music.difficulty.intermediate') : t('music.difficulty.advanced')}
                    </button>
                ))}
            </div>

            {/* Instructions */}
            <div className="bg-info/10 border border-info/30 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-info mb-2 flex items-center gap-2">
                    <i className="fas fa-music"></i> {t('music.gameplay.title')}
                </h3>
                <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                    <li>{t('music.gameplay.step1')}</li>
                    <li>{t('music.gameplay.step2')}</li>
                    <li>{t('music.gameplay.step3')}</li>
                </ol>
            </div>

            {/* Challenge Selection */}
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">{t('music.title')} - {difficulty === 'beginner' ? t('music.difficulty.beginner') : difficulty === 'intermediate' ? t('music.difficulty.intermediate') : t('music.difficulty.advanced')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentChallenges.map((challenge) => (
                        <button
                            key={challenge.id}
                            onClick={() => {
                                setSelectedId(challenge.id);
                                resetValidation();
                            }}
                            className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col h-full ${
                                selectedId === challenge.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50 hover:bg-background-secondary'
                            }`}
                        >
                            <div className="text-xl font-bold mb-2">{challenge.title}</div>
                            <p className="text-sm text-text-secondary flex-1">
                                {challenge.challenge}
                            </p>
                            {challenge.mode !== 'photo' && (
                                <span className="mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit font-bold">
                                    {t('music.playableOnKeyboard')}
                                </span>
                            )}
                        </button>
                    ))}
                    
                    <button
                        onClick={renewLevelChallenges}
                        disabled={isRenewing}
                        className={`p-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 transition-all text-left flex flex-col h-full hover:border-primary hover:bg-primary/10 group ${isRenewing ? 'opacity-50 grayscale' : ''}`}
                    >
                        <div className="text-xl font-bold mb-2 flex items-center justify-between">
                            <span>{t('music.renewTitle')}</span>
                            <i className={`fas fa-sync-alt text-lg group-hover:rotate-180 transition-transform duration-500 ${isRenewing ? 'fa-spin' : ''}`}></i>
                        </div>
                        <p className="text-sm text-text-secondary flex-1">
                            {t('music.renewDesc')}
                        </p>
                    </button>

                    <button
                        onClick={() => {
                            setSelectedId('custom');
                            resetValidation();
                        }}
                        className={`p-4 rounded-xl border-2 border-dashed transition-all text-left flex flex-col h-full ${
                            selectedId === 'custom'
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 hover:bg-background-secondary'
                        }`}
                    >
                        <div className="text-xl font-bold mb-2">{t('music.freeChallengeTitle')}</div>
                        <p className="text-sm text-text-secondary flex-1">
                            {t('music.freeChallengeDesc')}
                        </p>
                    </button>
                </div>
            </div>

            {/* Selected Challenge Detail & Submission */}
            <div className="bg-background-secondary rounded-2xl p-6 border border-border shadow-sm mb-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary" translate="no">
                        <i className="fas fa-bullseye"></i>
                        {selectedId === 'custom' ? (dynamicChallengeData ? t('music.labels.generated') : t('music.labels.free')) : selectedChallenge.title}
                    </h3>
                    <div className="flex gap-2">
                        {((selectedChallenge as any).playback || dynamicChallengeData?.playback) && (
                            <Button variant="primary" size="sm" onClick={handlePlayback}>
                                <i className="fas fa-volume-up mr-2"></i>
                                {t('music.controls.listen')}
                            </Button>
                        )}
                        {selectedChallenge.mode !== 'photo' && selectedId !== 'custom' && (
                            <Button variant="secondary" size="sm" onClick={resetValidation}>
                                {t('music.controls.reset')}
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <span className="text-sm font-medium text-text-secondary">{t('music.labels.instruction')}</span>
                        <p className="text-lg text-text font-medium">{dynamicChallengeData?.description || selectedChallenge.challenge}</p>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-text-secondary">{t('music.labels.details')}</span>
                        <p className="text-text-secondary">{dynamicChallengeData?.hint || selectedChallenge.criteria}</p>
                    </div>
                </div>

                {selectedId === 'custom' && (
                    <div className="space-y-4 mb-6 border-t pt-4">
                        <textarea
                            value={customChallenge}
                            onChange={(e) => setCustomChallenge(e.target.value)}
                            placeholder={t('music.labels.placeholder')}
                            className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none"
                            rows={2}
                        />
                        {/* Local Feedback for Custom Challenge */}
                        {feedbackMessage && selectedId === 'custom' && (
                            <div className={`text-sm font-bold text-center ${
                                feedbackMessage.type === 'success' ? 'text-green-600' : 
                                feedbackMessage.type === 'error' ? 'text-red-500' : 'text-text-secondary'
                            }`}>
                                {feedbackMessage.text}
                            </div>
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button 
                                onClick={handleStartChallenge} 
                                size="md" 
                                variant="secondary"
                            >
                                <i className="fas fa-camera mr-2"></i>
                                {t('music.controls.justPhoto')}
                            </Button>
                            <Button 
                                onClick={generateCustomChallenge} 
                                size="md" 
                                variant="primary"
                                disabled={isGenerating || !customChallenge.trim()}
                            >
                                {isGenerating ? (
                                    <div className="flex items-center gap-2">
                                        <AILoader size="sm" />
                                        <span>IA travaille...</span>
                                    </div>
                                ) : (
                                    <>
                                        <i className="fas fa-magic mr-2"></i>
                                        {t('music.controls.generate')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="text-center pt-4 border-t border-border">
                    {selectedChallenge.mode === 'photo' && selectedId !== 'custom' ? (
                         <Button 
                            onClick={handleStartChallenge} 
                            size="lg" 
                            variant="primary"
                            className="px-8"
                        >
                            <i className="fas fa-camera mr-2"></i>
                            {t('music.controls.submitPhoto')}
                        </Button>
                    ) : (
                        <p className="text-sm text-text-muted italic">
                            {t('music.labels.keyboardValidation')}
                        </p>
                    )}
                </div>
            </div>
            <DrawingSubmissionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                challenge={getCurrentChallenge()}
                criteria={getCurrentCriteria()}
                apiKey={
                    config.provider === 'mistral' ? (config.mistralApiKey || '') :
                    config.provider === 'openai' ? (config.openaiApiKey || '') :
                    (config.geminiApiKey || '')
                }
                provider={config.provider}
                modelName={
                    config.provider === 'mistral' ? (config.mistralModel || 'pixtral-12b-2409') :
                    config.provider === 'openai' ? (config.openaiModel || 'gpt-4o') :
                    (config.geminiModel || 'gemini-2.5-flash')
                }
                tutorName="Mélodia"
            />
                </div>
            </div>
        </div>
    );
};
