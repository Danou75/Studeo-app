import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { DrawingSubmissionModal } from './DrawingSubmissionModal';
import { useAIConfig } from '../contexts/AIConfigContext';
import { FAMOUS_GAMES } from '../data/famousChessGames';
import { open } from '@tauri-apps/api/shell';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { Chess } from 'chess.js';
import { ChessBoard } from './ChessBoard';

interface ChessChallengeScreenProps {
    onBack: () => void;
}



export const ChessChallengeScreen: React.FC<ChessChallengeScreenProps> = ({ onBack }) => {
    const { config } = useAIConfig();
    const [activeTab, setActiveTab] = useState<'challenges' | 'famous'>('challenges');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [squareStatus, setSquareStatus] = useState<Record<string, 'correct' | 'error' | 'active' | 'selected'>>({});
    const [aiGeneratedChallenges, setAiGeneratedChallenges] = useState<Record<string, any[]>>({});
    const [isRenewing, setIsRenewing] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ text: string, type: 'success' | 'error' | 'neutral' } | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Famous Games state
    const [selectedGameId, setSelectedGameId] = useState<string>('immortal-game');
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameHistory, setGameHistory] = useState<string[]>([]);
    const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    useEffect(() => {
        const game = FAMOUS_GAMES.find(g => g.id === selectedGameId);
        if (game) {
            try {
                const chess = new Chess();
                chess.loadPgn(game.moves);
                
                setGameHistory(chess.history());
                setCurrentMoveIndex(0);
                setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                setIsPlaying(false);
            } catch (e) {
                console.error("PGN Parsing error", e);
            }
        }
    }, [selectedGameId]);

    // Auto-play effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                goToMove(currentMoveIndex + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentMoveIndex]);

    const goToMove = (index: number) => {
        if (index < 0 || index > gameHistory.length) {
            setIsPlaying(false);
            return;
        }

        const tempChess = new Chess();
        for (let i = 0; i < index; i++) {
            tempChess.move(gameHistory[i]);
        }
        setCurrentFen(tempChess.fen());
        setCurrentMoveIndex(index);
    };

    // Helper to convert FEN to pieces object for ChessBoard
    const getPiecesFromFen = (fen: string): Record<string, string> => {
        const pieceMap: Record<string, string> = {};
        const board = fen.split(' ')[0];
        const rows = board.split('/');
        
        rows.forEach((row, rIdx) => {
            let colIdx = 0;
            for (const char of row) {
                if (char >= '1' && char <= '8') {
                    colIdx += parseInt(char);
                } else {
                    const file = String.fromCharCode('a'.charCodeAt(0) + colIdx);
                    // In FEN, rank 8 is first, so 8 - rIdx
                    const rank = 8 - rIdx;
                    pieceMap[`${file}${rank}`] = char;
                    colIdx++;
                }
            }
        });
        return pieceMap;
    };
    
    const challengesByLevel: Record<string, any[]> = {
        beginner: [
            {
                id: 'chess-mate-1',
                title: '🎯 Mat du Couloir',
                challenge: 'Profitez de la faiblesse de la dernière rangée pour faire échec et mat.',
                criteria: 'La Tour blanche doit monter tout en haut.',
                pieces: { 'f1': 'K', 'a1': 'R', 'g8': 'k', 'f7': 'p', 'g7': 'p', 'h7': 'p' },
                expectedMove: ['a1', 'a8'],
                hint: 'Les pions noirs bloquent leur propre roi.',
                mode: 'interactive'
            },
            {
                id: 'chess-mate-queen',
                title: '💋 Baiser de la Reine',
                challenge: 'Amenez votre Reine juste devant le Roi adverse pour le mat final.',
                criteria: 'La Reine en g7, soutenue par son Roi.',
                pieces: { 'f6': 'K', 'h5': 'Q', 'h8': 'k', 'g8': 'p' },
                expectedMove: ['h5', 'g7'],
                hint: 'La Reine a besoin du soutien du Roi blanc en f6.',
                mode: 'interactive'
            },
            {
                id: 'chess-promotion',
                title: '👑 Promotion !',
                challenge: 'Amenez votre pion sur la dernière case pour le transformer en Reine.',
                criteria: 'Avancez en a8.',
                pieces: { 'g1': 'K', 'a7': 'P', 'g8': 'k' },
                expectedMove: ['a7', 'a8'],
                hint: 'Rien ne peut arrêter ce pion.',
                mode: 'interactive'
            },
            {
                id: 'chess-photo-1',
                title: '📸 Analyse IA',
                challenge: 'Prenez une photo de votre échiquier réel pour une analyse stratégique.',
                criteria: 'Kaspar analysera la position via Gemini Vision.',
                mode: 'photo'
            }
        ],
        intermediate: [
            {
                id: 'chess-fork-1',
                title: '🍴 La Fourchette',
                challenge: 'Attaquez la Dame et le Roi à la fois avec votre Cavalier.',
                criteria: 'Le Cavalier en e6 fait échec et attaque la dame.',
                pieces: { 'a1': 'K', 'c5': 'N', 'd8': 'q', 'f8': 'k' },
                expectedMove: ['c5', 'e6'],
                mode: 'interactive',
                hint: 'Le cavalier doit se placer entre le roi et la dame.'
            },
            {
                id: 'chess-pin-1',
                title: '⚓ Le Clouage',
                challenge: 'Utilisez votre Fou pour "clouer" la Dame noire contre son Roi.',
                criteria: 'Le Fou en f5 cloue la Dame e4 contre le Roi b1.',
                pieces: { 'g1': 'K', 'h7': 'B', 'e4': 'q', 'b1': 'k' },
                expectedMove: ['h7', 'f5'],
                mode: 'interactive',
                hint: 'Placez le fou sur la diagonale reliant la dame au roi.'
            },
            {
                id: 'chess-skewer-1',
                title: 'Enfilade',
                challenge: 'Forcez le Roi à bouger pour capturer la Dame derrière lui.',
                criteria: 'La Tour en h1 crée une enfilade mortelle.',
                pieces: { 'g1': 'K', 'a1': 'R', 'h5': 'k', 'h8': 'q' },
                expectedMove: ['a1', 'h1'],
                mode: 'interactive',
                hint: 'C\'est l\'inverse du clouage : la pièce la plus forte est devant.'
            }
        ],
        advanced: [
            {
                id: 'chess-mate-3',
                title: '🧠 Mat de Legal',
                challenge: 'Sacrifiez votre Reine pour forcer un mat avec vos cavaliers.',
                criteria: 'Nxe5 lance le sacrifice.',
                pieces: {
                    'e1': 'K', 'd1': 'Q', 'c4': 'B', 'f3': 'N', 'c3': 'N', 'e8': 'k', 'g4': 'b', 'd6': 'p', 'e5': 'p'
                },
                expectedMove: ['f3', 'e5'],
                mode: 'interactive',
                hint: 'Ne craignez pas de perdre la Reine si la victoire est au bout.'
            },
            {
                id: 'chess-discovered-1',
                title: '🔭 Attaque à la découverte',
                challenge: 'Bougez votre Cavalier pour libérer l\'attaque de votre Tour sur le Roi adverse.',
                criteria: 'Le Cavalier bouge et la Tour en d1 fait échec.',
                pieces: { 'b1': 'K', 'd1': 'R', 'd4': 'N', 'd8': 'k', 'h8': 'r' },
                expectedMove: ['d4', 'e6'],
                mode: 'interactive',
                hint: 'Le simple fait de bouger le cavalier crée un échec à la découverte.'
            },
            {
                id: 'chess-boden-1',
                title: '⚡ Mat de Boden',
                challenge: 'Utilisez vos deux Fous croisés pour mater le Roi.',
                criteria: 'Sacrifice de Reine suivi du coup de grâce des fous.',
                pieces: { 'g1': 'K', 'a4': 'Q', 'a6': 'B', 'f4': 'B', 'c8': 'k', 'd8': 'r', 'b7': 'p' },
                expectedMove: ['a4', 'c6'],
                mode: 'interactive',
                hint: 'Sacrifiez en c6 pour laisser les fous s\'exprimer.'
            }
        ]
    };

    const currentChallenges = [...(aiGeneratedChallenges[difficulty] || []), ...challengesByLevel[difficulty]];
    const [selectedId, setSelectedId] = useState<string>(currentChallenges[0].id);

    useEffect(() => {
        const found = challengesByLevel[difficulty].find(c => c.id === selectedId);
        if (!found) setSelectedId(challengesByLevel[difficulty][0].id);
        resetValidation();
    }, [difficulty]);

    const selectedChallenge = currentChallenges.find(c => c.id === selectedId) || { id: 'custom', title: '♟️ Libre', challenge: '', criteria: '', mode: 'photo', pieces: {} };

    const resetValidation = () => {
        setSelectedSquare(null);
        setSquareStatus({});
        setIsSuccess(false);
    };

    const handleShowSolution = () => {
        if (selectedChallenge.mode === 'photo') return;
        
        const expected = (selectedChallenge as any).expectedMove;
        const sequence = (selectedChallenge as any).expectedSequence;

        if (expected) {
            setSquareStatus({ [expected[0]]: 'correct', [expected[1]]: 'correct' });
            setIsSuccess(true);
        } else if (sequence) {
            // For sequences, we'll highlight all target squares in the sequence
            const status: Record<string, 'correct'> = {};
            sequence.forEach((sq: string) => {
                // This is a bit simplified for openings where we only have target squares in the demo data
                status[sq] = 'correct';
            });
            setSquareStatus(status);
            setIsSuccess(true);
        }
    };

    const handleSquareClick = (coord: string) => {
        if (selectedChallenge.mode === 'photo') return;
        if (isSuccess) return;

        if (selectedSquare === coord) {
            setSelectedSquare(null);
            setSquareStatus({});
            return;
        }

        if (!selectedSquare) {
            const pieces = (selectedChallenge as any).pieces;
            if (pieces && pieces[coord]) {
                setSelectedSquare(coord);
                setSquareStatus({ [coord]: 'selected' });
            }
        } else {
            const expected = (selectedChallenge as any).expectedMove;
            if (expected && expected[0] === selectedSquare && expected[1] === coord) {
                setSquareStatus({ [selectedSquare]: 'correct', [coord]: 'correct' });
                setIsSuccess(true);
            } else {
                setSquareStatus({ [selectedSquare]: 'error', [coord]: 'error' });
                setTimeout(() => {
                    setSelectedSquare(null);
                    setSquareStatus({});
                }, 500);
            }
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
            model = config.geminiModel || 'gemini-1.5-flash';
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
            const levelLabel = difficulty === 'beginner' ? 'Pion (Débutant)' : difficulty === 'intermediate' ? 'Cavalier (Intermédiaire)' : 'Grand Maître (Expert)';
            
            const prompt = `
            Tu es Grand Maître Kaspar, expert aux échecs. Génère 3 nouveaux défis tactiques pour le niveau "${levelLabel}".
            
            Retourne UNIQUEMENT un tableau JSON de 3 objets:
            [
              {
                "id": "ai-chess-" + random suffix,
                "title": "Nom de la tactique (ex: Mat étouffé, Fourchette...)",
                "challenge": "Consigne précise",
                "hint": "Indice stratégique",
                "mode": "interactive",
                "pieces": { "case": "Pièce" }, 
                "expectedMove": ["case_départ", "case_arrivée"]
              }
            ]
            Codes pièces: K=Roi blanc, Q=Dame b, R=Tour b, B=Fou b, N=Cavalier b, P=Pion b. 
            (Minuscules pour les noirs: k, q, r, b, n, p).
            Indices case: a1 à h8.
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
            const newChallenges = JSON.parse(jsonStr);

            if (Array.isArray(newChallenges)) {
                setAiGeneratedChallenges(prev => ({
                    ...prev,
                    [difficulty]: newChallenges
                }));
                setSelectedId(newChallenges[0].id);
                setFeedbackMessage({ text: "✨ Kaspar a concocté de nouveaux problèmes !", type: 'success' });
            }

        } catch (error: any) {
            console.error("Renew Chess Challenges Error:", error);
            setFeedbackMessage({ text: `❌ Erreur: ${error.message}`, type: 'error' });
        } finally {
            setIsRenewing(false);
        }
    };

    const handleStartChallenge = () => {
        setIsModalOpen(true);
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
                        <span className="text-4xl md:text-5xl">♟️</span>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#b58863]">Académie d'Échecs</h1>
                            <p className="text-text-secondary text-sm md:text-base">Avec Grand Maître Kaspar</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0 bg-background/50">
                <div className="max-w-4xl mx-auto w-full pb-32">

            {/* Tab Selector */}
            <div className="flex gap-2 bg-background-secondary p-1 rounded-xl w-fit mx-auto mb-6 border border-border">
                <button
                    onClick={() => setActiveTab('challenges')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${
                        activeTab === 'challenges' 
                        ? 'bg-[#b58863] text-white shadow-md' 
                        : 'text-text-muted hover:text-text'
                    }`}
                >
                    <i className="fas fa-chess-board mr-2"></i>
                    Défis Tactiques
                </button>
                <button
                    onClick={() => setActiveTab('famous')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${
                        activeTab === 'famous' 
                        ? 'bg-[#b58863] text-white shadow-md' 
                        : 'text-text-muted hover:text-text'
                    }`}
                >
                    <i className="fas fa-trophy mr-2"></i>
                    Parties Célèbres
                </button>
            </div>

            {activeTab === 'challenges' && (
            <>

            {selectedChallenge.mode !== 'photo' && (
                <ChessBoard 
                    onSquareClick={handleSquareClick}
                    status={squareStatus}
                    pieces={(selectedChallenge as any).pieces}
                />
            )}

            {isSuccess && (
                <div className="mb-6 p-4 bg-green-100 border border-green-500 text-green-700 rounded-xl text-center font-bold animate-bounce shadow-lg">
                    <i className="fas fa-check-circle mr-2"></i>
                    Génial ! Vous avez trouvé la solution tactique ! 🏆
                </div>
            )}

            {/* AI Feedback */}
            {feedbackMessage && (
                <div className={`mb-4 mx-auto w-fit px-4 py-2 rounded-full font-bold text-sm animate-pulse ${
                    feedbackMessage.type === 'success' ? 'bg-green-100 text-green-700' : 
                    feedbackMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                    {feedbackMessage.text}
                </div>
            )}

            <div className="flex gap-2 mb-8 bg-background-secondary p-1 rounded-xl w-fit mx-auto border border-border">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lv) => (
                    <button
                        key={lv}
                        onClick={() => {
                            setDifficulty(lv);
                        }}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${
                            difficulty === lv 
                            ? 'bg-[#b58863] text-white shadow-md' 
                            : 'text-text-muted hover:text-text'
                        }`}
                    >
                        {lv === 'beginner' ? 'Pion' : lv === 'intermediate' ? 'Cavalier' : 'Grand Maître'}
                    </button>
                ))}
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Défis de niveau {difficulty === 'beginner' ? 'Pion' : difficulty === 'intermediate' ? 'Cavalier' : 'Grand Maître'}</h2>
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
                                    ? 'border-[#b58863] bg-[#b58863]/10'
                                    : 'border-border hover:border-[#b58863]/50 hover:bg-background-secondary'
                            }`}
                        >
                            <div className="text-xl font-bold mb-2">{challenge.title}</div>
                            <p className="text-sm text-text-secondary flex-1">
                                {challenge.challenge}
                            </p>
                            {challenge.mode !== 'photo' && (
                                <span className="mt-2 text-[10px] bg-[#b58863]/10 text-[#b58863] px-2 py-0.5 rounded-full w-fit font-bold">
                                    🧩 Interactif
                                </span>
                            )}
                        </button>
                    ))}
                    
                    <button
                        onClick={renewLevelChallenges}
                        disabled={isRenewing}
                        className={`p-4 rounded-xl border-2 border-dashed border-[#b58863]/40 bg-[#b58863]/5 transition-all text-left flex flex-col h-full hover:border-[#b58863] hover:bg-[#b58863]/10 group ${isRenewing ? 'opacity-50 grayscale' : ''}`}
                    >
                        <div className="text-xl font-bold mb-2 flex items-center justify-between">
                            <span>✨ Renouveler</span>
                            <i className={`fas fa-sync-alt text-lg group-hover:rotate-180 transition-transform duration-500 ${isRenewing ? 'fa-spin' : ''}`}></i>
                        </div>
                        <p className="text-sm text-text-secondary flex-1">
                            Demander à Kaspar d'autres problèmes tactiques.
                        </p>
                    </button>
                </div>
            </div>

            <div className="bg-background-secondary rounded-2xl p-6 border border-border shadow-sm mb-12">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-[#b58863]">
                        <i className="fas fa-chess"></i>
                        {selectedChallenge.title}
                    </h3>
                    <div className="flex gap-2">
                        {selectedChallenge.mode !== 'photo' && (
                            <>
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={handleShowSolution}
                                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                >
                                    <i className="fas fa-eye mr-2"></i> Voir la solution
                                </Button>
                                <Button variant="secondary" size="sm" onClick={resetValidation}>
                                    Réinitialiser
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <span className="text-sm font-medium text-text-secondary">Consigne de Kaspar :</span>
                        <p className="text-lg text-text font-medium">{selectedChallenge.challenge}</p>
                    </div>
                    {selectedChallenge.hint && (
                        <div className="flex items-center gap-2 text-sm text-info bg-info/10 p-2 rounded-lg italic">
                            <i className="fas fa-lightbulb"></i>
                            {selectedChallenge.hint}
                        </div>
                    )}
                </div>

                <div className="text-center pt-6 border-t border-border">
                    <Button 
                        onClick={handleStartChallenge} 
                        size="lg" 
                        variant="secondary"
                        className="px-8 border-2 border-[#b58863] text-[#b58863] hover:bg-[#b58863] hover:text-white"
                    >
                        <i className="fas fa-camera mr-2"></i>
                        Soumettre une photo (Évaluation IA détaillée)
                    </Button>
                    <p className="mt-3 text-xs text-text-secondary max-w-md mx-auto">
                        Kaspar utilise <strong>Gemini Vision</strong> pour analyser vos positions réelles et vous suggérer les meilleures continuations stratégiques.
                    </p>
                </div>
            </div>
            </>
            )}

            {activeTab === 'famous' && (
                <div className="space-y-6">
                    <div className="bg-background-secondary rounded-2xl p-6 border border-border">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[#b58863]">
                            <i className="fas fa-trophy"></i>
                            Parties Légendaires
                        </h2>
                        <p className="text-text-secondary mb-6">
                            Étudiez les parties les plus célèbres de l'histoire des échecs. Analysez les coups des grands maîtres et comprenez leur génie tactique.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {FAMOUS_GAMES.map((game) => (
                                <button
                                    key={game.id}
                                    onClick={() => {
                                        setSelectedGameId(game.id);
                                        setCurrentMoveIndex(0);
                                        setIsPlaying(false);
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        selectedGameId === game.id
                                            ? 'border-[#b58863] bg-[#b58863]/10'
                                            : 'border-border hover:border-[#b58863]/50 hover:bg-background-secondary'
                                    }`}
                                >
                                    <div className="text-lg font-bold mb-2">{game.title}</div>
                                    <div className="text-sm text-text-secondary space-y-1">
                                        <div><strong>{game.players.white}</strong> vs <strong>{game.players.black}</strong></div>
                                        <div className="text-xs">{game.event} ({game.year})</div>
                                        <div className="text-xs italic mt-2">{game.opening}</div>
                                    </div>
                                    <div className={`mt-2 text-xs font-bold ${
                                        game.result === '1-0' ? 'text-green-600' : 
                                        game.result === '0-1' ? 'text-blue-600' : 'text-gray-600'
                                    }`}>
                                        Résultat : {game.result}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedGameId && (() => {
                        const game = FAMOUS_GAMES.find(g => g.id === selectedGameId);
                        if (!game) return null;

                        return (
                            <div className="bg-background-secondary rounded-2xl p-6 border border-border space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">{game.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                                        <span><strong>Blancs:</strong> {game.players.white}</span>
                                        <span>•</span>
                                        <span><strong>Noirs:</strong> {game.players.black}</span>
                                        <span>•</span>
                                        <span>{game.event}, {game.year}</span>
                                    </div>
                                </div>

                                {/* Visualizer */}
                                <div className="bg-[#b58863]/10 p-4 rounded-xl border border-[#b58863]/30 flex flex-col items-center">
                                    <h4 className="font-bold mb-4 text-[#8b4513] flex items-center gap-2 w-full">
                                        <i className="fas fa-video"></i>
                                        Replay
                                    </h4>
                                    
                                    <div className="scale-90 md:scale-100">
                                        <ChessBoard pieces={getPiecesFromFen(currentFen)} />
                                    </div>

                                    <div className="w-full flex flex-col items-center gap-4 mt-4">
                                        {/* Slider */}
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max={gameHistory.length} 
                                            value={currentMoveIndex}
                                            onChange={(e) => {
                                                setIsPlaying(false);
                                                goToMove(parseInt(e.target.value));
                                            }}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#b58863]"
                                        />

                                        {/* Controls */}
                                        <div className="flex items-center gap-4">
                                            <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => {
                                                    setIsPlaying(false);
                                                    goToMove(0);
                                                }}
                                                disabled={currentMoveIndex === 0}
                                            >
                                                <i className="fas fa-fast-backward"></i>
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => {
                                                    setIsPlaying(false);
                                                    goToMove(currentMoveIndex - 1);
                                                }}
                                                disabled={currentMoveIndex === 0}
                                            >
                                                <i className="fas fa-step-backward"></i>
                                            </Button>
                                            
                                            <Button 
                                                size="md"
                                                onClick={() => setIsPlaying(!isPlaying)}
                                                className={`w-12 h-12 rounded-full !p-0 flex items-center justify-center border-2 ${isPlaying ? 'border-red-500 text-red-500' : 'border-[#b58863] text-[#b58863]'}`}
                                                variant="secondary"
                                            >
                                                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => {
                                                    setIsPlaying(false);
                                                    goToMove(currentMoveIndex + 1);
                                                }}
                                                disabled={currentMoveIndex === gameHistory.length}
                                            >
                                                <i className="fas fa-step-forward"></i>
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="secondary"
                                                onClick={() => {
                                                    setIsPlaying(false);
                                                    goToMove(gameHistory.length);
                                                }}
                                                disabled={currentMoveIndex === gameHistory.length}
                                            >
                                                <i className="fas fa-fast-forward"></i>
                                            </Button>
                                        </div>

                                        <div className="text-sm font-mono font-bold text-[#8b4513]">
                                            Coup {Math.floor((currentMoveIndex + 1) / 2)} / {Math.ceil(gameHistory.length / 2)}
                                            {currentMoveIndex > 0 && (
                                                <span className="ml-2 px-2 py-1 bg-white rounded shadow-sm border border-border">
                                                    {gameHistory[currentMoveIndex - 1] || 'Début'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-background-tertiary p-4 rounded-xl">
                                    <h4 className="font-bold mb-2 flex items-center gap-2">
                                        <i className="fas fa-book-open text-primary"></i>
                                        Description
                                    </h4>
                                    <p className="text-sm text-text-secondary">{game.description}</p>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                                    <h4 className="font-bold mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                        <i className="fas fa-lightbulb"></i>
                                        Moment Clé
                                    </h4>
                                    <p className="text-sm text-amber-900 dark:text-amber-200">{game.keyMoment}</p>
                                </div>

                                <div className="bg-background-tertiary p-4 rounded-xl">
                                    <h4 className="font-bold mb-2 flex items-center gap-2">
                                        <i className="fas fa-chess text-primary"></i>
                                        Notation PGN
                                    </h4>
                                    <div className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
                                        {game.moves}
                                    </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-bold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                        <i className="fas fa-graduation-cap"></i>
                                        Analyse de Kaspar
                                    </h4>
                                    <p className="text-sm text-blue-900 dark:text-blue-200">{game.analysis}</p>
                                </div>

                                <div className="flex gap-3 justify-center pt-4 border-t border-border">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={async () => {
                                            console.log('🔍 Opening Lichess with PGN');
                                            const encodedPGN = encodeURIComponent(game.moves);
                                            const lichessUrl = `https://lichess.org/paste?pgn=${encodedPGN}`;
                                            try {
                                                await open(lichessUrl);
                                            } catch (error) {
                                                console.error('Error opening Lichess:', error);
                                                // Fallback to window.open for web mode
                                                window.open(lichessUrl, '_blank');
                                            }
                                        }}
                                        className="border-[#b58863] text-[#b58863] hover:!bg-[#b58863] hover:!text-white transition-colors"
                                    >
                                        <i className="fas fa-external-link-alt mr-2"></i>
                                        Analyser sur Lichess
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={async () => {
                                            console.log('📥 Downloading PGN:', game.title);
                                            const pgnContent = `[Event "${game.event}"]
[Site "?"]
[Date "${game.year}.??.??"]
[Round "?"]
[White "${game.players.white}"]
[Black "${game.players.black}"]
[Result "${game.result}"]
[Opening "${game.opening}"]

${game.moves} ${game.result}`;
                                            
                                            try {
                                                // Tauri mode: use save dialog
                                                const filePath = await save({
                                                    filters: [{
                                                        name: 'PGN',
                                                        extensions: ['pgn']
                                                    }],
                                                    defaultPath: `${game.id}.pgn`
                                                });
                                                
                                                if (filePath) {
                                                    await writeTextFile(filePath, pgnContent);
                                                    console.log('✅ PGN saved to:', filePath);
                                                }
                                            } catch (error) {
                                                console.error('Error saving PGN:', error);
                                                // Fallback to blob download for web mode
                                                const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${game.id}.pgn`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                            }
                                        }}
                                        className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                                    >
                                        <i className="fas fa-download mr-2"></i>
                                        Télécharger PGN
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            <DrawingSubmissionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                challenge={selectedChallenge.challenge}
                criteria={selectedChallenge.criteria || "Analyse stratégique de la position d'échecs."}
                apiKey={config.geminiApiKey}
                modelName={config.geminiModel}
                tutorName="Grand Maître Kaspar"
            />
                </div>
            </div>
        </div>
    );
};
