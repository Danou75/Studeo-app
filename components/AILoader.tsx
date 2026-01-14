import React from 'react';

interface AILoaderProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const AILoader: React.FC<AILoaderProps> = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-10 h-10 border-3'
    };

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className={`${sizeClasses[size]} border-primary/20 border-t-primary rounded-full animate-spin`}></div>
            <div className={`absolute ${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'} bg-primary rounded-full animate-pulse`}></div>
        </div>
    );
};
