import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { QuizHistoryEntry, QuizConfig, Flashcard } from '../types';
import { Button } from './ui/Button';


import { LANGUAGE_CONFIG } from '../constants';
import { useQuizAudio } from '../hooks/useQuizAudio';
import { useTTS } from '../hooks/useTTS';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { calculateSRS } from '../utils/srsAlgorithm';
import { useAIConfig } from '../contexts/AIConfigContext';
import { getTutorExplanation } from '../services/tutorService';
import { generateMnemonic } from '../services/mnemonicService';
import { DrawingSubmissionModal } from './DrawingSubmissionModal';
import { useTranslation } from '../contexts/LanguageContext';
import { generateSmartDistractors } from '../services/aiCardGenerator';

interface QuizScreenProps {
  quizCards: Flashcard[];
  quizConfig: QuizConfig;
  onQuizEnd: (
    result: Omit<QuizHistoryEntry, 'date' | 'timestamp' | 'id' | 'questionLang' | 'answerLang'>, 
    mistakes: Flashcard[],
    updatedCards?: Flashcard[]  // Cartes avec SRS mis à jour
  ) => void;
  onBackToLesson?: () => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ quizCards, quizConfig, onQuizEnd, onBackToLesson }) => {
  const { t } = useTranslation();
  const speechLangConfig = LANGUAGE_CONFIG[quizConfig.questionLang]?.speechLang;
  const { availableVoices, selectedVoice, setSelectedVoice, speak } = useTTS(speechLangConfig || 'en-US');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // ----- Core state -----
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [incorrectAnswers] = useState<Flashcard[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [isReady, setIsReady] = useState(quizConfig.voiceEngine === 'local');
  const [options, setOptions] = useState<string[]>([]);
  const [similarityScore, setSimilarityScore] = useState<number | undefined>(undefined);
  const [effectiveQuizMode, setEffectiveQuizMode] = useState<"classic" | "mcq" | "dictation" | "cloze">(
    quizConfig.mode === 'mixed' ? 'classic' : (quizConfig.mode as any)
  );

  // ----- Game‑mode state -----
  const [timeLeft, setTimeLeft] = useState(60);
  const [lives, setLives] = useState(3);
    
    // Arts / Drawing specific states
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState<{feedback: string, score: number, isSuccess: boolean} | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);

  const [correctStreak, setCorrectStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  // ----- Hints & Tutor State -----
  const [hintLevel, setHintLevel] = useState(0);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [isGeneratingMnemonic, setIsGeneratingMnemonic] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const { config } = useAIConfig();
  
  // ----- SRS state -----
  // Utiliser un ref au lieu d'un state pour éviter les problèmes de closure
  const updatedCardsRef = useRef<Flashcard[]>([...quizCards]);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentCard = quizCards[currentIndex];

  // Prepare question/answer
  const { question, answer } = useMemo(() => {
    if (!currentCard) return { question: '', answer: '' };
    
    const terms = (currentCard as any).terms;
    const mcqData = (currentCard as any).mcqData;
    const clozeData = (currentCard as any).clozeData;

    if (terms) {
      return {
        question: terms[quizConfig.questionLang] ?? '',
        answer: terms[quizConfig.answerLang] ?? '',
      };
    }
    if (mcqData) {
      return {
        question: mcqData.question[quizConfig.questionLang] ?? '',
        answer: mcqData.answer[quizConfig.answerLang] ?? '',
      };
    }
    if (clozeData) {
      return {
        question: clozeData.text[quizConfig.questionLang] ?? '',
        answer: (clozeData.answers[quizConfig.answerLang] || []).join(', '),
      };
    }

    // Comprehensive Fallback for flat objects or missing types
    return { 
      question: (currentCard as any)[quizConfig.questionLang] || '', 
      answer: (currentCard as any)[quizConfig.answerLang] || '' 
    };
  }, [currentCard, quizConfig]);

  // Reset Arts State on card change
  useEffect(() => {
    setUploadedImage(null);
    setAiFeedback(null);
    setIsEvaluating(false);
  }, [currentIndex]);

  // ----- Audio & Speech -----
  const { speakQuestion } = useQuizAudio(quizConfig, quizCards, currentIndex, isReady, isRevealed, question, selectedVoice);
  
  // Use ANSWER language for dictation if available (normal quiz), otherwise question language
  const speechLang = LANGUAGE_CONFIG[quizConfig.answerLang]?.speechLang || LANGUAGE_CONFIG[quizConfig.questionLang]?.speechLang || 'en-US';
  
  const {
    transcript,
    startListening,
    resetTranscript,
    error: speechError
  } = useSpeechRecognition(speechLang);

  // Reset state on card change
  useEffect(() => {
    setUserInput('');
    setIsRevealed(i => i ? false : i); // Force reset even if already false
    if (resetTranscript) resetTranscript();
    setSimilarityScore(undefined);
    setHintLevel(0);
    setExplanation(null);
    setMnemonic(null);
  }, [currentIndex]);

  // Initialise readiness
  useEffect(() => {
    setIsReady(true);
  }, [quizConfig.voiceEngine]);

  // Start timer for timed mode
  useEffect(() => {
    if (quizConfig.gameMode !== 'timed' || !isReady) return;
    if (timeLeft <= 0) {
      handleQuizEnd();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [quizConfig.gameMode, timeLeft, isReady]);

  // End‑game conditions
  useEffect(() => {
    if (!isReady) return;
    if (quizConfig.gameMode === 'survival' && lives <= 0) {
      handleQuizEnd();
    }
    if (quizConfig.gameMode === 'sprint' && correctStreak >= 10) {
      handleQuizEnd();
    }
  }, [lives, correctStreak, quizConfig.gameMode, isReady]);

  // Cloze generation logic
  const clozifiedSentence = useMemo(() => {
    if (effectiveQuizMode !== 'cloze') return null;
    
    if (currentCard.type === 'cloze' && currentCard.clozeData) {
        return currentCard.clozeData.text[quizConfig.answerLang] || '';
    }

    // Fallback : On crée un trou sur une réponse classique
    const words = answer.trim().split(/\s+/);
    if (words.length <= 1) {
        return answer.length > 3 ? `${answer[0]}${'.'.repeat(answer.length - 2)}${answer[answer.length - 1]}` : '...';
    }
    
    // On cache le mot le plus long (souvent le plus informatif)
    let longestWordIndex = 0;
    for (let i = 1; i < words.length; i++) {
        if (words[i].length > words[longestWordIndex].length) longestWordIndex = i;
    }
    
    const newWords = [...words];
    newWords[longestWordIndex] = "[.......]";
    return newWords.join(' ');
  }, [answer, effectiveQuizMode, currentCard, quizConfig.answerLang]);

  // Record start time
  useEffect(() => {
    if (isReady) setStartTime(Date.now());
  }, [isReady]);

  // Mixed mode logic: pick a new mode for each card
  useEffect(() => {
    if (quizConfig.mode === 'mixed') {
      // Si la carte a déjà un type spécifique (généré par IA), on le respecte
      if (currentCard?.type === 'mcq') {
        setEffectiveQuizMode('mcq');
        return;
      }
      if (currentCard?.type === 'cloze') {
        setEffectiveQuizMode('cloze');
        return;
      }

      // Sinon (type classic), on varie les plaisirs
      const modes: Array<"classic" | "mcq" | "dictation" | "cloze"> = ["classic", "mcq", "dictation", "cloze"];
      setEffectiveQuizMode(modes[Math.floor(Math.random() * modes.length)]);
    } else {
      setEffectiveQuizMode(quizConfig.mode as any);
    }
  }, [currentIndex, quizConfig.mode, currentCard?.type]);

  // Sync dictation transcript
  useEffect(() => {
    if (effectiveQuizMode === 'dictation' && !isRevealed) {
      setUserInput(transcript);
    }
  }, [transcript, effectiveQuizMode, isRevealed]);

  // ----- Helpers -----
  const normalize = (str: string) =>
    str.trim().toLowerCase().replace(/[.,/#!$%\^&*;:{}=\-_`~()]/g, '');

  const levenshtein = (a: string, b: string) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
  };

  const isAnswerCorrect = (input: string, target: string) => {
      // Helper to strip surrounding quotes for comparison to avoid mismatch
      const clean = (s: string) => s.replace(/^["']+|["']+$/g, '').trim();

      const nInput = normalize(clean(input));
      const nTarget = normalize(clean(target));
      if (nInput === nTarget) return true;
      // Pour les mots courts (jusqu'à 6 caractères), pas de tolérance pour garantir la précision
      if (nTarget.length <= 6) return nInput === nTarget;
      
      const dist = levenshtein(nInput, nTarget);
      const similarity = 1 - (dist / Math.max(nInput.length, nTarget.length));
      return similarity >= 0.9; // 90% de similarité requise (plus strict)
  };

  const evaluateAnswer = (isCorrectAnswer: boolean) => {
    setCorrectCount(prev => prev + (isCorrectAnswer ? 1 : 0));
    const newStreak = isCorrectAnswer ? correctStreak + 1 : 0;

    if (quizConfig.gameMode === 'survival' && !isCorrectAnswer) {
      setLives(prev => Math.max(prev - 1, 0));
    }
    if (quizConfig.gameMode === 'sprint' && !isCorrectAnswer) {
      setCorrectStreak(0); // Reset streak in sprint mode
    } else {
      setCorrectStreak(newStreak);
    }
    
    // Confetti logic
    if (isCorrectAnswer && newStreak > 0 && newStreak % 5 === 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b']
      });
    }
  };

  const handleOptionClick = (option: string) => {
    if (isRevealed) return;
    setUserInput(option); // Enregistrer la réponse sélectionnée
    const isCorrectAnswer = option === answer;
    evaluateAnswer(isCorrectAnswer);
    setIsRevealed(true);
  };

  const handleShowAnswer = () => {
    if (isRevealed) return;
    
    // Calculer le score de similarité pour l'affichage (notamment en dictée)
    const nInput = normalize(userInput);
    const nTarget = normalize(answer);
    if (nInput === nTarget) {
      setSimilarityScore(100);
    } else if (nTarget.length > 0) {
      const dist = levenshtein(nInput, nTarget);
      const similarity = 1 - (dist / Math.max(nInput.length, nTarget.length));
      setSimilarityScore(similarity * 100);
    }

    const isCorrectAnswer = isAnswerCorrect(userInput, answer);
    evaluateAnswer(isCorrectAnswer);
    setIsRevealed(true);
  };
  
  const handleExplain = async () => {
      if (!config.selectedTutor) return; // Pas de tuteur = pas d'explication
      
      setIsExplaining(true);
      try {
          const modelName = config.provider === 'gemini' ? config.geminiModel : config.localModelName;
          
          const text = await getTutorExplanation(
              config.selectedTutor,
              question,
              userInput,
              answer,
              config.provider,
              config.geminiApiKey,
              modelName,
              config.localApiUrl
          );
          setExplanation(text);
      } catch (error) {
          console.error("Failed to explain:", error);
          setExplanation(t('quiz.errors.explanation'));
      } finally {
          setIsExplaining(false);
      }
  };

  const handleMnemonic = async () => {
      if (currentCard.mnemonic) {
          setMnemonic(currentCard.mnemonic);
          return;
      }
      
      setIsGeneratingMnemonic(true);
      try {
          const modelName = config.provider === 'gemini' ? config.geminiModel : config.localModelName;
          
          const text = await generateMnemonic(
              config.selectedTutor || null,
              question,
              answer,
              config.provider,
              config.geminiApiKey,
              modelName,
              config.localApiUrl
          );
          
          setMnemonic(text);
          // Sauvegarde locale pour la session et la persistance
          currentCard.mnemonic = text;
          
          // Mettre à jour le ref pour que le mnémonique soit sauvegardé à la fin du quiz
          const newUpdatedCards = [...updatedCardsRef.current];
          // On cherche par ID car l'ordre a pu changer ou l'index peut varier si on naviguait (futur)
          const cardIndex = newUpdatedCards.findIndex(c => c.id === currentCard.id);
          if (cardIndex !== -1) {
              newUpdatedCards[cardIndex] = { ...newUpdatedCards[cardIndex], mnemonic: text };
              updatedCardsRef.current = newUpdatedCards;
          }
          
      } catch (error) {
          console.error("Failed to generate mnemonic:", error);
           setMnemonic(t('quiz.errors.mnemonic'));
      } finally {
          setIsGeneratingMnemonic(false);
      }
  };

  // Fonction pour gérer l'évaluation SRS
  const handleSRSEvaluation = (grade: number) => {
    // Mettre à jour la carte actuelle avec le nouveau grade SRS
    const updatedCard: Flashcard = {
      ...currentCard,
      srsData: calculateSRS(currentCard.srsData, grade)
    };
    
    // Mettre à jour le tableau des cartes dans le ref
    const newUpdatedCards = [...updatedCardsRef.current];
    newUpdatedCards[currentIndex] = updatedCard;
    updatedCardsRef.current = newUpdatedCards;
    // Passer à la carte suivante
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex + 1 >= quizCards.length) {
      handleQuizEnd();
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setIsRevealed(false); // Reset revealed state immediately
    setIsExplaining(false);
    setIsGeneratingMnemonic(false);
    setOptions([]);
    setUserInput(''); // Clear input immediately
    if (quizConfig.gameMode === 'timed') setTimeLeft(60);
  };

  const handleQuizEnd = useCallback(() => {
    const now = Date.now();
    const effectiveStartTime = startTime > 0 ? startTime : now;
    const duration = Math.round((now - effectiveStartTime) / 1000);
    const avgResponse = correctCount > 0 ? Math.round((duration * 1000) / correctCount) : undefined;
    
    onQuizEnd(
      {
        correctCount,
        totalCount: quizCards.length,
        quizName: quizConfig.quizName || (quizConfig.isSRSMode ? t('completion.quizLabel') + " SRS" : t('completion.quizLabel')),
        mode: quizConfig.mode,
        duration,
        averageResponseTime: avgResponse,
      },
      incorrectAnswers,
      quizConfig.isSRSMode ? updatedCardsRef.current : undefined
    );
  }, [startTime, currentIndex, quizCards.length, correctCount, quizConfig, onQuizEnd, incorrectAnswers, t]);

  const handleQuit = () => {
    setShowQuitConfirm(true);
  };

  const confirmQuit = () => {
    handleQuizEnd();
    setShowQuitConfirm(false);
  };

  const cancelQuit = () => {
    setShowQuitConfirm(false);
  };

  const toggleListening = () => {
    startListening();
  };

  // ----- Render helpers -----
  const renderArtsMode = () => {
      // Phase Question
      if (!isRevealed) {
          return (
            <div className="flex flex-col items-center animate-fadeIn">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-4">
                    <i className="fas fa-palette mr-1"></i> {t('quiz.arts.title')}
                </span>
                
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
                    {question}
                </h2>
                
                {uploadedImage ? (
                    <div className="mb-6 relative group">
                        <img 
                            src={`data:image/jpeg;base64,${uploadedImage}`} 
                            className="max-h-64 rounded-xl shadow-lg border-4 border-white dark:border-gray-700" 
                            alt="Drawing"
                        />
                        <button 
                            onClick={() => setUploadedImage(null)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                ) : (
                    <div className="mb-8 p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-400">
                        <i className="fas fa-image text-5xl mb-4"></i>
                        <p className="text-lg">{t('quiz.arts.placeholder')}</p>
                    </div>
                )}

                {isEvaluating ? (
                    <div className="flex flex-col items-center py-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                        <p className="text-blue-600 font-medium">{t('quiz.arts.evaluating', { name: config.selectedTutor?.name || 'Master Leonardo' })}</p>
                    </div>
                ) : (
                    <Button onClick={() => setIsDrawingModalOpen(true)} size="lg" className="px-8 py-3 shadow-lg">
                        <i className="fas fa-camera mr-2"></i> {t('quiz.arts.submit')}
                    </Button>
                )}
                
                <p className="mt-8 text-sm text-gray-500 max-w-md text-center">
                    {t('quiz.arts.hint', { name: config.selectedTutor?.name || 'Master Leonardo' })}
                </p>
            </div>
          );
      }
      
      // Phase Feedback
      if (aiFeedback) {
          return (
            <div className="flex flex-col items-center animate-fadeIn w-full">
                <h2 className={`text-3xl font-bold mb-2 ${aiFeedback.isSuccess ? 'text-green-600' : 'text-orange-600'}`}>
                    {aiFeedback.isSuccess ? t('quiz.arts.success') : t('quiz.arts.tryAgain')}
                </h2>
                <div className={`text-6xl font-black mb-6 ${aiFeedback.isSuccess ? 'text-green-500' : 'text-orange-500'}`}>
                    {aiFeedback.score}<span className="text-2xl text-gray-400">/100</span>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 mb-8 max-w-lg text-left w-full">
                    <div className="flex items-center mb-4">
                        <span className="text-4xl mr-4">{config.selectedTutor?.emoji || "🧙‍♂️"}</span>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('quiz.arts.expertTitle', { name: config.selectedTutor?.name || 'Master Leonardo' })}</h3>
                            <p className="text-xs text-gray-500">{t('quiz.arts.expertRole')}</p>
                        </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 italic text-lg leading-relaxed">
                        "{aiFeedback.feedback}"
                    </p>
                </div>

                <div className="w-full mt-4 flex justify-center">
                    <Button onClick={handleNext} variant="primary" size="lg" className="px-12 animate-bounce-soft">
                        {t('quiz.arts.next')} <i className="fas fa-arrow-right ml-2"></i>
                    </Button>
                </div>
            </div>
          );
      }
      return null;
  };

  // --- Background Prefetching for Smart Distractors ---
  useEffect(() => {
     const PREFETCH_BUFFER = 2; // Number of future cards to prefetch
     
     // Check capabilities
     const canGenerate = (config.provider === 'gemini' && config.geminiApiKey) || 
                         (config.provider === 'openai' && config.openaiApiKey) || 
                         (config.provider === 'local' && config.localApiUrl);
                         
     if (!canGenerate) return;

     // Helper to process a single card
     const processCard = async (idx: number) => {
         if (idx >= quizCards.length) return;
         const card = quizCards[idx];
         
         // Only prefetch if it's likely to be treated as MCQ and lacks distractors
         // For 'mixed' mode, we can't be 100% sure it will be MCQ, but we can pre-generate just in case it is picked as MCQ.
         // Or if strict MCQ / mixed mode.
         const isCandidate = quizConfig.mode === 'mcq' || quizConfig.mode === 'mixed' || card.type === 'mcq';
         
         if (!isCandidate) return;
         if ((card as any).aiDistractors || (card as any).isFetchingDistractors) return; // Already processed or processing
         
         // REMOVED: if (card.type === 'mcq' && card.mcqData?.distractors?.length) return; // Has native distractors
         // We want AI to check and potentially upgrade even if native exist, 
         // BUT we must interpret user intent. 
         // If user enables AI, they likely want AI quality.
         // However, overwriting manual input is risky.
         // But for "imported lists" mentioned by user, "native" distractors might just be placeholders or empty from CSV import.
         // Let's allow prefetch. Logic in useEffect will decide priority.
         
         const terms = (card as any).terms;
         const mcqData = (card as any).mcqData;
         
         // Extract Q/A for generation
         let q = '', a = '';
         if (terms) {
             q = terms[quizConfig.questionLang];
             a = terms[quizConfig.answerLang];
         } else if (mcqData) {
             q = mcqData.question[quizConfig.questionLang];
             a = mcqData.answer[quizConfig.answerLang];
         } else {
             q = (card as any)[quizConfig.questionLang];
             a = (card as any)[quizConfig.answerLang];
         }
         
         if (!q || !a) return;

         // Mark as processing to avoid duplicate calls
         (card as any).isFetchingDistractors = true;
         // console.log(`🔄 [Prefetch] Starting for card ${idx + 1}...`);

         try {
             const smartDistractors = await generateSmartDistractors(
                 q, a, quizConfig.questionLang, quizConfig.answerLang,
                 {
                     ...config,
                     apiKey: config.provider === 'gemini' ? config.geminiApiKey : config.openaiApiKey,
                     apiUrl: config.localApiUrl,
                     modelName: config.provider === 'gemini' ? config.geminiModel : config.localModelName
                 }
             );
             
             if (smartDistractors && smartDistractors.length >= 3) {
                 (card as any).aiDistractors = smartDistractors;
                 // console.log(`✅ [Prefetch] Ready for card ${idx + 1}`);
             }
         } catch(e) {
             console.warn(`[Prefetch] Failed for card ${idx + 1}`, e);
         } finally {
             (card as any).isFetchingDistractors = false;
         }
     };

     // Trigger prefetch for the next few cards
     // We start from currentIndex + 1
     for (let i = 1; i <= PREFETCH_BUFFER; i++) {
         processCard(currentIndex + i);
     }
     
     // Also trigger for CURRENT card if it wasn't done yet (handled by main effect, but good to ensure coverage)
     // Actually main effect handles current, so let's stick to future to separate concerns.
     
  }, [currentIndex, quizCards, quizConfig, config]);

  const renderGameIndicators = () => {
    if (quizConfig.gameMode === 'timed') {
      return (
        <div className="text-xl font-bold mb-2 text-orange-600 dark:text-orange-400">
          ⏱️ {t('quiz.game.timeLeft', { time: timeLeft })}
        </div>
      );
    }
    if (quizConfig.gameMode === 'survival') {
      return (
        <div className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">
          ❤️ {t('quiz.game.lives', { count: lives })}
        </div>
      );
    }
    if (quizConfig.gameMode === 'sprint') {
      return (
        <div className="text-xl font-bold mb-2 text-green-600 dark:text-green-400">
          🏃 {t('quiz.game.streak', { count: correctStreak })}
        </div>
      );
    }
    // Affichage du Combo pour les autres modes
    if (correctStreak > 1) {
        return (
            <div className="text-xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 animate-bounce">
                🔥 {correctStreak} {t('quiz.game.combo')}
            </div>
        );
    }
    return null;
  };

  // Populate MCQ options with AI Smart Generation
  useEffect(() => {
    if (effectiveQuizMode === 'mcq') {
      let distractors: string[] = [];
      setIsExplaining(false); // Reset explaining state just in case

      const nAnswer = normalize(answer);

      // 1. Check for cached AI distractors (PRIORITY over static data if enabled)
      if ((currentCard as any).aiDistractors) {
          finishOptionsSetup((currentCard as any).aiDistractors);
          return;
      }

      // 2. Existing Predefined Distractors
      if (currentCard?.type === 'mcq' && currentCard.mcqData) {
        distractors = (currentCard.mcqData.distractors || [])
          .map(d => {
            const val = d[quizConfig.answerLang] || Object.values(d)[0];
            return typeof val === 'string' ? val : '';
          })
          .filter(Boolean);
          
         if (distractors.length > 0) {
             finishOptionsSetup(distractors);
             return;
         }
      }

      // 3. Try to generate Smart Distractors (if AI Configured)
      // Logic: If user wants better quality, we take a moment to generate.
      const canGenerate = (config.provider === 'gemini' && config.geminiApiKey) || 
                          (config.provider === 'openai' && config.openaiApiKey) || 
                          (config.provider === 'local' && config.localApiUrl);

      if (canGenerate && !isRevealed) {
          // Show loading state implicitly by empty options
          setOptions([]); 
          setIsLoadingOptions(true);
          
          generateSmartDistractors(
              question,
              answer,
              quizConfig.questionLang,
              quizConfig.answerLang,
              {
                  ...config,
                  apiKey: config.provider === 'gemini' ? config.geminiApiKey : config.openaiApiKey,
                  apiUrl: config.localApiUrl,
                  modelName: config.provider === 'gemini' ? config.geminiModel : config.localModelName
              }
          ).then(smartDistractors => {
              if (smartDistractors && smartDistractors.length >= 3) {
                  // Cache them to avoid re-generating if user navigates back/forth
                  (currentCard as any).aiDistractors = smartDistractors;
                  finishOptionsSetup(smartDistractors);
              } else {
                  fallbackToRandomDistractors();
              }
          }).catch(() => {
              fallbackToRandomDistractors();
          }).finally(() => {
              setIsLoadingOptions(false);
          });
      } else {
          fallbackToRandomDistractors();
      }

      function fallbackToRandomDistractors() {
        // Generate distractors from other cards in the current quiz session
        const otherCards = quizCards.filter(c => {
          const t = (c as any).terms;
          const m = (c as any).mcqData;
          const cl = (c as any).clozeData;
          let cand = '';
          if (t) cand = t[quizConfig.answerLang];
          else if (m) cand = m.answer[quizConfig.answerLang];
          else if (cl) cand = (cl.answers[quizConfig.answerLang] || [])[0];
          else cand = (c as any)[quizConfig.answerLang];
          
          return normalize(cand || '') !== nAnswer;
        });

        const shuffled = [...otherCards].sort(() => 0.5 - Math.random());
        distractors = shuffled
          .map(c => {
            const t = (c as any).terms;
            const m = (c as any).mcqData;
            const cl = (c as any).clozeData;

            if (t) return t[quizConfig.answerLang];
            if (m) return m.answer[quizConfig.answerLang];
            if (cl) return (cl.answers[quizConfig.answerLang] || [])[0];
            return (c as any)[quizConfig.answerLang];
          })
          .filter((s): s is string => Boolean(s) && normalize(s) !== nAnswer);
          
        finishOptionsSetup(distractors);
      }

      function finishOptionsSetup(dists: string[]) {
          // Helper to strip surrounding quotes
          const clean = (s: string) => s.replace(/^["']+|["']+$/g, '').trim();

          // Cleaning answer for display
          const cleanAnswer = clean(answer);

          // Cleaning distractors
          const cleanDists = dists.map(clean);

          // Ensure we have unique choice among distractors AND exclude the answer
          // Case insensitive check to be safe
          const uniqueDistractors = Array.from(new Set(cleanDists))
             .filter(d => normalize(d) !== normalize(cleanAnswer))
             .slice(0, 3);
          
          const allOptions = [
            cleanAnswer,
            ...uniqueDistractors
          ];
          
          setOptions(allOptions.sort(() => Math.random() - 0.5));
      }
    }
  }, [currentCard, quizConfig, answer, quizCards, effectiveQuizMode, config]);

  // Keyboard shortcuts for MCQ
  useEffect(() => {
    if (effectiveQuizMode !== 'mcq' || isRevealed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= options.length) {
        handleOptionClick(options[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveQuizMode, isRevealed, options]);

  // Focus input on new card
  useEffect(() => {
    if ((effectiveQuizMode === 'classic' || effectiveQuizMode === 'dictation' || effectiveQuizMode === 'cloze') && inputRef.current) {
      // Petit délai pour s'assurer que le rendu est prêt
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentIndex, effectiveQuizMode]);

  // Global ArrowRight key for next card
  useEffect(() => {
    if (!isRevealed) return;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isRevealed, handleNext]);

  // ----- UI -----
  if (quizConfig.tutorCategory === 'arts') {
      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative text-text">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0 bg-background/50 pb-32">
                <div className="max-w-2xl mx-auto">
                    {onBackToLesson && (
                        <Button 
                            onClick={onBackToLesson} 
                            variant="secondary" 
                            size="sm" 
                            className="mb-4 w-full flex items-center justify-center bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                        >
                            <i className="fas fa-book-open mr-2"></i> {t('quiz.backToLesson')}
                        </Button>
                    )}
                    {renderArtsMode()}
                    
                    {/* Drawing Submission Modal */}
                    <DrawingSubmissionModal
                      isOpen={isDrawingModalOpen}
                      onClose={() => setIsDrawingModalOpen(false)}
                      challenge={question}
                      criteria={answer}
                      apiKey={config.geminiApiKey}
                      modelName={config.geminiModel}
                    />
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative text-text">
        <div className="flex-1 overflow-y-auto p-3 md:p-8 min-h-0 bg-background/50 pb-32">
            <div className="max-w-2xl mx-auto">
      {onBackToLesson && (
        <Button 
            onClick={onBackToLesson} 
            variant="secondary" 
            size="sm" 
            className="mb-4 w-full flex items-center justify-center bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
        >
            <i className="fas fa-book-open mr-2"></i> {t('quiz.backToLesson')}
        </Button>
      )}

      {/* Voice Settings Row */}
      {quizConfig.voiceEngine === 'local' && (
          <div className="flex justify-end mb-2 relative">
               <button 
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className="w-8 h-8 rounded-full bg-background-secondary border border-border hover:bg-background-tertiary flex items-center justify-center text-text-secondary transition-colors"
                  title={t('quiz.voice.settings')}
              >
                  <i className="fas fa-sliders-h text-sm"></i>
              </button>

              {showVoiceSettings && (
                  <div className="absolute top-10 right-0 z-50 bg-background rounded-xl shadow-2xl border border-border w-72 overflow-hidden animate-fade-in-down">
                      <div className="p-3 bg-background-secondary border-b border-border flex justify-between items-center">
                          <h3 className="font-bold text-sm text-text">{t('quiz.voice.title', { lang: speechLangConfig })}</h3>
                          <button onClick={() => setShowVoiceSettings(false)} className="text-text-muted hover:text-red-500">
                              <i className="fas fa-times"></i>
                          </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                          {availableVoices.length === 0 ? (
                              <div className="text-center p-4 text-sm text-text-muted">{t('quiz.voice.noVoice')}</div>
                          ) : (
                              availableVoices.map((voice, idx) => (
                                  <button
                                      key={`${voice.name}-${idx}`}
                                      onClick={() => {
                                          setSelectedVoice(voice);
                                          speak(t('quiz.voice.test'), 1, voice);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm flex items-center justify-between transition-colors ${
                                          selectedVoice?.name === voice.name 
                                              ? 'bg-primary/10 text-primary font-semibold border-primary border' 
                                              : 'hover:bg-background-secondary text-text'
                                      }`}
                                  >
                                      <span className="truncate">{voice.name}</span>
                                      {selectedVoice?.name === voice.name && <i className="fas fa-check"></i>}
                                  </button>
                              ))
                          )}
                      </div>
                  </div>
              )}
          </div>
      )}

      {renderGameIndicators()}
      
      <div className="mb-2 md:mb-4 text-xs md:text-sm text-text-secondary">
        {t('quiz.stats.cardCount', { current: currentIndex + 1, total: quizCards.length })}
      </div>

      <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 notranslate text-primary" translate="no">{question}</h2>

      {effectiveQuizMode === 'mcq' && isLoadingOptions && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-pulse bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-green-600 font-bold uppercase tracking-wider">{t('ai.generating') || "Génération..."}</p>
        </div>
      )}

      {effectiveQuizMode === 'mcq' && options.length > 0 && !isLoadingOptions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleOptionClick(opt)}
              disabled={isRevealed}
              className={`px-3 py-3 rounded border transition-all notranslate relative text-left pl-8 ${
                isRevealed && opt === answer
                  ? 'bg-success text-white border-success'
                  : isRevealed
                  ? 'bg-background-tertiary border-border'
                  : 'bg-background border-border hover:border-primary hover:bg-background-secondary'
              }`}
              translate="no"
            >
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-bold opacity-50 border border-current rounded px-1">
                {i + 1}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}

      {(effectiveQuizMode === 'classic' || effectiveQuizMode === 'dictation' || effectiveQuizMode === 'cloze') && (
        <div className="mb-4">
          {effectiveQuizMode === 'cloze' && (
              <div className="mb-6 p-4 bg-background-secondary border border-border rounded-xl text-center">
                  <p className="text-xl font-medium italic text-text-secondary">
                      {clozifiedSentence}
                  </p>
              </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !isRevealed) {
                handleShowAnswer();
              }
            }}
            className="w-full p-3 border-2 rounded-lg bg-background border-border notranslate"
            placeholder={effectiveQuizMode === 'cloze' ? t('quiz.placeholders.cloze') : t('quiz.placeholders.answer')}
            disabled={isRevealed}
            translate="no"
          />
          
          {/* Hints Display */}
          {hintLevel > 0 && !isRevealed && (
              <div className="mt-2 text-sm text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                  💡 {t('quiz.hints.label', { hint: hintLevel === 1 
                      ? `${answer.substring(0, 1)}${answer.length > 1 ? '...' : ''} (${answer.length} ${t('quiz.hints.chars')})` 
                      : `${answer.substring(0, Math.ceil(answer.length / 2))}... (${answer.length} ${t('quiz.hints.chars')})`
                  })}
              </div>
          )}

          {effectiveQuizMode === 'dictation' && (
            <div className="flex flex-col items-start mt-2">
                <button
                onClick={toggleListening}
                className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                >
                🎤 {t('setup.mode.dictation')}
                </button>
                {speechError && (
                    <div className="mt-2 text-xs text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded max-w-full">
                        ⚠️ {t('quiz.errors.mic', { error: speechError })}.<br/>
                        {t('quiz.errors.reload')}
                    </div>
                )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 mb-8 relative z-20">
        {/* Actions d'aide - Hidden while loading AI options */}
        {!isLoadingOptions && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            <button 
                onClick={speakQuestion} 
                className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 border-green-100 bg-green-50/50 text-green-700 hover:bg-green-100 transition-all font-bold shadow-sm min-h-[70px] md:min-h-[100px]"
            >
                <i className="fas fa-volume-up text-xl md:text-2xl mb-1 md:mb-2"></i>
                <span className="text-xs md:text-sm">{t('quiz.actions.listen')}</span>
            </button>

            {!isRevealed ? (
                <>
                    <button 
                        onClick={handleShowAnswer}
                        className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all font-bold shadow-sm min-h-[70px] md:min-h-[100px]"
                    >
                        {t('quiz.actions.reveal')}
                    </button>
                    <button 
                        onClick={() => setHintLevel(prev => Math.min(prev + 1, 2))} 
                        disabled={hintLevel >= 2}
                        className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all font-bold shadow-sm min-h-[70px] md:min-h-[100px] disabled:opacity-50"
                    >
                        <i className="fas fa-lightbulb text-xl md:text-2xl mb-1 md:mb-2"></i>
                        <span className="text-xs md:text-sm">{t('quiz.actions.hint')}</span>
                    </button>
                </>
            ) : (
                <>
                    {/* Bouton Expliquer */}
                    {normalize(userInput) !== normalize(answer) && config.selectedTutor && !explanation && (
                        <button 
                            onClick={handleExplain} 
                            disabled={isExplaining}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all font-bold shadow-sm min-h-[100px] disabled:opacity-50"
                        >
                            <span className="text-2xl mb-1">{config.selectedTutor.emoji}</span>
                            <span className="text-[11px] leading-tight">
                                {isExplaining ? t('quiz.actions.explain.thinking') : t('quiz.actions.explain.default')}
                            </span>
                        </button>
                    )}

                    {/* Bouton Mnémotechnique */}
                    {!mnemonic && (
                        <button
                            onClick={handleMnemonic}
                            disabled={isGeneratingMnemonic}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all font-bold shadow-sm min-h-[100px] disabled:opacity-50"
                        >
                            <span className="text-2xl mb-1">🧠</span>
                            <span className="text-[11px] leading-tight">
                                {isGeneratingMnemonic ? t('quiz.actions.mnemonic.generating') : t('quiz.actions.mnemonic.default')}
                            </span>
                        </button>
                    )}
                </>
            )}
          </div>

          {/* Validation / Navigation */}
          {isRevealed && (
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-xl space-y-4">
                 {quizConfig.isSRSMode ? (
                    <div className="space-y-4">
                        <div className="text-center font-bold text-gray-500 uppercase tracking-wider text-xs">
                            {t('quiz.srs.title')}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button onClick={() => handleSRSEvaluation(0)} className="py-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-md transition-all active:scale-95">❌ {t('quiz.srs.again')}</button>
                            <button onClick={() => handleSRSEvaluation(3)} className="py-4 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-md transition-all active:scale-95">😓 {t('quiz.srs.hard')}</button>
                            <button onClick={() => handleSRSEvaluation(4)} className="py-4 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 shadow-md transition-all active:scale-95">👍 {t('quiz.srs.good')}</button>
                            <button onClick={() => handleSRSEvaluation(5)} className="py-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-md transition-all active:scale-95">✅ {t('quiz.srs.easy')}</button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={handleNext} 
                        className="w-full py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-lg hover:bg-primary-hover hover:scale-[1.02] transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        {t('quiz.actions.next')} <i className="fas fa-arrow-right"></i>
                    </button>
                )}
                
                <button 
                    onClick={handleQuit} 
                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                >
                    <i className="fas fa-sign-out-alt"></i> {t('quiz.actions.quit')}
                </button>
            </div>
          )}
        </>
        )}
      </div>

      {isRevealed && (
        <div className={`mt-4 p-4 rounded-lg border-2 ${
          isAnswerCorrect(userInput, answer)
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">
              {isAnswerCorrect(userInput, answer) ? '✅' : '❌'}
            </span>
            <span className={`font-bold text-lg ${
              isAnswerCorrect(userInput, answer) ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {isAnswerCorrect(userInput, answer) ? t('quiz.feedback.correct') : t('quiz.feedback.incorrect')}
            </span>
          </div>
          
          <div className="space-y-2">
            <p className="font-medium text-text">
              {t('quiz.feedback.expected')} <span className="font-bold text-primary notranslate text-lg ml-2" translate="no">{answer}</span>
            </p>
            
            {!isAnswerCorrect(userInput, answer) && userInput && (
              <p className="text-text-secondary">
                {t('quiz.feedback.yours')} <span className="line-through opacity-70 ml-2">{userInput}</span>
              </p>
            )}
            
            {effectiveQuizMode === 'dictation' && similarityScore !== undefined && (
              <p className="text-sm text-text-secondary">
                {t('quiz.feedback.similarity', { score: similarityScore.toFixed(1) })}
              </p>
            )}
          </div>
                    {/* Bulle d'explication du Tuteur */}
            {explanation && config.selectedTutor && (
                <div className="mt-4 p-4 bg-background-tertiary rounded-xl border border-border shadow-sm relative animate-fade-in">
                    <div className="flex items-start gap-3">
                        <div className="text-3xl filter drop-shadow-md">
                            {config.selectedTutor.emoji}
                        </div>
                        <div>
                            <p className="font-bold text-sm text-text-muted mb-1">
                                {t('quiz.feedback.explains', { name: config.selectedTutor.name })}
                            </p>
                            <p className="text-text italic leading-relaxed">
                                "{explanation}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulle Mnémonique */}
            {mnemonic && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm relative animate-fade-in">
                    <div className="flex items-start gap-3">
                        <div className="text-3xl filter drop-shadow-md">
                            🧠
                        </div>
                        <div>
                            <p className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-1">
                                {t('quiz.feedback.mnemonicLabel')}
                            </p>
                            <p className="text-text italic leading-relaxed font-medium">
                                {mnemonic}
                            </p>
                        </div>
                    </div>
                </div>
            )}
          
          <div className="mt-4 pt-3 border-t border-border/50 text-xs text-text-muted flex items-center gap-2">
            <kbd className="px-2 py-1 bg-background rounded border border-border font-sans font-semibold">→ Flèche droite</kbd>
            <span>{t('quiz.feedback.nextHint')}</span>
          </div>
        </div>
      )}
      
      {/* Modal de confirmation personnalisée pour Quitter */}
      {showQuitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-scale-in text-center">
                   <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                      <i className="fas fa-sign-out-alt"></i>
                  </div>
                  <h3 className="text-2xl font-black text-text mb-2">{t('quiz.quit.title')}</h3>
                  <p className="text-text-muted mb-8 leading-relaxed">
                      {t('quiz.quit.message')}
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={confirmQuit}
                          className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg transition-all active:scale-95"
                          translate="no"
                      >
                          {t('quiz.quit.confirm')}
                      </button>
                      <button 
                          onClick={cancelQuit}
                          className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
                      >
                          {t('quiz.quit.cancel')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Drawing Submission Modal */}
      {(() => {
        return quizConfig.tutorId === 'maitre-leonard' && (
          <DrawingSubmissionModal
            isOpen={isDrawingModalOpen}
            onClose={() => setIsDrawingModalOpen(false)}
            challenge={question}
            criteria={answer}
            apiKey={config.geminiApiKey}
            modelName={config.geminiModel}
          />
        );
      })()}
                </div>
            </div>
        </div>
  );
};