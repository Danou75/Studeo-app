import { useState, useRef } from 'react';

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
            shadowRecorder.current = new MediaRecorder(stream);
            shadowChunks.current = [];
            
            shadowRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) shadowChunks.current.push(e.data);
            };
            
            shadowRecorder.current.onstop = () => {
                const blob = new Blob(shadowChunks.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setShadowAudioSrc(url);
                stream.getTracks().forEach(track => track.stop());
            };
            
            shadowRecorder.current.start();
            setIsRecordingShadow(true);
        } catch (err) {
            console.error("Micro access denied", err);
            showToast(t('lab.errors.micDenied') || 'Access to microphone denied', 'error');
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
        stopShadowRecording
    };
};
