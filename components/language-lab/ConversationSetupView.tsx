/**
 * ConversationSetupView.tsx — Sélection du thème de causerie + modal thème personnalisé.
 * Extrait de ConversationModeView pour le mode `conversation_select`.
 */
import React from 'react';

const CONVERSATION_THEMES = [
    { id: 'travel',  emoji: '✈️', label: 'Voyages & découvertes', desc: 'Destinations, cultures, expériences...' },
    { id: 'cinema',  emoji: '🎬', label: 'Cinéma & Séries',       desc: 'Films, séries, acteurs préférés...' },
    { id: 'food',    emoji: '🍽️', label: 'Gastronomie',           desc: 'Plats, restaurants, recettes...' },
    { id: 'work',    emoji: '💼', label: 'Travail & Ambitions',    desc: 'Carrière, projets, rêves...' },
    { id: 'culture', emoji: '🎨', label: 'Culture & Art',          desc: 'Musique, livres, expositions...' },
    { id: 'sport',   emoji: '⚽', label: 'Sport & Loisirs',        desc: 'Pratiques sportives, bien-être...' },
    { id: 'tech',    emoji: '💻', label: 'Technologie',            desc: 'IA, réseaux sociaux, gadgets...' },
    { id: 'nature',  emoji: '🌿', label: 'Nature & Planète',       desc: 'Écologie, animaux, environnement...' },
];

export interface ConversationSetupViewProps {
    userWeaknesses:         string[];
    convRateLimitSeconds:   number;
    convTimerMinutes:       number;
    setConvTimerMinutes:    (v: number) => void;
    startConversation:      (theme: string, themeLabel: string) => void;
    showCustomConvModal:    boolean;
    setShowCustomConvModal: (b: boolean) => void;
    customConvTopic:        string;
    setCustomConvTopic:     (v: string) => void;
}

export const ConversationSetupView: React.FC<ConversationSetupViewProps> = ({
    userWeaknesses,
    convRateLimitSeconds,
    convTimerMinutes,
    setConvTimerMinutes,
    startConversation,
    showCustomConvModal,
    setShowCustomConvModal,
    customConvTopic,
    setCustomConvTopic,
}) => (
    <>
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                    <div className="text-5xl mb-3">🗣️</div>
                    <h2 className="text-xl font-bold text-text">Causerie guidée</h2>
                    <p className="text-sm text-text-muted mt-1">L'IA lance la conversation. Réponds librement et sois corrigé en temps réel.</p>
                </div>

                {/* Memory Badge */}
                {userWeaknesses.length > 0 && (
                    <div className="mb-4 flex flex-col items-center animate-fade-in-up">
                        <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary rounded-xl px-4 py-2 inline-flex items-center gap-2">
                            <i className="fas fa-brain text-primary" />
                            <p className="text-xs text-primary dark:text-primary">
                                L'IA se souvient de tes faiblesses précédentes et va t'aider à t'améliorer.
                            </p>
                        </div>
                    </div>
                )}

                {/* Timer Selection */}
                <div className="mb-6 flex flex-col items-center animate-fade-in-up">
                    <label className="text-sm font-bold text-text-muted uppercase tracking-wide mb-2 opacity-80 flex items-center gap-2">
                        <i className="fas fa-stopwatch" /> Durée de la session
                    </label>
                    <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                        {[{ v: 0, label: 'Infini' }, { v: 3, label: '3 min (Sprint)' }, { v: 5, label: '5 min' }].map(({ v, label }) => (
                            <button
                                key={v}
                                onClick={() => setConvTimerMinutes(v)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${convTimerMinutes === v ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >{label}</button>
                        ))}
                    </div>
                </div>

                {/* Rate-limit warning */}
                {convRateLimitSeconds > 0 && (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 mb-1 animate-fade-in">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
                            <i className="fas fa-clock text-amber-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Quota API temporairement atteint</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">Réessaie dans <span className="font-mono font-bold">{convRateLimitSeconds}s</span> — ou change de modèle dans les paramètres ⚙️</p>
                        </div>
                    </div>
                )}

                {/* Theme Grid */}
                <div className={`grid grid-cols-2 gap-3 mb-4 transition-opacity ${convRateLimitSeconds > 0 ? 'opacity-40 pointer-events-none' : ''}`}>
                    {CONVERSATION_THEMES.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => startConversation(theme.label, theme.label)}
                            disabled={convRateLimitSeconds > 0}
                            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all hover:scale-[1.02] flex flex-col items-start gap-2 text-left group disabled:cursor-not-allowed"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">{theme.emoji}</span>
                            <div>
                                <span className="font-semibold text-text dark:text-white text-sm block">{theme.label}</span>
                                <span className="text-xs text-text-muted">{theme.desc}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Custom topic button */}
                <button
                    onClick={() => setShowCustomConvModal(true)}
                    disabled={convRateLimitSeconds > 0}
                    className="w-full bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border border-primary/20 transition-all hover:scale-[1.01] hover:shadow-md flex items-center gap-4 group disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                >
                    <span className="text-3xl group-hover:rotate-12 transition-transform">✨</span>
                    <div className="text-left">
                        <span className="font-bold text-primary block">Thème personnalisé</span>
                        <span className="text-xs text-text-muted">Propose ton propre sujet de conversation</span>
                    </div>
                </button>
            </div>
        </div>

        {/* Custom topic modal */}
        {showCustomConvModal && (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-scale-in">
                    <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">🗣️ Thème personnalisé</h3>
                    <textarea
                        value={customConvTopic}
                        onChange={e => setCustomConvTopic(e.target.value)}
                        placeholder="Ex: Mon dernier voyage, Les séries Netflix, Mon travail..."
                        className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4 text-text focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                        autoFocus
                    />
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowCustomConvModal(false)} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">Annuler</button>
                        <button
                            onClick={() => {
                                if (customConvTopic.trim()) {
                                    startConversation(customConvTopic, customConvTopic);
                                    setShowCustomConvModal(false);
                                    setCustomConvTopic('');
                                }
                            }}
                            disabled={!customConvTopic.trim()}
                            className="px-6 py-2 rounded-lg bg-primary text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                        >
                            C'est parti !
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
);
