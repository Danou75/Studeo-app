import { create } from 'zustand';
import { ToastType } from '../components/ui/Toast';

interface ToastState {
  toast: { message: string; type: ToastType; duration: number } | null;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  closeToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (message: string, type: ToastType = 'info', duration: number = 3000) => {
    set({ toast: { message, type, duration } });
  },
  closeToast: () => {
    set({ toast: null });
  },
}));
