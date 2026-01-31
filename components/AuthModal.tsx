import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { ThemeMode, ThemeStyle, getThemeGradient } from '../constants/themes';
import { useTranslation } from '../contexts/LanguageContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
    onForceRefresh?: () => void;
    user: any;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, themeMode, themeStyle, onForceRefresh, user }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState(() => localStorage.getItem('studeo_remember_email') || '');
    const [password, setPassword] = useState(() => {
        const saved = localStorage.getItem('studeo_remember_password');
        return saved ? atob(saved) : '';
    });
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('studeo_remember_email'));
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                showToast(t('auth.signUpSuccess'), "success");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                if (rememberMe) {
                    localStorage.setItem('studeo_remember_email', email);
                    localStorage.setItem('studeo_remember_password', btoa(password));
                } else {
                    localStorage.removeItem('studeo_remember_email');
                    localStorage.removeItem('studeo_remember_password');
                }

                showToast(t('auth.loginSuccess'), "success");
                onClose();
            }
        } catch (error: any) {
            showToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-background w-full max-w-md rounded-[2.5rem] shadow-2xl border border-border overflow-hidden animate-zoom-in">
                <div 
                    className="p-8 text-white relative overflow-hidden"
                    style={{ background: getThemeGradient(themeStyle, themeMode) }}
                >
                    <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                    <h2 className="text-3xl font-black mb-2">{t('auth.title')}</h2>
                    <p className="opacity-80 text-sm">
                        {user ? t('auth.connectedAs', { email: user.email }) : (isSignUp ? t('auth.userGuide') : t('auth.loginToRestore'))}
                    </p>
                </div>

                {user ? (
                    <div className="p-8 space-y-6">
                        <div className="bg-background-secondary p-4 rounded-2xl border border-border">
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">{t('auth.userId')}</div>
                            <div className="text-xs font-mono break-all">{user.id}</div>
                        </div>

                        <Button 
                            onClick={async () => {
                                localStorage.removeItem('studeo_remember_email');
                                localStorage.removeItem('studeo_remember_password');
                                setEmail('');
                                setPassword('');
                                setRememberMe(false);
                                await supabase.auth.signOut();
                                // Ne pas fermer la modal pour permettre de se reconnecter
                            }}
                            variant="secondary"
                            className="w-full rounded-2xl py-4 font-black uppercase tracking-widest text-red-500 border-red-500/20 hover:bg-red-500/5"
                        >
                            {t('auth.signOut')}
                        </Button>
                        
                        {onForceRefresh && (
                            <button
                                type="button"
                                onClick={onForceRefresh}
                                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                            >
                                <i className="fas fa-sync-alt mr-2"></i> {t('auth.forcePull')}
                            </button>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleAuth} className="p-8 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-1">{t('auth.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                            placeholder="votre@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-1">{t('auth.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {!isSignUp && (
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer group select-none py-2">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="hidden"
                                />
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${rememberMe ? 'bg-primary border-primary' : 'border-border'}`}>
                                    {rememberMe && <i className="fas fa-check text-[10px] text-white"></i>}
                                </div>
                                <span className="text-xs font-bold text-text-secondary group-hover:text-primary transition-colors">{t('auth.rememberMe')}</span>
                            </label>
                        </div>
                    )}

                    <Button 
                        type="submit"
                        variant="primary" 
                        loading={loading}
                        className="w-full rounded-2xl py-4 font-black uppercase tracking-widest mt-4"
                    >
                        {isSignUp ? t('auth.signUp') : t('auth.login')}
                    </Button>

                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="w-full text-center text-xs font-bold text-text-muted hover:text-primary transition-colors mt-4"
                    >
                        {isSignUp ? t('auth.switchToLogin') : t('auth.switchToSignUp')}
                    </button>

                    {!isSignUp && onForceRefresh && (
                        <div className="pt-4 border-t border-border mt-4">
                            <button
                                type="button"
                                onClick={onForceRefresh}
                                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                            >
                                <i className="fas fa-sync-alt mr-2"></i> {t('auth.forcePull')}
                            </button>
                        </div>
                    )}
                </form>
                )}
            </div>
        </div>
    );
};
