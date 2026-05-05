import React, { useState, useRef } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useKnowledgeMap, KnowledgeNode } from '../hooks/useKnowledgeMap';
import { Flashcard } from '../types';
import { Button } from './ui/Button';
import { getThemeGradient } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { FloatingHeaderToggle } from './ui/FloatingHeaderToggle';

interface KnowledgeMapScreenProps {
    flashcardSets: Record<string, Flashcard[]>;
    onBack: () => void;
    onResetProgress: () => void;
}

export const KnowledgeMapScreen: React.FC<KnowledgeMapScreenProps> = ({ flashcardSets, onBack, onResetProgress }) => {
    const { t } = useTranslation();
    const { themeMode, themeStyle } = useTheme();
    const { nodes, edges } = useKnowledgeMap(flashcardSets);
    const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
    const containerRef = useRef<SVGSVGElement>(null);
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 1000 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const { showHeader, toggleHeader } = useCollapsibleHeader();

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPan({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startPan.x;
        const dy = e.clientY - startPan.y;
        
        if (containerRef.current) {
            const { width } = containerRef.current.getBoundingClientRect();
            const scale = viewBox.w / width;
            
            setViewBox(prev => ({
                ...prev,
                x: prev.x - dx * scale,
                y: prev.y - dy * scale
            }));
            setStartPan({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const zoomFactor = 1.1;
        const direction = e.deltaY > 0 ? 1 : -1;
        const factor = direction > 0 ? zoomFactor : 1 / zoomFactor;
        
        const newW = Math.min(Math.max(viewBox.w * factor, 200), 2000);
        const newH = Math.min(Math.max(viewBox.h * factor, 200), 2000);
        
        const dx = (viewBox.w - newW) / 2;
        const dy = (viewBox.h - newH) / 2;

        setViewBox(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
            w: newW,
            h: newH
        }));
    };



    return (
        <div className="flex-1 min-h-0 flex flex-col text-text animate-fade-in overflow-hidden relative">
            {/* Bouton flottant toggle */}
            <FloatingHeaderToggle showHeader={showHeader} onToggle={toggleHeader} />

            {/* Header — amovible */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
                showHeader ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
            <div 
                className={`transition-all duration-500 pt-safe p-4 md:p-6 shadow-lg relative overflow-hidden ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <Button 
                            variant="secondary" 
                            onClick={onBack} 
                            size="sm" 
                            className={`transition-all mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                        >
                            <i className="fas fa-home mr-2 text-inherit"></i> Accueil
                        </Button>
                        <h1 className="text-3xl font-black drop-shadow-sm text-inherit">
                            {t('knowledge.title')}
                        </h1>
                        <p className="opacity-80 mt-1 text-base text-inherit">{t('knowledge.subtitle')}</p>
                    </div>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={onResetProgress} 
                        className={`transition-all opacity-60 hover:opacity-100 border-transparent backdrop-blur-sm ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/10 text-white'}`}
                        title="Réinitialiser la progression (Mise à zéro des données)"
                    >
                        <i className="fas fa-sync-alt text-lg"></i>
                    </Button>
                </div>
            </div>
            </div>

            <div className="flex-1 flex flex-col bg-background-secondary overflow-hidden">
                {/* SVG Visualizer */}
                <div className="flex-1 relative overflow-hidden">
                    <svg 
                        ref={containerRef}
                        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none`}
                        preserveAspectRatio="xMidYMid meet"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                    >
                        {/* Background Pattern */}
                        <defs>
                            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/20" />
                            </pattern>
                            <radialGradient id="nodeGradient">
                                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="url(#grid)" />

                        {/* Edges */}
                        {edges.map((edge, i) => {
                            const source = nodes.find(n => n.id === edge.source);
                            const target = nodes.find(n => n.id === edge.target);
                            if (!source || !target) return null;
                            
                            return (
                                <line 
                                    key={`edge-${i}`}
                                    x1={source.x} y1={source.y}
                                    x2={target.x} y2={target.y}
                                    stroke="currentColor"
                                    strokeWidth={edge.value * 2}
                                    className="text-primary/10 transition-all duration-700"
                                    strokeDasharray="5,5"
                                />
                            );
                        })}

                        {/* Nodes */}
                        {nodes.map((node) => (
                            <g 
                                key={node.id} 
                                transform={`translate(${node.x}, ${node.y})`}
                                className="cursor-pointer group"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent drag start when clicking node? No, click is mouseup.
                                    // Maybe stop propagation to avoid confusing panner?
                                    // Actually, if we pan, we shouldn't select.
                                    // Simple check: if movement < threshold, select.
                                    // For now, let's keep it simple.
                                    setSelectedNode(node);
                                }}
                            >
                                {/* Glow Effect */}
                                <circle 
                                    r={node.size * 1.5}
                                    fill={node.color}
                                    className="opacity-10 blur-xl group-hover:opacity-30 transition-opacity"
                                />
                                
                                {/* Main Circle */}
                                <circle 
                                    r={node.size}
                                    fill={node.color}
                                    className="shadow-lg transition-transform group-hover:scale-110"
                                    stroke="white"
                                    strokeWidth="2"
                                    style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                                />
                                
                                {/* Mastery Overlay */}
                                <circle 
                                    r={node.size}
                                    fill="url(#nodeGradient)"
                                />

                                {/* Label */}
                                <text
                                    y={node.size + 20}
                                    textAnchor="middle"
                                    className="text-[14px] font-bold fill-text pointer-events-none drop-shadow-sm transition-all group-hover:text-[16px]"
                                >
                                    {node.label}
                                </text>
                                
                                {/* Mastery Percentage */}
                                <text
                                    y={node.size + 38}
                                    textAnchor="middle"
                                    className="text-[10px] fill-text-secondary pointer-events-none uppercase tracking-widest font-black"
                                >
                                    {Math.round(node.mastery * 100)}% {t('knowledge.mastery')}
                                </text>
                            </g>
                        ))}
                    </svg>

                    {/* Selected Node Detail Panel */}
                    {selectedNode && (
                        <div className="absolute top-6 right-6 bg-background/90 backdrop-blur-md p-6 rounded-3xl border border-border shadow-2xl pointer-events-auto w-80 animate-slide-in-right">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-black">{selectedNode.label}</h3>
                                <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-text">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary mb-1">
                                        <span>Mastery</span>
                                        <span>{Math.round(selectedNode.mastery * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000" 
                                            style={{ 
                                                width: `${selectedNode.mastery * 100}%`,
                                                backgroundColor: selectedNode.color 
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl">
                                        <div className="text-[10px] text-text-muted uppercase font-bold">Cards</div>
                                        <div className="text-lg font-black">{flashcardSets[selectedNode.id].length}</div>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl">
                                        <div className="text-[10px] text-text-muted uppercase font-bold">Priority</div>
                                        <div className="text-lg font-black">{selectedNode.mastery < 0.5 ? 'High' : 'Low'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Panel - Outside Grid */}
                <div className="p-4 border-t border-border bg-background/50 backdrop-blur-md flex justify-center">
                    <div className="bg-background/80 backdrop-blur-md p-3 rounded-xl border border-border shadow-lg max-w-sm w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-3 h-3 rounded-full bg-success"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">{t('knowledge.stats')}</span>
                        </div>
                        <p className="text-xl font-black">{nodes.length} {t('knowledge.nodes')}</p>
                        <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary" 
                                style={{ width: `${(nodes.reduce((acc, n) => acc + n.mastery, 0) / nodes.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
