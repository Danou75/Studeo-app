import React, { useState } from 'react';
import { Button } from './ui/Button';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';
import { save, open } from '@tauri-apps/api/dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/api/fs';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useTranslation } from '../contexts/LanguageContext';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { config, updateConfig, setGeminiApiKey } = useAIConfig();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { t } = useTranslation();
  const [showApiKey, setShowApiKey] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const DEFAULT_GEMINI_MODELS = [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Expérimental 🚀)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Rapide & Stable)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Plus intelligent)' },
  ];

  // Initialize from localStorage or defaults, but ALWAYS ensure the current config model is present
  const getInitialModels = (key: string, defaults: {id: string, name: string}[], currentId: string | undefined): {id: string, name: string}[] => {
    const saved = localStorage.getItem(key);
    let models = saved ? JSON.parse(saved) : [...defaults];
    
    // Ensure current selected model is in the list
    if (currentId && !models.find((m: any) => m.id === currentId)) {
        models.unshift({ id: currentId, name: currentId });
    }
    return models;
  };

  const [geminiModelsList, setGeminiModelsList] = useState(() => 
    getInitialModels('studeo_gemini_models', DEFAULT_GEMINI_MODELS, config.geminiModel)
  );
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const checkGeminiModels = async () => {
    if (!config.geminiApiKey) {
        showToast(t('settings.ai.noApiKey', { name: 'Gemini' }), 'warning');
        return;
    }
    
    setIsFetchingModels(true);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`);
        const data = await response.json();
        
        if (data.models) {
            const models = data.models
                .filter((m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map((m: any) => ({
                    id: m.name.replace('models/', ''), 
                    name: m.displayName ? `${m.displayName} (${m.name.replace('models/', '')})` : m.name.replace('models/', '')
                }))
                .sort((a: any, b: any) => b.id.localeCompare(a.id));
            
            setGeminiModelsList(models);
            localStorage.setItem('studeo_gemini_models', JSON.stringify(models));
        } else if (data.error) {
            throw new Error(data.error.message);
        }
    } catch (e: any) {
        console.error(e);
        showToast(t('settings.ai.errorModels', { error: e.message || e }), 'error', 5000);
    } finally {
        setIsFetchingModels(false);
    }
  };

  /* --- OPENAI LOGIC --- */
  const DEFAULT_OPENAI_MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o (Polyvalent)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Rapide)' },
  ];
  const [openAIModelsList, setOpenAIModelsList] = useState(() => 
    getInitialModels('studeo_openai_models', DEFAULT_OPENAI_MODELS, config.openaiModel)
  );

  const checkOpenAIModels = async () => {
      if (!config.openaiApiKey) {
          showToast(t('settings.ai.noApiKey', { name: 'OpenAI' }), 'warning');
          return;
      }
      setIsFetchingModels(true);
      try {
          const response = await fetch('https://api.openai.com/v1/models', {
              headers: { 'Authorization': `Bearer ${config.openaiApiKey}` }
          });
          if (!response.ok) throw new Error("Erreur OpenAI: " + response.statusText);
          const data = await response.json();
          const models = data.data
            .filter((m: any) => m.id.includes('gpt'))
            .map((m: any) => ({ id: m.id, name: m.id }))
            .sort((a: any, b: any) => b.id.localeCompare(a.id));
          
          if (models.length > 0) {
              setOpenAIModelsList(models);
              localStorage.setItem('studeo_openai_models', JSON.stringify(models));
          } else throw new Error(t('settings.ai.noGptFound'));

      } catch (e: any) {
          showToast(t('settings.ai.errorModels', { error: e.message }), 'error', 5000);
      } finally {
          setIsFetchingModels(false);
      }
  };

  /* --- ANTHROPIC LOGIC --- */
  const DEFAULT_ANTHROPIC_MODELS = [
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Latest)' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (Juin 2024)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Puissant)' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Rapide)' },
  ];
  const [anthropicModelsList, setAnthropicModelsList] = useState(() => 
    getInitialModels('studeo_anthropic_models', DEFAULT_ANTHROPIC_MODELS, config.anthropicModel)
  );

  const checkAnthropicModels = async () => {
    if (!config.anthropicApiKey) {
        showToast(t('settings.ai.noApiKey', { name: 'Anthropic' }), 'warning');
        return;
    }
    setIsFetchingModels(true);
    setTimeout(() => {
        setIsFetchingModels(false);
        setAnthropicModelsList(DEFAULT_ANTHROPIC_MODELS);
        localStorage.setItem('studeo_anthropic_models', JSON.stringify(DEFAULT_ANTHROPIC_MODELS));
        showToast(t('settings.ai.claudeRefresh'), 'success');
    }, 1000);
  };

  /* --- MISTRAL LOGIC --- */
  const DEFAULT_MISTRAL_MODELS = [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-medium', name: 'Mistral Medium' },
    { id: 'mistral-small', name: 'Mistral Small' },
    { id: 'open-mixtral-8x22b', name: 'Mixtral 8x22B' },
  ];
  const [mistralModelsList, setMistralModelsList] = useState(() => 
    getInitialModels('studeo_mistral_models', DEFAULT_MISTRAL_MODELS, config.mistralModel)
  );

  const checkMistralModels = async () => {
    if (!config.mistralApiKey) {
        showToast(t('settings.ai.noApiKey', { name: 'Mistral' }), 'warning');
        return;
    }
    setIsFetchingModels(true);
    try {
        const response = await fetch('https://api.mistral.ai/v1/models', {
            headers: { 'Authorization': `Bearer ${config.mistralApiKey}` }
        });
        if (!response.ok) throw new Error("Erreur Mistral: " + response.statusText);
        const data = await response.json();
        const models = data.data
          .map((m: any) => ({ id: m.id, name: m.id }))
          .sort((a: any, b: any) => a.id.localeCompare(b.id));
        
        if (models.length > 0) {
            setMistralModelsList(models);
            localStorage.setItem('studeo_mistral_models', JSON.stringify(models));
        } else throw new Error(t('settings.ai.noMistralFound'));

    } catch (e: any) {
        showToast(t('settings.ai.errorModels', { error: e.message }), 'error', 5000);
    } finally {
        setIsFetchingModels(false);
    }
  };

  /* --- LOCAL LOGIC --- */
  const [localModelsList, setLocalModelsList] = useState<{id: string, name: string}[]>([
    { id: config.localModelName || 'local-model', name: config.localModelName || t('settings.ai.currentModel') }
  ]);

  const checkLocalModels = async () => {
    if (!config.localApiUrl) {
        showToast(t('settings.ai.noLocalUrl'), 'warning');
        return;
    }
    
    setIsFetchingModels(true);
    try {
        let baseUrl = config.localApiUrl;
        if (baseUrl.endsWith('/chat/completions')) {
            baseUrl = baseUrl.replace('/chat/completions', '/models');
        } else if (baseUrl.endsWith('/v1')) {
            baseUrl = `${baseUrl}/models`;
        } else {
             if (!baseUrl.endsWith('/models')) {
                 baseUrl = baseUrl.replace(/\/$/, '') + '/models';
             }
        }

        const response = await fetch(baseUrl);
        if (!response.ok) throw new Error("Erreur Local: " + response.statusText);
        const data = await response.json();
        
        let models: {id: string, name: string}[] = [];

        if (data.data && Array.isArray(data.data)) {
            models = data.data.map((m: any) => ({ id: m.id, name: m.id }));
        } 
        else if (data.models && Array.isArray(data.models)) {
             models = data.models.map((m: any) => ({ id: m.name, name: m.name }));
        } 
        else {
            throw new Error("Format de réponse inconnu");
        }

        if (models.length > 0) {
            models.sort((a, b) => a.id.localeCompare(b.id));
            setLocalModelsList(models);
            localStorage.setItem('studeo_local_models', JSON.stringify(models));
            if (!config.localModelName) {
                updateConfig({ localModelName: models[0].id });
            }
        } else {
            throw new Error(t('settings.ai.noLocalFound'));
        }

    } catch (e: any) {
        console.error(e);
        showToast(t('settings.ai.localCheckError'), 'error', 6000);
    } finally {
        setIsFetchingModels(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }

      const backup = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: data
      };

      // @ts-ignore
      if (window.__TAURI_IPC__) {
        const filePath = await save({
          filters: [{
             name: 'Backup Studeo',
             extensions: ['json']
          }],
          defaultPath: `studeo_backup_${new Date().toISOString().split('T')[0]}.json`
        });

        if (filePath) {
          await writeTextFile(filePath, JSON.stringify(backup, null, 2));
          setBackupStatus({ message: t('settings.backup.successExport'), type: 'success' });
        }
      } else {
        const blob = new Blob([JSON.stringify(backup, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `studeo_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        setBackupStatus({ message: t('settings.backup.successDownload'), type: 'success' });
      }
    } catch (err) {
      console.error(err);
      setBackupStatus({ message: t('settings.backup.errorExport'), type: 'error' });
    }
  };

  const handleImportBackup = async () => {
    showConfirmation({
        title: t('settings.backup.confirmTitle'),
        message: t('settings.backup.confirmMessage'),
        variant: 'danger',
        confirmText: t('settings.backup.import'),
        onConfirm: async () => {
            try {
                let content = '';
                
                // @ts-ignore
                if (window.__TAURI_IPC__) {
                    const selected = await open({
                        multiple: false,
                        filters: [{
                            name: 'Backup Studeo',
                            extensions: ['json']
                        }]
                    });

                    if (selected && typeof selected === 'string') {
                        content = await readTextFile(selected);
                    } else {
                        return;
                    }
                } else {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                             const text = await file.text();
                             processBackupContent(text);
                        }
                    };
                    input.click();
                    return;
                }

                if (content) {
                    processBackupContent(content);
                }

            } catch (err) {
                console.error(err);
                setBackupStatus({ message: t('settings.backup.errorImport'), type: 'error' });
            }
        }
    });
  };

  const processBackupContent = (content: string) => {
      try {
        const backup = JSON.parse(content);
        if (backup.data) {
            localStorage.clear();
            Object.entries(backup.data).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    localStorage.setItem(key, value);
                }
            });
            
            showToast(t('settings.backup.restoreDone'), 'success');
            setTimeout(() => window.location.reload(), 2000);
        } else {
            throw new Error(t('settings.backup.formatError'));
        }
      } catch (err) {
          console.error(err);
          setBackupStatus({ message: t('settings.backup.errorRead'), type: 'error' });
      }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative text-text">
      {/* Header */}
      <div className="p-4 md:p-8 shrink-0 border-b border-border bg-background-secondary shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="secondary" onClick={onBack} size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800">
            <i className="fas fa-home mr-2"></i> Accueil
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            {t('settings.title')}
          </h1>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50 min-h-0 pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <i className="fas fa-save text-2xl text-primary"></i>
          <div>
            <h2 className="text-xl font-bold">{t('settings.backup.title')}</h2>
            <p className="text-sm text-text-muted">{t('settings.backup.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                onClick={handleExportBackup}
                className="p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
                <div className="flex items-center gap-3 justify-center">
                    <i className="fas fa-download text-xl group-hover:scale-110 transition-transform"></i>
                    <div className="font-bold">{t('settings.backup.export')}</div>
                </div>
                <div className="text-xs text-text-muted mt-2 text-center">{t('settings.backup.exportDesc')}</div>
            </button>

            <button
                onClick={handleImportBackup}
                className="p-4 rounded-lg border-2 border-border hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
            >
                <div className="flex items-center gap-3 justify-center text-red-600 dark:text-red-400">
                    <i className="fas fa-upload text-xl group-hover:scale-110 transition-transform"></i>
                    <div className="font-bold">{t('settings.backup.import')}</div>
                </div>
                <div className="text-xs text-text-muted mt-2 text-center">{t('settings.backup.importDesc')}</div>
            </button>
        </div>

        {backupStatus && (
            <div className={`p-3 rounded-lg text-sm text-center font-medium ${backupStatus.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {backupStatus.message}
            </div>
        )}
      </div>

      <div className="bg-background-secondary rounded-xl p-6 shadow-lg border border-border space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <i className="fas fa-robot text-2xl text-primary"></i>
          <div>
            <h2 className="text-xl font-bold">{t('settings.ai.title')}</h2>
            <p className="text-sm text-text-muted">{t('settings.ai.subtitle')}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3 text-text-secondary">{t('settings.ai.activeProvider')}</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
                { id: 'gemini', name: 'Gemini', icon: 'fa-google', sub: 'Google' },
                { id: 'openai', name: 'OpenAI', icon: 'fa-microchip', sub: 'GPT-4' },
                { id: 'anthropic', name: 'Claude', icon: 'fa-brain', sub: 'Anthropic' },
                { id: 'mistral', name: 'Mistral', icon: 'fa-wind', sub: 'Mistral AI' },
                { id: 'local', name: 'Local', icon: 'fa-server', sub: 'Ollama/LM' },
            ].map((p) => (
                <button
                    key={p.id}
                    onClick={() => updateConfig({ provider: p.id as any })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        config.provider === p.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 text-text-secondary'
                    }`}
                >
                    <i className={`fas ${p.icon} text-xl`}></i>
                    <div className="text-center leading-tight">
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="text-[10px] opacity-70">{p.sub}</div>
                    </div>
                </button>
            ))}
          </div>
        </div>

        {config.provider === 'gemini' && (
          <div className="space-y-4 animate-fade-in p-4 bg-background rounded-lg border border-border/50">
            <h3 className="font-semibold flex items-center gap-2"><i className="fas fa-google text-blue-500"></i> {t('settings.ai.title')} Gemini</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-text-secondary">{t('settings.ai.apiKey', { name: 'Gemini' })}</label>
              <div className="flex gap-2">
                <input type={showApiKey ? 'text' : 'password'} value={config.geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="AIza..." className="flex-1 p-3 rounded-lg bg-background-secondary border border-border focus:border-primary outline-none" />
                <button onClick={() => setShowApiKey(!showApiKey)} className="px-4 border border-border rounded-lg text-text"><i className={`fas fa-eye${showApiKey ? '-slash' : ''}`}></i></button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-text-secondary">{t('settings.ai.model')}</label>
                  <button 
                    onClick={checkGeminiModels}
                    disabled={isFetchingModels}
                    className="text-xs text-primary hover:text-primary-dark underline flex items-center gap-1"
                  >
                    {isFetchingModels ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                    {t('settings.ai.refresh')}
                  </button>
              </div>
              <select value={config.geminiModel} onChange={(e) => updateConfig({ geminiModel: e.target.value })} className="w-full p-3 rounded-lg bg-background-secondary border border-border outline-none text-text">
                {geminiModelsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {config.provider === 'openai' && (
          <div className="space-y-4 animate-fade-in p-4 bg-background rounded-lg border border-border/50">
            <h3 className="font-semibold flex items-center gap-2"><i className="fas fa-microchip text-green-500"></i> {t('settings.ai.title')} OpenAI</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-text-secondary">{t('settings.ai.apiKey', { name: 'OpenAI' })}</label>
              <div className="flex gap-2">
                <input type={showApiKey ? 'text' : 'password'} value={config.openaiApiKey || ''} onChange={(e) => updateConfig({ openaiApiKey: e.target.value })} placeholder="sk-..." className="flex-1 p-3 rounded-lg bg-background-secondary border border-border focus:border-primary outline-none" />
                <button onClick={() => setShowApiKey(!showApiKey)} className="px-4 border border-border rounded-lg text-text"><i className={`fas fa-eye${showApiKey ? '-slash' : ''}`}></i></button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-text-secondary">{t('settings.ai.model')}</label>
                  <button 
                    onClick={checkOpenAIModels}
                    disabled={isFetchingModels}
                    className="text-xs text-primary hover:text-primary-dark underline flex items-center gap-1"
                  >
                    {isFetchingModels ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                    {t('settings.ai.refresh')}
                  </button>
              </div>
              <select value={config.openaiModel || 'gpt-4o'} onChange={(e) => updateConfig({ openaiModel: e.target.value })} className="w-full p-3 rounded-lg bg-background-secondary border border-border outline-none text-text">
                {openAIModelsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {config.provider === 'anthropic' && (
          <div className="space-y-4 animate-fade-in p-4 bg-background rounded-lg border border-border/50">
            <h3 className="font-semibold flex items-center gap-2"><i className="fas fa-brain text-orange-500"></i> {t('settings.ai.title')} Claude</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-text-secondary">{t('settings.ai.apiKey', { name: 'Anthropic' })}</label>
              <div className="flex gap-2">
                <input type={showApiKey ? 'text' : 'password'} value={config.anthropicApiKey || ''} onChange={(e) => updateConfig({ anthropicApiKey: e.target.value })} placeholder="sk-ant-..." className="flex-1 p-3 rounded-lg bg-background-secondary border border-border focus:border-primary outline-none" />
                <button onClick={() => setShowApiKey(!showApiKey)} className="px-4 border border-border rounded-lg text-text"><i className={`fas fa-eye${showApiKey ? '-slash' : ''}`}></i></button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-text-secondary">{t('settings.ai.model')}</label>
                  <button 
                    onClick={checkAnthropicModels}
                    disabled={isFetchingModels}
                    className="text-xs text-primary hover:text-primary-dark underline flex items-center gap-1"
                  >
                    {isFetchingModels ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                    {t('settings.ai.refresh')}
                  </button>
              </div>
              <select value={config.anthropicModel || 'claude-3-5-sonnet-20240620'} onChange={(e) => updateConfig({ anthropicModel: e.target.value })} className="w-full p-3 rounded-lg bg-background-secondary border border-border outline-none text-text">
                {anthropicModelsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}
        
        {config.provider === 'mistral' && (
          <div className="space-y-4 animate-fade-in p-4 bg-background rounded-lg border border-border/50">
            <h3 className="font-semibold flex items-center gap-2"><i className="fas fa-wind text-indigo-500"></i> {t('settings.ai.title')} Mistral</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-text-secondary">{t('settings.ai.apiKey', { name: 'Mistral' })}</label>
              <div className="flex gap-2">
                <input type={showApiKey ? 'text' : 'password'} value={config.mistralApiKey || ''} onChange={(e) => updateConfig({ mistralApiKey: e.target.value })} placeholder="..." className="flex-1 p-3 rounded-lg bg-background-secondary border border-border focus:border-primary outline-none" />
                <button onClick={() => setShowApiKey(!showApiKey)} className="px-4 border border-border rounded-lg text-text"><i className={`fas fa-eye${showApiKey ? '-slash' : ''}`}></i></button>
              </div>
            </div>
            <div>
               <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-text-secondary">{t('settings.ai.model')}</label>
                  <button 
                    onClick={checkMistralModels}
                    disabled={isFetchingModels}
                    className="text-xs text-primary hover:text-primary-dark underline flex items-center gap-1"
                  >
                    {isFetchingModels ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                    {t('settings.ai.refresh')}
                  </button>
              </div>
              <select value={config.mistralModel || 'mistral-large-latest'} onChange={(e) => updateConfig({ mistralModel: e.target.value })} className="w-full p-3 rounded-lg bg-background-secondary border border-border outline-none text-text">
                {mistralModelsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {config.provider === 'local' && (
          <div className="space-y-4 animate-fade-in p-4 bg-background rounded-lg border border-border/50">
            <h3 className="font-semibold flex items-center gap-2"><i className="fas fa-server text-gray-500"></i> {t('settings.ai.title')} Locale</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-text-secondary">
                {t('settings.ai.localUrl')}
              </label>
              <input
                type="text"
                value={config.localApiUrl}
                onChange={(e) => updateConfig({ localApiUrl: e.target.value })}
                className="w-full p-3 rounded-lg bg-background-secondary border border-border focus:border-primary focus:outline-none font-mono text-sm text-text"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => updateConfig({ localApiUrl: 'http://localhost:11434/v1/chat/completions' })}
                  className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                >
                  🦙 Ollama
                </button>
                <button
                  onClick={() => updateConfig({ localApiUrl: 'http://localhost:1234/v1/chat/completions' })}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  🖥️ LM Studio
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-text-secondary">
                    {t('settings.ai.model')}
                </label>
                <button 
                    onClick={checkLocalModels}
                    disabled={isFetchingModels}
                    className="text-xs text-primary hover:text-primary-dark underline flex items-center gap-1"
                >
                    {isFetchingModels ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                    {t('settings.ai.refresh')}
                </button>
              </div>
              {localModelsList.length > 1 || (localModelsList.length === 1 && localModelsList[0].id !== 'local-model') ? (
                  <select 
                    value={config.localModelName} 
                    onChange={(e) => updateConfig({ localModelName: e.target.value })}
                    className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-text"
                  >
                    {localModelsList.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
              ) : (
                  <input
                    type="text"
                    value={config.localModelName}
                    onChange={(e) => updateConfig({ localModelName: e.target.value })}
                    placeholder={t('settings.ai.localModelPlaceholder')}
                    className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-text"
                  />
              )}
              <p className="text-xs text-text-muted mt-2">
                {t('settings.ai.localDesc')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-8">
        <div className="flex gap-3">
          <i className="fas fa-info-circle text-blue-600 dark:text-blue-400 mt-1"></i>
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">{t('settings.ai.adviceTitle')}</p>
            <p>
              {t('settings.ai.adviceText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
