import React, { useState, useRef } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { readBinaryFile } from '@tauri-apps/api/fs';
import { Button } from './ui/Button';
import { evaluateDrawing, DrawingEvaluation } from '../services/drawingEvaluationService';

interface DrawingSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    challenge: string;
    criteria: string;
    apiKey: string;
    provider?: string;
    modelName?: string;
    tutorName?: string;
}

export const DrawingSubmissionModal: React.FC<DrawingSubmissionModalProps> = ({
    isOpen,
    onClose,
    challenge,
    criteria,
    apiKey,
    provider = 'gemini',
    modelName,
    tutorName = 'Maître Léonard'
}) => {
    const [mode, setMode] = useState<'select' | 'upload' | 'webcam' | 'evaluating' | 'result'>('select');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [evaluation, setEvaluation] = useState<DrawingEvaluation | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    if (!isOpen) return null;

    const handleFileUpload = async () => {
        try {
            setError(null);
            // @ts-ignore
            if (window.__TAURI_IPC__) {
                // Tauri Desktop
                const selected = await open({
                    multiple: false,
                    filters: [{
                        name: 'Images',
                        extensions: ['png', 'jpg', 'jpeg', 'webp']
                    }]
                });

                if (selected && typeof selected === 'string') {
                    const contents = await readBinaryFile(selected);
                    let binary = '';
                    const bytes = new Uint8Array(contents);
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);
                    setImagePreview(`data:image/jpeg;base64,${base64}`);
                    setMode('upload');
                }
            } else {
                // Web fallback
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            setImagePreview(reader.result as string);
                            setMode('upload');
                        };
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
            }
        } catch (err) {
            console.error(err);
            setError("Erreur lors du chargement de l'image.");
        }
    };

    const startWebcam = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setMode('webcam');
        } catch (err) {
            console.error(err);
            setError("Impossible d'accéder à la webcam. Vérifiez les permissions.");
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setImagePreview(dataUrl);
                stopWebcam();
                setMode('upload');
            }
        }
    };

    const stopWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleEvaluate = async () => {
        if (!imagePreview) return;
        
        setMode('evaluating');
        setError(null);

        try {
            // Extraire le base64 pur (sans le préfixe data:image/...)
            const base64Data = imagePreview.split(',')[1];
            
            const result = await evaluateDrawing(
                base64Data,
                challenge,
                criteria,
                apiKey,
                provider,
                modelName
            );

            setEvaluation(result);
            setMode('result');
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erreur lors de l'évaluation.");
            setMode('upload');
        }
    };

    const handleClose = () => {
        stopWebcam();
        setMode('select');
        setImagePreview(null);
        setEvaluation(null);
        setError(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col m-4 border-2 border-primary/30">
                {/* Header */}
                <div className="p-6 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
                            <span className="text-4xl">📸</span> Soumission Photo
                        </h2>
                        <button onClick={handleClose} className="text-text-muted hover:text-text transition-colors">
                            <i className="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <p className="text-sm text-text-secondary mt-2">{tutorName} va évaluer votre travail</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Mode Selection */}
                    {mode === 'select' && (
                        <div className="space-y-6">
                            <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                                <p className="text-sm text-text"><strong>Défi :</strong> {challenge}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={handleFileUpload}
                                    className="p-8 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <i className="fas fa-upload text-5xl text-primary mb-4 group-hover:scale-110 transition-transform"></i>
                                    <h3 className="text-xl font-bold mb-2">Charger une image</h3>
                                    <p className="text-sm text-text-secondary">Sélectionnez un fichier JPG, PNG...</p>
                                </button>

                                <button
                                    onClick={startWebcam}
                                    className="p-8 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <i className="fas fa-camera text-5xl text-primary mb-4 group-hover:scale-110 transition-transform"></i>
                                    <h3 className="text-xl font-bold mb-2">Prendre une photo</h3>
                                    <p className="text-sm text-text-secondary">Utilisez votre webcam</p>
                                </button>
                            </div>
                            
                            <div className="mt-6 text-center">
                                <Button onClick={handleClose} variant="secondary">
                                    <i className="fas fa-arrow-left mr-2"></i> Retour
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Webcam Mode */}
                    {mode === 'webcam' && (
                        <div className="space-y-4">
                            <div className="relative rounded-lg overflow-hidden bg-black">
                                <video ref={videoRef} autoPlay playsInline className="w-full"></video>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={capturePhoto} variant="primary">
                                    <i className="fas fa-camera mr-2"></i> Capturer
                                </Button>
                                <Button onClick={() => { stopWebcam(); setMode('select'); }} variant="secondary">
                                    Annuler
                                </Button>
                            </div>
                            <canvas ref={canvasRef} className="hidden"></canvas>
                        </div>
                    )}

                    {/* Upload Preview */}
                    {mode === 'upload' && imagePreview && (
                        <div className="space-y-4">
                            <div className="rounded-lg overflow-hidden border-2 border-border">
                                <img src={imagePreview} alt="Votre dessin" className="w-full h-auto" />
                            </div>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={handleEvaluate} variant="primary">
                                    <i className="fas fa-check-circle mr-2"></i> Soumettre pour évaluation
                                </Button>
                                <Button onClick={() => { setImagePreview(null); setMode('select'); }} variant="secondary">
                                    Changer d'image
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Evaluating */}
                    {mode === 'evaluating' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <i className="fas fa-spinner fa-spin text-6xl text-primary mb-4"></i>
                            <p className="text-xl font-semibold">{tutorName} analyse votre soumission...</p>
                            <p className="text-sm text-text-secondary mt-2">Cela peut prendre quelques secondes</p>
                        </div>
                    )}

                    {/* Result */}
                    {mode === 'result' && evaluation && (
                        <div className="space-y-6">
                            {/* Score */}
                            <div className="text-center p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border-2 border-green-500/30">
                                <div className="text-6xl font-bold text-green-600 dark:text-green-400 mb-2">
                                    {evaluation.score}/10
                                </div>
                                <p className="text-lg italic text-text-secondary">"{evaluation.overallComment}"</p>
                            </div>

                            {/* Strengths */}
                            <div className="bg-background-secondary rounded-xl p-5 border border-border">
                                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <i className="fas fa-check-circle"></i> Points forts
                                </h3>
                                <ul className="space-y-2">
                                    {evaluation.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">✓</span>
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Improvements */}
                            <div className="bg-background-secondary rounded-xl p-5 border border-border">
                                <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                    <i className="fas fa-lightbulb"></i> Axes d'amélioration
                                </h3>
                                <ul className="space-y-2">
                                    {evaluation.improvements.map((imp, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-orange-500 mt-1">→</span>
                                            <span>{imp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Personalized Tip */}
                            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-5 border-2 border-purple-500/30">
                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                    <i className="fas fa-star"></i> Conseil de {tutorName}
                                </h3>
                                <p className="text-text-secondary italic">{evaluation.personalizedTip}</p>
                            </div>

                            <div className="flex gap-3 justify-center">
                                <Button onClick={handleClose} variant="primary">
                                    <i className="fas fa-check mr-2"></i> Terminé
                                </Button>
                                <Button onClick={() => { setEvaluation(null); setImagePreview(null); setMode('select'); }} variant="secondary">
                                    Soumettre un autre dessin
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-700 dark:text-red-400">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
