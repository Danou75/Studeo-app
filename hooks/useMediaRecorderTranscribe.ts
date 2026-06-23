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
  // Ref pour toujours lire la valeur COURANTE de apiKey dans le handler onstop
  // (useCallback mémorise la closure — sans ref, apiKey serait stale si la config
  //  se charge de façon asynchrone après le premier render du hook).
  const apiKeyRef = useRef<string>(apiKey || '');
  apiKeyRef.current = apiKey || ''; // Mise à jour à chaque render

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

          const sizeKB = (audioBlob.size / 1024).toFixed(1);
          const currentApiKey = apiKeyRef.current;
          let result = '';

          /**
           * Appel au serveur Vercel (utilise VITE_GEMINI_API_KEY côté serveur).
           * Utilisé comme fallback quand la clé directe est absente ou épuisée (429).
           */
          const callServer = async (): Promise<string> => {
            console.log(`[MediaRecorder] Server fallback — ${sizeKB}KB`);
            const serverRes = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64,
                mimeType: actualMimeType,
                language,
                // Passer la clé utilisateur si disponible — le serveur l'utilise
                // en priorité sur sa propre clé Vercel (VITE_GEMINI_API_KEY)
                apiKey: currentApiKey || '',
              }),
            });

            if (!serverRes.ok) {
              const errData = await serverRes.json().catch(() => ({}));
              // Cas spécial : clé Gemini manquante sur le serveur
              if (errData.code === 'MISSING_GEMINI_KEY') {
                throw new Error(
                  '🎤 La transcription vocale n\'est pas disponible.\n' +
                  'Vous utilisez OpenRouter, mais la reconnaissance vocale sur iPad/iPhone requiert aussi une clé API Gemini.\n' +
                  '→ Ajoutez votre clé Gemini dans Paramètres > IA (gratuite sur aistudio.google.com)'
                );
              }
              throw new Error(errData.error || `erreur serveur ${serverRes.status}`);
            }

            const serverData = await serverRes.json();
            return (serverData.transcript || '').trim();
          };

          if (currentApiKey) {
            // ── Tentative 1 : appel direct Gemini depuis le browser ──────────
            console.log(`[MediaRecorder] Direct Gemini call — ${sizeKB}KB, mimeType: ${actualMimeType}`);

            const langHint = language?.startsWith('fr') ? 'français' :
                             language?.startsWith('en') ? 'English' :
                             language?.startsWith('es') ? 'español' :
                             language?.startsWith('de') ? 'Deutsch' :
                             language?.startsWith('it') ? 'italiano' :
                             language?.startsWith('pt') ? 'português' : (language || 'fr-FR');

            const prompt = `Transcris exactement ce qui est dit dans cet enregistrement audio en ${langHint}. ` +
              `Retourne UNIQUEMENT la transcription, sans explication, sans guillemets. ` +
              `Si rien n'est audible, retourne une chaîne vide.`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentApiKey}`;
            const geminiRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inline_data: { mime_type: actualMimeType, data: audioBase64 } },
                    { text: prompt },
                  ],
                }],
                generationConfig: { temperature: 0, maxOutputTokens: 1000 },
              }),
            });

            if (!geminiRes.ok) {
              if (geminiRes.status === 429) {
                // ── Tentative 2 : quota épuisé → fallback serveur Vercel ───
                console.warn('[MediaRecorder] Quota 429 on direct key — falling back to server endpoint...');
                result = await callServer();
              } else {
                const errText = await geminiRes.text().catch(() => '');
                throw new Error(`Gemini API ${geminiRes.status}: ${errText.slice(0, 200)}`);
              }
            } else {
              const geminiData = await geminiRes.json();
              result = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
            }

          } else {
            // ── Pas de clé utilisateur → serveur directement ────────────────
            result = await callServer();
          }

          console.log('[MediaRecorder] Transcript:', result.slice(0, 100));
          setTranscript(result);
          onTranscript?.(result);
          updateStatus('idle');

        } catch (transcribeErr: any) {
          console.error('[MediaRecorder Fallback] Transcription failed:', transcribeErr);
          handleError(transcribeErr.message || 'Erreur inconnue');
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
