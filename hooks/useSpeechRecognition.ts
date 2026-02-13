import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechRecognitionStatus, DictationResult } from '../types';
import { isAnswerAcceptable, calculateSimilarity } from '../utils/phonetic';

// Définition de l'interface pour l'API Web Speech (non standard en TS par défaut)
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

import { useToast } from '../contexts/ToastContext';

export const useSpeechRecognition = (language: string = 'fr-FR') => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

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
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = language;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started for language:', language);
      isListeningRef.current = true;
      setStatus('listening');
      setError(null);
    };

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // On affiche l'intermédiaire si le final n'est pas encore là
      const newTranscript = finalTranscript || interimTranscript;
      console.log('📝 Transcript:', newTranscript, '(lang:', language, ')');
      setTranscript(newTranscript);
    };

    recognitionRef.current.onerror = (event: any) => {
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
      // Gérer spécifiquement l'erreur de permission
      if (event.error === 'not-allowed') {
        console.error('🚫 Microphone permission denied');
        const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        let detailedError = isTauri 
            ? 'Permission microphone refusée (macOS). Vérifiez les Réglages Système.'
            : isAndroid 
                ? 'Accès refusé. Cliquez sur le Cadenas 🔒 > Permissions > Microphone > Autoriser. Si bloqué, réinitialisez les permissions du site.'
                : 'Permission microphone refusée. Veuillez l\'autoriser dans les paramètres du navigateur.';

        setError(detailedError);
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
      
      // Gérer spécifiquement l'erreur de service non autorisé (souvent lié à la Dictée macOS/iOS désactivée)
      if (event.error === 'service-not-allowed') {
        const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isTauri) {
          setError('Service de dictée bloqué. Vérifiez que la "Dictée" est activée dans Réglages Système > Clavier.');
        } else if (isIOS) {
          setError('Service de dictée non autorisé. Activez la "Dictée" dans les Réglages de l\'iPad (Général > Clavier).');
        } else {
          setError('Service de dictée non autorisé par le navigateur ou désactivé sur votre système.');
        }

        setStatus('error');
        isListeningRef.current = false;
        
        setTimeout(() => {
          if (isTauri) {
            showToast('🎙️ SERVICE DE DICTÉE DÉSACTIVÉ. Activez "Dictée" dans Réglages Système > Clavier.', 'error', 10000);
          } else if (isIOS) {
            showToast('🎙️ DICTÉE IPAD DÉSACTIVÉE. Allez dans Réglages > Général > Clavier et activez "Activer la Dictée".', 'error', 15000);
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

    // ANDROID FIX: Force permission request explicitly via getUserMedia
    // This triggers the native browser prompt better than the SpeechRecognition API handles it on some Android browsers.
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release the stream as we only needed to trigger the permission check
        stream.getTracks().forEach(track => track.stop());
    } catch (permErr) {
        console.warn('⚠️ Explicit getUserMedia permission check failed or cancelled. Proceeding with SpeechRecognition anyway, but it might fail.', permErr);
        // We don't block here, we let the standard error handler catch the 'not-allowed' from recognition.start()
        // so the UI feedback remains consistent.
    }
    
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
      confidence: 1, // L'API ne donne pas toujours la confiance facilement ici, on simplifie
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
