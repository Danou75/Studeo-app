import { useState, useRef, useCallback } from 'react';
import { SpeechRecognitionStatus } from '../types';

/**
 * Détecte si l'app tourne en mode PWA standalone sur iOS (iPad/iPhone).
 * En mode PWA, webkitSpeechRecognition est bloqué sur iPadOS ≤ 16.
 */
export function isIOSStandalonePWA(): boolean {
  const isStandalone = (navigator as any).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS && isStandalone;
}

/**
 * Détecte tout appareil iOS/iPadOS (Safari, Chrome iOS, mode standalone ou non).
 * webkitSpeechRecognition est instable sur iOS :
 *  - mode `continuous` se coupe prématurément sans déclencher onresult
 *  - langues non-françaises échouent silencieusement
 *  - comportement différent selon le modèle d'iPad et la version d'iPadOS
 * On utilise systématiquement le fallback MediaRecorder+Gemini sur iOS.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad Pro M4 / modern iPads report 'MacIntel' with touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Détecte les formats audio supportés par MediaRecorder pour choisir le meilleur.
 * iOS ne supporte pas webm — il faut utiliser audio/mp4 ou audio/aac.
 */
function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
    '',  // Laisser le navigateur choisir en dernier recours
  ];
  for (const type of candidates) {
    if (!type || MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

interface UseMediaRecorderTranscribeOptions {
  language?: string;
  apiKey?: string;
  onTranscript?: (text: string) => void;
  onError?: (err: string) => void;
  onStatusChange?: (status: SpeechRecognitionStatus) => void;
}

/**
 * Hook de fallback Speech-to-Text pour iOS PWA.
 *
 * Utilise MediaRecorder (fonctionne dans tous les contextes, y compris PWA iOS)
 * pour enregistrer l'audio, puis envoie le Blob à /api/gemini/transcribe
 * (Gemini 1.5 Flash) pour la transcription.
 *
 * À utiliser UNIQUEMENT quand isIOSStandalonePWA() === true.
 */
export function useMediaRecorderTranscribe({
  language = 'fr-FR',
  apiKey,
  onTranscript,
  onError,
  onStatusChange,
}: UseMediaRecorderTranscribeOptions = {}) {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const updateStatus = useCallback((s: SpeechRecognitionStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    updateStatus('error');
    onError?.(msg);
  }, [onError, updateStatus]);

  const startListening = useCallback(async () => {
    // Nettoyer si déjà en cours
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setTranscript('');
    setError(null);
    chunksRef.current = [];

    try {
      // Demander la permission micro — fonctionne en iOS PWA contrairement à webkitSpeechRecognition
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      console.log('[MediaRecorder Fallback] Using mimeType:', mimeType || 'browser default');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Libérer le micro tout de suite
        streamRef.current?.getTracks().forEach(t => t.stop());

        if (chunksRef.current.length === 0) {
          handleError('Aucun audio enregistré.');
          return;
        }

        updateStatus('processing');

        try {
          const actualMimeType = mimeType || 'audio/mp4';
          const audioBlob = new Blob(chunksRef.current, { type: actualMimeType });

          // Convertir en base64 pour l'envoi à l'API via FileReader (plus robuste sur mobile)
          const audioBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });

          console.log(`[MediaRecorder Fallback] Sending ${(audioBlob.size / 1024).toFixed(1)}KB to /api/gemini/transcribe`);

          const response = await fetch('/api/gemini/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: actualMimeType,
              language,
              apiKey,
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Erreur serveur ${response.status}`);
          }

          const data = await response.json();
          const result = (data.transcript || '').trim();

          console.log('[MediaRecorder Fallback] Transcript:', result);
          setTranscript(result);
          onTranscript?.(result);
          updateStatus('idle');

        } catch (transcribeErr: any) {
          console.error('[MediaRecorder Fallback] Transcription failed:', transcribeErr);
          handleError(`Transcription échouée : ${transcribeErr.message}`);
        }
      };

      recorder.onerror = (e: Event) => {
        console.error('[MediaRecorder Fallback] Recorder error:', e);
        streamRef.current?.getTracks().forEach(t => t.stop());
        handleError('Erreur lors de l\'enregistrement audio.');
      };

      // Collecter toutes les données à l'arrêt (pas de timeslice = un seul chunk final)
      recorder.start();
      updateStatus('listening');
      console.log('[MediaRecorder Fallback] Recording started');

    } catch (permErr: any) {
      console.error('[MediaRecorder Fallback] Permission error:', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        handleError('Accès au microphone refusé. Vérifiez les permissions dans Réglages > Safari (ou Chrome).');
      } else {
        handleError(`Impossible d'accéder au microphone : ${permErr.message}`);
      }
    }
  }, [language, onTranscript, handleError, updateStatus]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[MediaRecorder Fallback] Stopping recording...');
      mediaRecorderRef.current.stop(); // Déclenche onstop → transcription
    }
  }, []);

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
    isSupported: typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}
