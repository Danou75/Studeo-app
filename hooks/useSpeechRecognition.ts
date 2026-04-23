import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechRecognitionStatus, DictationResult } from '../types';
import { isAnswerAcceptable, calculateSimilarity } from '../utils/phonetic';
import { isIOSDevice, useMediaRecorderTranscribe } from './useMediaRecorderTranscribe';
import { useAIConfig } from '../contexts/AIConfigContext';

// Définition de l'interface pour l'API Web Speech (non standard en TS par défaut)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

import { useToast } from '../contexts/ToastContext';

/**
 * Hook interne — implémentation native via webkitSpeechRecognition.
 * Ne pas utiliser directement, utiliser useSpeechRecognition() à la place.
 */
const useNativeSpeechRecognition = (language: string = 'fr-FR') => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const retryRef = useRef<number>(0);

  useEffect(() => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

    // WORKAROUND: In Tauri Dev environment on macOS, initializing SpeechRecognition
    // crashes the app due to TCC/Info.plist issues with the raw binary.
    // We strictly disable it in DEV mode unless we're in a browser (non-tauri).
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    const isDev = import.meta.env.DEV;

    if (isTauri && isDev) {
      console.warn('🚧 Speech Recognition is disabled in Tauri Dev mode to prevent SIGABRT crashes. Use a production build or web mode to test.');
      setError('Reconnaissance vocale désactivée en mode DEV (utilisez le Build)');
      return;
    }

    if (!SpeechRecognitionConstructor) {
      console.error('❌ Speech recognition not supported');
      setError('Speech recognition not supported in this browser.');
      return;
    }

    // Arrêter et nettoyer l'ancienne instance si elle existe
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping old recognition:', e);
      }
    }

    // Créer une NOUVELLE instance pour s'assurer que la langue est bien prise en compte
    console.log('🔄 Creating new speech recognition instance for language:', language);
    recognitionRef.current = new SpeechRecognitionConstructor();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = language;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started (CONTINUOUS MODE) for language:', language);
      isListeningRef.current = true;
      setStatus('listening');
      setError(null);
    };

    recognitionRef.current.onresult = (event: any) => {
      let fullTranscript = '';
      
      // On boucle sur l'intégralité des résultats fournis par l'API pour reconstruire la phrase complète
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      
      console.log('📝 Full Transcript:', fullTranscript, '(lang:', language, ')');
      setTranscript(fullTranscript);
    };

    recognitionRef.current.onerror = async (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      
      // Ignorer l'erreur "no-speech" qui est normale
      if (event.error === 'no-speech') {
        console.log('ℹ️ No speech detected, stopping...');
        isListeningRef.current = false;
        setStatus('idle');
        return;
      }
      
      // Ignorer l'erreur "aborted" qui arrive lors d'un stop manuel
      if (event.error === 'aborted') {
        console.log('ℹ️ Recognition aborted');
        isListeningRef.current = false;
        setStatus('idle');
        return;
      }
      
      // Gérer spécifiquement l'erreur de permission
      if (event.error === 'not-allowed') {
        console.error('🚫 Microphone permission denied');
        const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        // RETRY LOGIC FOR ANDROID
        if (isAndroid && retryRef.current === 0) {
             console.log('🔄 First fail on Android. Attempting getUserMedia hack to force permission...');
             retryRef.current++;
             try {
                 const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                 // Wait a bit just in case
                 await new Promise(r => setTimeout(r, 200));
                 stream.getTracks().forEach(t => t.stop());
                 console.log('✅ Permission granted via hack. Retrying recognition...');
                 
                 if (recognitionRef.current) {
                    setError(null);
                    setStatus('listening');
                    recognitionRef.current.start();
                 }
                 return; // Don't show error yet!
             } catch (hackErr: any) {
                 console.warn('❌ Hack failed:', hackErr);
                 // Fallthrough to standard error display with precise message
                 setError(`Erreur micro Android : permission refusée. Vérifiez que le site est autorisé via le cadenas 🔒.`);
             }
        } else {
            let detailedError = isTauri 
                ? 'Permission microphone refusée (macOS). Vérifiez les Réglages Système.'
                : isAndroid 
                    ? 'Accès refusé. Cliquez sur le Cadenas 🔒 > Permissions > Microphone > Autoriser. Si bloqué, réinitialisez les permissions du site.'
                    : 'Permission microphone refusée. Veuillez l\'autoriser dans les paramètres du navigateur.';
            setError(detailedError);
        }

        setStatus('error');
        isListeningRef.current = false;
        
        // Afficher une alerte adaptée à l'environnement
        setTimeout(() => {
          if (isTauri) {
            showToast('🎤 Permission requise (macOS). Vérifiez "Confidentialité et sécurité" > "Microphone".', 'error', 10000);
          } else if (isAndroid) {
            showToast('🎤 Android : Cliquez sur le cadenas 🔒 > Permissions pour débloquer le micro.', 'error', 15000);
          } else {
            showToast('🎤 Permission requise. Cliquez sur 🔒 > Paramètres du site.', 'error', 10000);
          }
        }, 100);
        return;
      }
      
      // Gérer spécifiquement l'erreur de service non autorisé
      // Sur iOS en mode navigateur (non-PWA), la Dictée est peut-être vraiment désactivée.
      // En mode PWA, ce cas ne devrait plus arriver car le fallback MediaRecorder est utilisé.
      if (event.error === 'service-not-allowed') {
        const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = (navigator as any).standalone === true;

        if (isTauri) {
          setError('Service de dictée bloqué. Vérifiez que la "Dictée" est activée dans Réglages Système > Clavier.');
        } else if (isIOS && isStandalone) {
          // Mode PWA Safari sur iOS — ne devrait pas arriver ici (le fallback doit être actif)
          setError('Microphone non disponible en mode app. Réessayez depuis Safari ou Chrome.');
        } else if (isIOS) {
          setError('Activez la "Dictée" dans Réglages iOS > Général > Clavier > Activer la Dictée.');
        } else {
          setError('Service de dictée non autorisé par le navigateur ou désactivé sur votre système.');
        }

        setStatus('error');
        isListeningRef.current = false;
        
        setTimeout(() => {
          if (isTauri) {
            showToast('🎙️ SERVICE DE DICTÉE DÉSACTIVÉ. Activez "Dictée" dans Réglages Système > Clavier.', 'error', 10000);
          } else if (isIOS && isStandalone) {
            showToast('🎙️ Microphone indisponible en mode app raccourci. Ouvrez Studeo dans Safari pour utiliser le micro.', 'error', 15000);
          } else if (isIOS) {
            showToast('🎙️ Activez la Dictée : Réglages > Général > Clavier > Activer la Dictée.', 'error', 15000);
          } else {
            showToast('🎙️ Service de dictée non autorisé. Vérifiez les paramètres de votre navigateur ou de votre système.', 'error', 8000);
          }
        }, 100);
        return;
      }

      setError(event.error);
      setStatus('error');
      isListeningRef.current = false;
    };

    recognitionRef.current.onend = () => {
      console.log('🛑 Speech recognition ended');
      isListeningRef.current = false;
      
      // Ne changer le statut que si on n'est pas déjà en erreur
      if (status !== 'error') {
        setStatus('idle');
      }
    };

    return () => {
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition on cleanup:', e);
        }
      }
    };
  }, [language]); // Recréer complètement l'objet à chaque changement de langue

  const startListening = useCallback(async () => {
    console.log('🎬 Attempting to start listening...', { 
      hasRecognition: !!recognitionRef.current, 
      currentStatus: status,
      isListening: isListeningRef.current 
    });

    // ANDROID: Reset retry count on new start attempt
    if (retryRef.current > 0) retryRef.current = 0;

    // Reset error
    setError(null);
    
    if (!recognitionRef.current) {
      console.error('❌ No recognition object available');
      setError('Speech recognition not initialized');
      return;
    }

    // Arrêter d'abord si déjà en cours
    if (isListeningRef.current) {
      console.log('⚠️ Already listening, stopping first...');
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping before restart:', e);
      }
      // Attendre un peu avant de redémarrer
      setTimeout(() => {
        startListening();
      }, 100);
      return;
    }

    try {
      setTranscript('');
      setError(null);
      recognitionRef.current.start();
      console.log('✅ Recognition start() called');
    } catch (e: any) {
      console.error('❌ Failed to start recognition:', e);
      
      // Si l'erreur est "already started", forcer un stop puis restart
      if (e.message && e.message.includes('already')) {
        console.log('🔄 Forcing stop and restart...');
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            startListening();
          }, 100);
        } catch (stopError) {
          console.error('Error in force restart:', stopError);
        }
      } else {
        setError('Impossible de démarrer la reconnaissance vocale');
        setStatus('error');
      }
    }
  }, [status]);

  const stopListening = useCallback(() => {
    console.log('🛑 Attempting to stop listening...', { 
      hasRecognition: !!recognitionRef.current,
      isListening: isListeningRef.current 
    });
    
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
        setStatus('processing');
        console.log('✅ Recognition stop() called');
      } catch (e) {
        console.error('❌ Error stopping recognition:', e);
      }
    }
  }, []);

  const validateAnswer = useCallback((correctAnswer: string): DictationResult => {
    const similarity = calculateSimilarity(transcript, correctAnswer);
    const isCorrect = isAnswerAcceptable(transcript, correctAnswer);

    return {
      transcript,
      confidence: 1,
      isCorrect,
      similarity
    };
  }, [transcript]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    status,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    validateAnswer,
    isSupported: !!((window as unknown as IWindow).webkitSpeechRecognition || (window as unknown as IWindow).SpeechRecognition)
  };
};

