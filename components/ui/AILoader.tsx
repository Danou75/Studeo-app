
import React from 'react';

interface AILoaderProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    className?: string;
}

export const AILoader: React.FC<AILoaderProps> = ({ size = 'md', text, className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div className={`relative ${sizeClasses[size]}`}>
                {/* Aura pulsante */}
                <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping opacity-75"></div>
                
                {/* Anneau principal */}
                <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
                
                {/* Curseurs rotatifs stylisés (les "petits curseurs") */}
                <div className="absolute inset-0 border-t-2 border-r-2 border-primary rounded-full animate-spin"></div>
                
                {/* Point central scintillant */}
                <div className="absolute inset-1 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] flex items-center justify-center overflow-hidden">
                     <div className="w-full h-full bg-gradient-to-br from-primary to-accent animate-pulse"></div>
                </div>
            </div>
            
            {text && (
                <span className="text-xs font-black uppercase tracking-widest text-primary animate-pulse">
                    {text}
                </span>
            )}
        </div>
    );
};
