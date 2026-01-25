import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { ThemeMode, ThemeStyle, getThemeGradient } from '../constants/themes';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
    onForceRefresh?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, themeMode, themeStyle, onForceRefresh }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                showToast("Inscription réussie ! Vérifiez vos emails.", "success");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showToast("Connexion réussie !", "success");
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
                    <h2 className="text-3xl font-black mb-2">Sync Cloud</h2>
                    <p className="opacity-80 text-sm">
                        {isSignUp ? "Créez un compte pour synchroniser vos données." : "Connectez-vous pour retrouver vos parcours."}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="p-8 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-1">Email</label>
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
                        <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-1">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <Button 
                        type="submit"
                        variant="primary" 
                        loading={loading}
                        className="w-full rounded-2xl py-4 font-black uppercase tracking-widest mt-4"
                    >
                        {isSignUp ? "Créer mon compte" : "Se connecter"}
                    </Button>

                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="w-full text-center text-xs font-bold text-text-muted hover:text-primary transition-colors mt-4"
                    >
                        {isSignUp ? "Déjà un compte ? Connectez-vous" : "Pas encore de compte ? Inscrivez-vous"}
                    </button>

                    {!isSignUp && onForceRefresh && (
                        <div className="pt-4 border-t border-border mt-4">
                            <button
                                type="button"
                                onClick={onForceRefresh}
                                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                            >
                                <i className="fas fa-sync-alt mr-2"></i> Forcer la récupération Cloud
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};
