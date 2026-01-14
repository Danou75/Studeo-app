
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'special';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) => {
    const baseClasses = 'font-bold rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center';

    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary',
        secondary: 'bg-background-tertiary text-text hover:bg-background-secondary focus:ring-secondary border border-border',
        danger: 'bg-error text-white hover:opacity-90 focus:ring-error',
        special: 'bg-warning text-text hover:opacity-90 focus:ring-warning',
    };

    const sizeClasses = {
        sm: 'py-2 px-3 text-sm',
        md: 'py-2.5 px-5 text-base',
        lg: 'py-3 px-6 text-lg',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{children}</span>
                </div>
            ) : children}
        </button>
    );
};
