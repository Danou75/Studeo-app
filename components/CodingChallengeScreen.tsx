
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { useTranslation } from '../contexts/LanguageContext';
import { useAIConfig } from '../contexts/AIConfigContext';
import { ChatService } from '../services/chatService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AILoader } from './AILoader';

export const CodingChallengeScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const { config } = useAIConfig();
    const [challenge, setChallenge] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [solution, setSolution] = useState<string | null>(null);
    const [showSolution, setShowSolution] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const getApiKey = () => {
        switch (config.provider) {
            case 'openai': return config.openaiApiKey || '';
            case 'anthropic': return config.anthropicApiKey || '';
            case 'mistral': return config.mistralApiKey || '';
            case 'openrouter': return config.openrouterApiKey || '';
            case 'gemini': default: return config.geminiApiKey || '';
        }
    };

    const getModel = () => {
        switch (config.provider) {
            case 'openai': return config.openaiModel;
            case 'anthropic': return config.anthropicModel;
            case 'mistral': return config.mistralModel;
            case 'openrouter': return config.openrouterModel || 'openai/gpt-4o';
            case 'gemini': default: return config.geminiModel;
        }
    };

    const generateChallenge = async () => {
        setIsLoading(true);
        setChallenge(null);
        setFeedback(null);
        setSolution(null);
        setShowSolution(false);
        setCode('');
        
        try {
            const prompt = `Génère un petit défi de code pour un débutant/intermédiaire en Python ou JavaScript. 
            Le défi doit être court (max 10 lignes de code à écrire). 
            Donne juste l'énoncé.`;
            
            const response = await ChatService.generateAIResponse({
                provider: config.provider,
                apiKey: getApiKey(), 
                modelName: getModel(), 
                apiUrl: config.localApiUrl,
                prompt: prompt,
                systemPrompt: "Tu es Prof. Turing. Tu donnes des défis de code courts et amusants."
            });
            
            setChallenge(response);
        } catch (error) {
            setChallenge("Erreur lors de la génération du défi. Vérifiez votre connexion IA.");
        } finally {
            setIsLoading(false);
        }
    };

    const requestSolution = async () => {
        if (solution) {
            setShowSolution(!showSolution);
            return;
        }

        setIsLoading(true);
        try {
            const prompt = `Voici l'énoncé du défi que tu as donné : "${challenge}"
            
            Donne une solution simple, propre et bien commentée pour ce défi.
            Si l'énoncé ne précise pas le langage, choisis Python par défaut (ou JS si c'est orienté web).
            Explique brièvement la logique.`;

            const response = await ChatService.generateAIResponse({
                provider: config.provider,
                apiKey: getApiKey(),
                modelName: getModel(),
                apiUrl: config.localApiUrl,
                prompt: prompt,
                systemPrompt: "Tu es Prof. Turing. Tu donnes la correction parfaite d'un exercice."
            });

            setSolution(response);
            setShowSolution(true);
        } catch (error) {
            setFeedback("Impossible de générer la solution pour le moment.");
        } finally {
            setIsLoading(false);
        }
    };

    const submitCode = async () => {
        setIsLoading(true);
        setFeedback(null);
        setShowSolution(false); // Hide solution when submitting new attempt
        
        try {
            const prompt = `Voici l'énoncé du défi : "${challenge}"
            Voici le code de l'élève :
            \`\`\`
            ${code}
            \`\`\`
            
            Analyse ce code. Est-il correct ? Donne un feedback constructif et bienveillant. Si c'est bon, dis "Bravo !". Sinon, explique l'erreur.`;
            
            const response = await ChatService.generateAIResponse({
                provider: config.provider,
                apiKey: getApiKey(),
                modelName: getModel(), 
                apiUrl: config.localApiUrl,
                prompt: prompt,
                systemPrompt: "Tu es Prof. Turing. Tu corriges le code de tes élèves."
            });
            
            setFeedback(response);
        } catch (error) {
            setFeedback("Erreur lors de la correction.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background text-text overflow-hidden relative">
            {/* Header */}
            <div className="pt-safe p-4 border-b border-border flex items-center justify-between bg-background-secondary shrink-0">
                <Button variant="secondary" onClick={onBack}>
                    <i className="fas fa-arrow-left mr-2"></i> {t('common.back')}
                </Button>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    💻 Défi Code avec Prof. Turing
                </h2>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 min-h-0">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {!challenge && (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-6 animate-bounce-subtle">💻</div>
                            <h3 className="text-2xl font-bold mb-4">Prêt à coder ?</h3>
                            <p className="text-text-muted mb-8">Demandez à Prof. Turing de vous générer un petit exercice algorithmique.</p>
                            <Button onClick={generateChallenge} disabled={isLoading} className="bg-primary text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:scale-105 transition-transform">
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <AILoader size="sm" />
                                        <span>Génération...</span>
                                    </div>
                                ) : 'Générer un Défi'}
                            </Button>
                        </div>
                    )}

                    {challenge && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                                    <i className="fas fa-terminal"></i> Énoncé
                                </h4>
                                <div className="prose dark:prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {challenge || ''}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="font-bold text-sm uppercase text-text-muted">Votre Solution</label>
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="// Écrivez votre code ici..."
                                    className="w-full h-64 font-mono text-sm p-4 bg-gray-900 text-green-400 rounded-xl border border-gray-700 focus:border-primary outline-none resize-none shadow-inner"
                                />
                            </div>

                            <div className="flex flex-wrap justify-end gap-3">
                                <Button 
                                    variant="secondary" 
                                    onClick={requestSolution} 
                                    disabled={isLoading}
                                    className="border-primary text-primary hover:bg-primary/10"
                                >
                                    <i className={`fas ${showSolution ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
                                    {showSolution ? 'Masquer Solution' : 'Voir la Solution'}
                                </Button>
                                <Button variant="secondary" onClick={generateChallenge} disabled={isLoading}>
                                    Nouveau Défi
                                </Button>
                                <Button onClick={submitCode} disabled={!code.trim() || isLoading} className="bg-green-600 text-white hover:bg-green-700">
                                    {isLoading ? 'Analyse...' : 'Vérifier mon Code'} <i className="fas fa-check ml-2"></i>
                                </Button>
                            </div>

                            {/* Zone Solution */}
                            {showSolution && solution && (
                                <div className="bg-gray-900 text-gray-200 p-6 rounded-xl border border-gray-700 animate-slide-up shadow-lg">
                                    <h4 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
                                        <i className="fas fa-lightbulb"></i> Solution Suggérée
                                    </h4>
                                    <div className="prose prose-invert max-w-none text-sm">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({node, inline, className, children, ...props}: any) {
                                                    const match = /language-(\w+)/.exec(className || '')
                                                    return !inline && match ? (
                                                        <div className="bg-black/30 rounded-lg p-4 my-2 overflow-x-auto border border-gray-700">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </div>
                                                    ) : (
                                                        <code className="bg-black/30 px-1 py-0.5 rounded text-yellow-300 font-mono text-xs" {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                }
                                            }}
                                        >
                                            {solution || ''}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {feedback && !showSolution && (
                                <div className="bg-background-secondary p-6 rounded-xl border-l-4 border-primary animate-slide-up shadow-sm">
                                    <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                                        <i className="fas fa-comment-dots"></i> Feedback de Prof. Turing
                                    </h4>
                                    <div className="prose dark:prose-invert max-w-none text-sm">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {feedback || ''}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
