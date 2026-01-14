import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600',
        warning: 'bg-yellow-600'
    };

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    return (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl text-white animate-bounce-in z-[9999] ${bgColors[type]}`}>
            <i className={`${icons[type]} text-xl`}></i>
            <span className="font-semibold">{message}</span>
            <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};
