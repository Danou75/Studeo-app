import React, { ReactNode } from 'react';
import { useAIConfigStore, AIConfig } from '../stores/useAIConfigStore';


export const useAIConfig = () => {
  const config = useAIConfigStore(s => s.config);
  const updateConfig = useAIConfigStore(s => s.updateConfig);
  const setGeminiApiKey = useAIConfigStore(s => s.setGeminiApiKey);
  const setSelectedTutor = useAIConfigStore(s => s.setSelectedTutor);

  return { config, updateConfig, setGeminiApiKey, setSelectedTutor };
};

// We keep a dummy provider so we don't have to remove it from App.tsx immediately
export const AIConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export type { AIConfig };
