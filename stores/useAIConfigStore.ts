import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIProvider, Tutor } from '../types';

export interface AIConfig {
  provider: AIProvider;
  geminiApiKey: string;
  geminiModel: string;
  localApiUrl: string;
  localModelName: string;
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  mistralApiKey?: string;
  mistralModel?: string;
  deviceName?: string;
  selectedTutor?: Tutor | null;
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

interface AIConfigState {
  config: AIConfig;
  updateConfig: (updates: Partial<AIConfig>) => void;
  setGeminiApiKey: (key: string) => void;
  setSelectedTutor: (tutor: Tutor | null) => void;
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      updateConfig: (updates) =>
        set((state) => {
          const newConfig = { ...state.config, ...updates };
          if (updates.deviceName) {
             localStorage.setItem('studeo_device_name', updates.deviceName);
          }
          return { config: newConfig };
        }),
      setGeminiApiKey: (key) =>
        set((state) => ({ config: { ...state.config, geminiApiKey: key } })),
      setSelectedTutor: (tutor) =>
        set((state) => ({ config: { ...state.config, selectedTutor: tutor } })),
    }),
    {
      name: 'aiConfig',
    }
  )
);
