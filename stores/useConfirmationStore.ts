import { create } from 'zustand';

export interface ConfirmationOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ConfirmationState {
  isOpen: boolean;
  options: ConfirmationOptions | null;
  showConfirmation: (options: ConfirmationOptions) => void;
  closeConfirmation: () => void;
}

export const useConfirmationStore = create<ConfirmationState>((set) => ({
  isOpen: false,
  options: null,
  showConfirmation: (options: ConfirmationOptions) => {
    set({ isOpen: true, options });
  },
  closeConfirmation: () => {
    set({ isOpen: false, options: null });
  },
}));
