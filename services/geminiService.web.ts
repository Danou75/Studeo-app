import { QuizConfig } from "../types";

// This file implements Text-to-Speech functionality for web deployment.
// Uses browser's native SpeechSynthesis API (no external API needed).

/**
 * Placeholder function for web version - returns null as we use local speech synthesis
 */
export async function getAudioBuffer(_text: string, _config: QuizConfig): Promise<AudioBuffer | null> {
    // For web deployment, we don't use audio buffers
    // Speech synthesis is handled directly in the UI components
    return null;
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
