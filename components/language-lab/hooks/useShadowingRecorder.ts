import { useState, useRef } from 'react';

/** Détecte le format audio supporté par MediaRecorder (Safari = mp4, Chrome = webm) */
function getSupportedMimeType(): string {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
        '',
    ];
    for (const type of candidates) {
        if (!type || MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
}

export const useShadowingRecorder = (
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
    t: (key: string) => string
) => {
    const [isRecordingShadow, setIsRecordingShadow] = useState(false);
    const [shadowAudioSrc, setShadowAudioSrc] = useState<string | null>(null);
    const shadowChunks = useRef<BlobPart[]>([]);
    const shadowRecorder = useRef<MediaRecorder | null>(null);

    const startShadowRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            shadowRecorder.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            shadowChunks.current = [];

            shadowRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) shadowChunks.current.push(e.data);
            };

            shadowRecorder.current.onstop = () => {
                const actualMimeType = mimeType || 'audio/mp4';
                const blob = new Blob(shadowChunks.current, { type: actualMimeType });
                const url = URL.createObjectURL(blob);
                setShadowAudioSrc(url);
                stream.getTracks().forEach(track => track.stop());
            };

            shadowRecorder.current.start();
            setIsRecordingShadow(true);
        } catch (err) {
            console.error('Micro access denied', err);
            showToast(t('lab.errors.micDenied') || 'Accès microphone refusé', 'error');
        }
    };

    const stopShadowRecording = () => {
        if (shadowRecorder.current && shadowRecorder.current.state === 'recording') {
            shadowRecorder.current.stop();
            setIsRecordingShadow(false);
        }
    };

    return {
        isRecordingShadow,
        shadowAudioSrc,
        setShadowAudioSrc,
        startShadowRecording,
        stopShadowRecording,
    };
};
