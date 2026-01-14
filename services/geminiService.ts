import { invoke } from '@tauri-apps/api/tauri';
import { QuizConfig } from "../types";

// This file implements the Gemini API Text-to-Speech functionality via secure Tauri backend.

// Helper function to decode raw PCM audio data into an AudioBuffer.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Global cache for audio buffers to avoid repeated API calls for the same text.
const audioCache = new Map<string, AudioBuffer>();
// Per Web Audio API best practices, a single AudioContext should be used for decoding.
const audioContextForDecoding = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

/**
 * Fetches audio from the Gemini API via secure Tauri backend and returns an AudioBuffer.
 * It uses a cache to avoid re-fetching the same audio.
 */
export async function getAudioBuffer(text: string, config: QuizConfig): Promise<AudioBuffer | null> {
    const cacheKey = `${text}-${config.questionLang}-${config.voiceGender || 'default'}`;
    if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey)!;
    }
    
    // Voice selection logic (shared)
    const voiceName = (config.voiceGender || 'female') === 'female' ? 'Kore' : 'Puck'; // Kore/Puck names are for Tauri logic
    // For cloud API, we might map this to locale specific voices later

    try {
        let audioBytes: Uint8Array | number[] | null = null;
        let isWebMode = false;

        // 1. Try Tauri Backend first (Rust)
        // Check if window.__TAURI__ exists (indicates Tauri environment)
        if (typeof window !== 'undefined' && '__TAURI__' in window) {
            try {
                audioBytes = await invoke<number[]>('generate_speech', { text, voiceName });
            } catch (tauriError) {
                console.warn("Tauri backend call failed, falling back to Web API...", tauriError);
                isWebMode = true;
            }
        } else {
            isWebMode = true;
        }

        // 2. Fallback to Web API (Vercel Serverless Function)
        if (isWebMode) {
             const response = await fetch('/api/gemini/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voiceName: config.voiceGender === 'male' ? 'fr-FR-Neural2-B' : 'fr-FR-Neural2-A' }) // Using Google Cloud TTS voice names
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Web API Error: ${errorText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            // Web Audio API decodeAudioData expects ArrayBuffer, not Uint8Array necessarily, but typical implementations handle it.
            // However, our decodeAudioData helper below expects Uint8Array (PCM raw) for Tauri case
            // The Web API returns an MP3 file, so we should use context.decodeAudioData directly for MP3.
            
            // Branching decode logic
            const audioBuffer = await audioContextForDecoding.decodeAudioData(arrayBuffer);
            audioCache.set(cacheKey, audioBuffer);
            return audioBuffer;
        }

        // 3. Process Audio (Tauri Case - Raw PCM)
        if (audioBytes) {
            const uint8Array = new Uint8Array(audioBytes);
            const audioBuffer = await decodeAudioData(uint8Array, audioContextForDecoding, 24000, 1);
            audioCache.set(cacheKey, audioBuffer);
            return audioBuffer;
        }
        
        return null;

    } catch (error) {
        console.error("Error generating speech:", error);
        // Toast notification would be better here instead of alert
        return null;
    }
}

/**
 * Plays an AudioBuffer using the provided AudioContext.
 * Calls the onEnded callback when playback is finished.
 */
export function playAudioBuffer(buffer: AudioBuffer, context: AudioContext, onEnded?: () => void) {
    if (context.state === 'suspended') {
        context.resume();
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    if (onEnded) {
        source.onended = onEnded;
    }
    source.start();
}
