import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfirmationOptions {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmationContextType {
    showConfirmation: (options: ConfirmationOptions) => void;
    closeConfirmation: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);

    const showConfirmation = (opts: ConfirmationOptions) => {
        setOptions(opts);
        setIsOpen(true);
    };

    const closeConfirmation = () => {
        setIsOpen(false);
        setOptions(null);
    };

    const handleConfirm = () => {
        if (options?.onConfirm) {
            options.onConfirm();
        }
        closeConfirmation();
    };

    const handleCancel = () => {
        if (options?.onCancel) {
            options.onCancel();
        }
        closeConfirmation();
    };

    return (
        <ConfirmationContext.Provider value={{ showConfirmation, closeConfirmation }}>
            {children}
            {isOpen && options && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full m-4 border border-border p-6 transform transition-all animate-scale-in">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                options.variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                                options.variant === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                                'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                            }`}>
                                <i className={`fas ${
                                    options.variant === 'danger' ? 'fa-exclamation-triangle' :
                                    options.variant === 'warning' ? 'fa-exclamation-circle' :
                                    'fa-info-circle'
                                } text-xl`}></i>
                            </div>
                            <h3 className="text-xl font-bold text-text">{options.title}</h3>
                        </div>
                        
                        <p className="text-text-secondary mb-8 leading-relaxed">
                            {options.message}
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={handleCancel}
                                className="px-5 py-2.5 rounded-xl text-text-muted hover:bg-background-secondary font-medium transition-colors"
                            >
                                {options.cancelText || 'Annuler'}
                            </button>
                            <button 
                                onClick={handleConfirm}
                                className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-95 ${
                                    options.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                                    options.variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600' :
                                    'bg-primary hover:bg-primary-dark'
                                }`}
                            >
                                {options.confirmText || 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmationContext.Provider>
    );
};
