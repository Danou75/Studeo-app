import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AIProvider, Tutor } from '../types';

export interface AIConfig {
  provider: AIProvider;
  
  // Gemini
  geminiApiKey: string;
  geminiModel: string;

  // Local
  localApiUrl: string;
  localModelName: string;

  // OpenAI
  openaiApiKey?: string;
  openaiModel?: string;

  // Anthropic
  anthropicApiKey?: string;
  anthropicModel?: string;

  // Mistral
  mistralApiKey?: string;
  mistralModel?: string;

  deviceName?: string;
  selectedTutor?: Tutor | null;
}

interface AIConfigContextType {
  config: AIConfig;
  updateConfig: (updates: Partial<AIConfig>) => void;
  setGeminiApiKey: (key: string) => void;
  setSelectedTutor: (tutor: Tutor | null) => void;
}

const defaultConfig: AIConfig = {
  provider: 'gemini',
  
  geminiModel: 'gemini-2.5-flash',
  geminiApiKey: '',

  localApiUrl: 'http://localhost:11434/v1/chat/completions',
  localModelName: 'llama3',

  openaiModel: 'gpt-4o',
  openaiApiKey: '',

  anthropicModel: 'claude-3-5-sonnet-20240620',
  anthropicApiKey: '',

  mistralModel: 'mistral-large-latest',
  mistralApiKey: '',
};

const AIConfigContext = createContext<AIConfigContextType | undefined>(undefined);

export const AIConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AIConfig>(() => {
    // Charger depuis localStorage
    const saved = localStorage.getItem('aiConfig');
    if (saved) {
      try {
        return { ...defaultConfig, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error loading AI config:', e);
      }
    }
    
    return defaultConfig;
  });

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('aiConfig', JSON.stringify(config));
    if (config.deviceName) {
      localStorage.setItem('studeo_device_name', config.deviceName);
    }
  }, [config]);

  const updateConfig = (updates: Partial<AIConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const setGeminiApiKey = (key: string) => {
    updateConfig({ geminiApiKey: key });
  };

  const setSelectedTutor = (tutor: Tutor | null) => {
    updateConfig({ selectedTutor: tutor });
  };

  return (
    <AIConfigContext.Provider value={{ config, updateConfig, setGeminiApiKey, setSelectedTutor }}>
      {children}
    </AIConfigContext.Provider>
  );
};

export const useAIConfig = () => {
  const context = useContext(AIConfigContext);
  if (!context) {
    throw new Error('useAIConfig must be used within AIConfigProvider');
  }
  return context;
};
