import React, { useState } from 'react';
import { Button } from './ui/Button';
import { DrawingSubmissionModal } from './DrawingSubmissionModal';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';

interface DrawingChallengeScreenProps {
    onBack: () => void;
}

export const DrawingChallengeScreen: React.FC<DrawingChallengeScreenProps> = ({ onBack }) => {
    const { config } = useAIConfig();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customChallenge, setCustomChallenge] = useState('');
    const [customCriteria, setCustomCriteria] = useState('');
    const [aiGeneratedChallenges, setAiGeneratedChallenges] = useState<any[]>([]);
    const [isRenewing, setIsRenewing] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ text: string, type: 'success' | 'error' | 'neutral' } | null>(null);
    
    // Défis prédéfinis
    const predefinedChallenges = [
        {
            id: 'cube-perspective',
            title: '🧊 Cube en perspective',
            challenge: 'Dessinez un cube en perspective à un point de fuite',
            criteria: 'Les arêtes verticales doivent être parallèles. Les lignes horizontales convergent vers un point de fuite unique.'
        },
        {
            id: 'cylinder',
            title: '🥫 Cylindre',
            challenge: 'Dessinez un cylindre avec ses ombres',
            criteria: 'Les ellipses du haut et du bas doivent être cohérentes. L\'ombre portée suit la forme cylindrique.'
        },
        {
            id: 'portrait',
            title: '👤 Proportions du visage',
            challenge: 'Dessinez un visage en respectant les proportions classiques',
            criteria: 'Les yeux sont à mi-hauteur. La bouche est à mi-distance entre le nez et le menton.'
        },
        {
            id: 'hand',
            title: '✋ Main',
            challenge: 'Dessinez une main dans une pose naturelle',
            criteria: 'Les proportions des doigts sont respectées. Les articulations sont visibles.'
        },
        {
            id: 'landscape',
            title: '🏔️ Paysage avec profondeur',
            challenge: 'Dessinez un paysage avec premier plan, second plan et arrière-plan',
            criteria: 'La perspective atmosphérique est visible (éléments lointains plus pâles). Les tailles relatives créent la profondeur.'
        },
        {
            id: 'custom',
            title: '✏️ Défi personnalisé',
            challenge: '',
            criteria: ''
        }
    ];

    const currentChallenges = [...aiGeneratedChallenges, ...predefinedChallenges];
    const [selectedChallenge, setSelectedChallenge] = useState(currentChallenges[0]);

    const handleStartChallenge = () => {
        if (selectedChallenge.id === 'custom') {
            if (!customChallenge.trim()) {
                showToast('Veuillez entrer un défi personnalisé', 'warning');
                return;
            }
        }
        setIsModalOpen(true);
    };

    const getCurrentChallenge = () => {
        if (selectedChallenge.id === 'custom') {
            return customChallenge || 'Défi personnalisé';
        }
        return selectedChallenge.challenge;
    };

    const getCurrentCriteria = () => {
        if (selectedChallenge.id === 'custom') {
            return customCriteria || 'Critères personnalisés';
        }
        return selectedChallenge.criteria;
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
            const prompt = `
            Tu es Maître Léonard, génie de la Renaissance et prof de dessin. Génère 3 nouveaux défis de dessin stimulants.
            
            Retourne UNIQUEMENT un tableau JSON de 3 objets:
            [
              {
                "id": "ai-draw-" + random suffix,
                "title": "🎨 Titre du défi",
                "challenge": "Consigne de dessin précise",
                "criteria": "Critères d'évaluation détaillés"
              }
            ]
            Ne mets aucun texte avant ou après le JSON.
            `;

            if (provider === 'gemini') {
                body = { contents: [{ parts: [{ text: prompt }] }] };
            } else {
                body = {
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.8
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
            const newChallenges = JSON.parse(jsonStr);

            if (Array.isArray(newChallenges)) {
                setAiGeneratedChallenges(newChallenges);
                setSelectedChallenge(newChallenges[0]);
                setFeedbackMessage({ text: "✨ Maître Léonard a de nouvelles idées pour vous !", type: 'success' });
            }

        } catch (error: any) {
            console.error("Renew Drawing Challenges Error:", error);
            setFeedbackMessage({ text: `❌ Erreur: ${error.message}`, type: 'error' });
        } finally {
            setIsRenewing(false);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Header Redesign */}
            <header className="shrink-0 pt-safe p-4 md:p-6 border-b bg-background-secondary shadow-sm relative z-10">
                <div className="max-w-4xl mx-auto w-full">
                    <Button onClick={onBack} variant="secondary" size="sm" className="mb-4">
                        <i className="fas fa-home mr-2"></i> Accueil
                    </Button>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-4xl md:text-5xl">🎨</span>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-primary">Atelier de Dessin</h1>
                            <p className="text-text-secondary text-sm md:text-base">Avec Maître Léonard</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0 bg-background/50">
                <div className="max-w-4xl mx-auto w-full pb-32">

            {/* AI Feedback */}
            {feedbackMessage && (
                <div className={`mb-4 mx-auto w-fit px-4 py-2 rounded-full font-bold text-sm animate-pulse ${
                    feedbackMessage.type === 'success' ? 'bg-green-100 text-green-700' : 
                    feedbackMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                    {feedbackMessage.text}
                </div>
            )}

            {/* Instructions */}
            <div className="bg-info/10 border border-info/30 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-info mb-2 flex items-center gap-2">
                    <i className="fas fa-lightbulb"></i> Comment ça marche ?
                </h3>
                <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Choisissez un défi de dessin ci-dessous</li>
                    <li>Réalisez votre dessin sur papier ou tablette</li>
                    <li>Soumettez une photo de votre travail</li>
                    <li>Recevez une évaluation détaillée de Maître Léonard !</li>
                </ol>
            </div>

            {/* Challenge Selection */}
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Choisissez votre défi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentChallenges.map((challenge) => (
                        <button
                            key={challenge.id}
                            onClick={() => setSelectedChallenge(challenge)}
                            className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col h-full ${
                                selectedChallenge.id === challenge.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50 hover:bg-background-secondary'
                            }`}
                        >
                            <div className="text-xl font-bold mb-2">{challenge.title}</div>
                            {challenge.id !== 'custom' && (
                                <p className="text-sm text-text-secondary line-clamp-2">
                                    {challenge.challenge}
                                </p>
                            )}
                        </button>
                    ))}
                    
                    <button
                        onClick={renewLevelChallenges}
                        disabled={isRenewing}
                        className={`p-4 rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 transition-all text-left flex flex-col h-full hover:border-purple-500 hover:bg-purple-500/10 group ${isRenewing ? 'opacity-50 grayscale' : ''}`}
                    >
                        <div className="text-xl font-bold mb-2 flex items-center justify-between">
                            <span>✨ Renouveler</span>
                            <i className={`fas fa-sync-alt text-lg group-hover:rotate-180 transition-transform duration-500 ${isRenewing ? 'fa-spin' : ''}`}></i>
                        </div>
                        <p className="text-sm text-text-secondary flex-1">
                            Demander à Léonard de nouveaux sujets de dessin.
                        </p>
                    </button>
                </div>
            </div>

            {/* Custom Challenge Input */}
            {selectedChallenge.id === 'custom' && (
                <div className="bg-background-secondary rounded-xl p-6 mb-6 border border-border">
                    <h3 className="font-bold mb-4">Définissez votre défi personnalisé</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Défi</label>
                            <textarea
                                value={customChallenge}
                                onChange={(e) => setCustomChallenge(e.target.value)}
                                placeholder="Ex: Dessinez un dragon en vol avec des ailes déployées"
                                className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none resize-none"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Critères de réussite</label>
                            <textarea
                                value={customCriteria}
                                onChange={(e) => setCustomCriteria(e.target.value)}
                                placeholder="Ex: Les ailes doivent avoir une structure cohérente. Le corps doit être proportionné."
                                className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Challenge Display */}
            {selectedChallenge.id !== 'custom' && (
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 mb-6 border-2 border-purple-500/30">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <i className="fas fa-bullseye text-purple-600 dark:text-purple-400"></i>
                        Défi sélectionné
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <span className="text-sm font-medium text-text-secondary">Consigne :</span>
                            <p className="text-text font-medium">{selectedChallenge.challenge}</p>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-text-secondary">Critères de réussite :</span>
                            <p className="text-text-secondary text-sm">{selectedChallenge.criteria}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Start Button */}
            <div className="text-center">
                <Button onClick={handleStartChallenge} size="lg" className="px-8 py-4 text-lg">
                    <i className="fas fa-camera mr-3"></i>
                    Soumettre mon dessin
                </Button>
            </div>

            {/* Modal */}
            <DrawingSubmissionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                challenge={getCurrentChallenge()}
                criteria={getCurrentCriteria()}
                apiKey={config.geminiApiKey}
                modelName={config.geminiModel}
                tutorName="Maître Léonard"
            />
                </div>
            </div>
        </div>
    );
};
