import React, { RefObject } from 'react';

export interface StudyModeViewProps {
    studyAudioSrc: string | null;
    studyPlaybackRate: number;
    audioRef: RefObject<HTMLAudioElement>;
    setStudyPlaybackRate: (rate: number) => void;
    setStudyAudioSrc: (src: string | null) => void;
    handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isRecordingShadow: boolean;
    startShadowRecording: () => void;
    stopShadowRecording: () => void;
    shadowAudioSrc: string | null;
    studyScript: string;
    setStudyScript: (script: string) => void;
    isAnalyzingScript: boolean;
    handleAnalyzeScript: () => void;
    t: (key: string) => string;
}

export const StudyModeView: React.FC<StudyModeViewProps> = ({
    studyAudioSrc,
    studyPlaybackRate,
    audioRef,
    setStudyPlaybackRate,
    setStudyAudioSrc,
    handleAudioUpload,
    isRecordingShadow,
    startShadowRecording,
    stopShadowRecording,
    shadowAudioSrc,
    studyScript,
    setStudyScript,
    isAnalyzingScript,
    handleAnalyzeScript,
    t
}) => {
    return (
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-gray-50 dark:bg-gray-900 gap-4">
            {/* 1. MEDIA PLAYER */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm animate-fade-in-up border border-gray-100 dark:border-gray-700">
                {!studyAudioSrc ? (
                    <label className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <i className="fas fa-music text-primary text-xl"></i>
                        </div>
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{t('lab.study.import')}</span>
                        <span className="text-xs text-gray-400 mt-1">{t('lab.study.formats')}</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                    </label>
                ) : (
                    <div className="flex flex-col gap-4">
                        <audio ref={audioRef} src={studyAudioSrc} controls className="w-full h-10" />
                        <div className="flex justify-between items-center text-sm px-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('lab.study.vitesse')}</span>
                                {[0.5, 0.75, 1, 1.25].map(rate => (
                                    <button 
                                        key={rate} 
                                        onClick={() => { if(audioRef.current) { audioRef.current.playbackRate = rate; setStudyPlaybackRate(rate); } }}
                                        className={`px-2 py-1 rounded text-xs font-bold transition-all ${studyPlaybackRate === rate ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        x{rate}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => { setStudyAudioSrc(null); setStudyPlaybackRate(1); }} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors text-xs font-medium"><i className="fas fa-trash mr-1"></i> {t('lab.study.change')}</button>
                        </div>
                        
                        {/* SHADOWING RECORDER */}
                        <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <i className="fas fa-microphone-alt"></i> {t('lab.study.shadowing')}
                                </span>
                                <span className="text-[10px] text-gray-400">{t('lab.study.shadowingDesc')}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Playback User Audio */}
                                {shadowAudioSrc && !isRecordingShadow && (
                                    <audio src={shadowAudioSrc} controls className="h-8 w-40" />
                                )}

                                {/* RECORD BUTTON */}
                                <button 
                                    onClick={isRecordingShadow ? stopShadowRecording : startShadowRecording}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                                        isRecordingShadow 
                                            ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' 
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                    }`}
                                    title={isRecordingShadow ? t('lab.study.stop') : t('lab.study.record')}
                                >
                                    <i className={`fas fa-${isRecordingShadow ? 'stop' : 'microphone'}`}></i>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. SCRIPT EDITOR */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-fade-in-up delay-100 border border-gray-100 dark:border-gray-700 relative">
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><i className="fas fa-align-left text-primary"></i> {t('lab.study.script')}</h3>
                    <button 
                        onClick={handleAnalyzeScript}
                        disabled={isAnalyzingScript || !studyScript.trim()}
                        className={`text-xs font-medium px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                            isAnalyzingScript 
                                ? 'bg-gray-100 text-gray-400 border-gray-200' 
                                : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                        }`}
                    >
                        {isAnalyzingScript ? (
                            <><i className="fas fa-spinner fa-spin"></i> {t('lab.study.analysing')}</>
                        ) : (
                            <><i className="fas fa-magic"></i> {t('lab.study.aiAnalyse')}</>
                        )}
                    </button>
                </div>
                <textarea 
                    className="flex-1 p-4 resize-none focus:outline-none bg-transparent text-base leading-relaxed font-sans"
                    placeholder={t('lab.study.placeholder')}
                    value={studyScript}
                    onChange={(e) => setStudyScript(e.target.value)}
                />
            </div>
        </div>
    );
};