/**
 * Hook public — Speech Recognition avec fallback automatique pour iOS PWA.
 *
 * Sur iPad Air 2 / anciens iPads en mode "Ajouté à l'écran d'accueil" (standalone PWA),
 * webkitSpeechRecognition lève "service-not-allowed" même si la Dictée est activée.
 * → On bascule automatiquement sur MediaRecorder + Gemini AI dans ce contexte.
 *
 * En Safari/Chrome normal et sur tous les autres appareils → comportement inchangé.
 */
export const useSpeechRecognition = (language: string = 'fr-FR') => {
  // Les deux hooks sont TOUJOURS appelés (règle des hooks React),
  // mais seul l'un des deux est actif selon le contexte détecté.
  //
  // On utilise le fallback MediaRecorder+Gemini sur TOUS les appareils iOS
  // (iPad/iPhone en Safari normal, Chrome iOS, ou PWA standalone) car
  // webkitSpeechRecognition est instable sur iOS :
  //   • mode `continuous` se coupe sans déclencher onresult
  //   • langues non-françaises échouent silencieusement
  //   • comportement erratique sur iPad Pro M4 / iPadOS 17+
  const isIOSFallback = typeof window !== 'undefined' && isIOSDevice();

  const nativeRecognition = useNativeSpeechRecognition(language);

  // Tentative de récupération de la clé API si disponible dans le contexte (pour bypass limiter)
  let apiKey = '';
  try {
    const { config } = useAIConfig();
    if (config?.geminiApiKey) apiKey = config.geminiApiKey;
  } catch (e) {
    // Si hors contexte, utiliser le fallback système
  }

  const pwaFallback = useMediaRecorderTranscribe({ language, apiKey });

  if (isIOSFallback) {
    // iOS (tout contexte) → MediaRecorder + Gemini
    console.log('📱 iOS detected: using MediaRecorder fallback for speech recognition');
    return {
      ...pwaFallback,
      validateAnswer: (correctAnswer: string): DictationResult => {
        const similarity = calculateSimilarity(pwaFallback.transcript, correctAnswer);
        const isCorrect = isAnswerAcceptable(pwaFallback.transcript, correctAnswer);
        return { transcript: pwaFallback.transcript, confidence: 1, isCorrect, similarity };
      },
    };
  }

  // Mode normal → webkitSpeechRecognition natif
  return nativeRecognition;
};
