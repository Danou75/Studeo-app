import React, { ReactNode } from 'react';
import { Toast } from '../components/ui/Toast';
import { useToastStore } from '../stores/useToastStore';

// We keep ToastProvider for backward compatibility in App.tsx
// It's now just a container rendering the global Toast
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast, closeToast } = useToastStore();

  return (
    <>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={closeToast}
        />
      )}
    </>
  );
};

// Returns exactly what useToast returned in the past
export const useToast = () => {
  const showToast = useToastStore((state) => state.showToast);
  
  return { showToast };
};
