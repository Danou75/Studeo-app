/**
 * Sélecteur de prompts système selon le provider IA
 * - Gemini : Prompts détaillés (performant)
 * - Local : Prompts simplifiés (compatible avec modèles moins performants)
 */

import * as GeminiPrompts from './tutorPrompts';
import * as LocalPrompts from './tutorPromptsLocal';

export type AIProvider = 'gemini' | 'local';

/**
 * Sélectionne le bon prompt selon le provider
 */
export function getTutorPrompt(tutorId: string, provider: AIProvider): string {
  const prompts = provider === 'gemini' ? GeminiPrompts : LocalPrompts;
  
  switch (tutorId) {
    case 'maestro-italiano':
      return prompts.MAESTRO_ITALIANO_PROMPT;
    case 'mister-english':
      return prompts.MISTER_ENGLISH_PROMPT;
    case 'maestro-espanol':
      return prompts.MAESTRO_ESPANOL_PROMPT;
    case 'mestre-portugues':
      return prompts.MESTRE_PORTUGUES_PROMPT;
    case 'herr-deutsch':
      return prompts.HERR_DEUTSCH_PROMPT;
    case 'master-russe':
      return prompts.MASTER_RUSSE_PROMPT;
    case 'efendi-turco':
      return prompts.EFENDI_TURCO_PROMPT;
    case 'prof-curio':
      return prompts.PROF_CURIO_PROMPT;
    case 'prof-chronos':
      return prompts.PROF_CHRONOS_PROMPT;
    case 'prof-atlas':
      return prompts.PROF_ATLAS_PROMPT;
    case 'prof-plume':
      return prompts.PROF_PLUME_PROMPT;
    case 'prof-sofia':
      return prompts.PROF_SOFIA_PROMPT;
    case 'prof-muse':
      return prompts.PROF_MUSE_PROMPT;
    case 'prof-eureka':
      return prompts.PROF_EUREKA_PROMPT;
    case 'prof-newton':
      return prompts.PROF_NEWTON_PROMPT;
    case 'prof-cosmos':
      return prompts.PROF_COSMOS_PROMPT;
    case 'maitre-leonard':
      return prompts.MAITRE_LEONARD_PROMPT;
    default:
      console.warn(`⚠️ Tuteur inconnu: ${tutorId}, utilisation du prompt par défaut`);
      return prompts.PROF_CURIO_PROMPT;
  }
}

/**
 * Vérifie si le post-traitement est nécessaire
 * (uniquement pour IA locale avec QCM)
 */
export function needsPostProcessing(provider: AIProvider, hasQCM: boolean): boolean {
  return provider === 'local' && hasQCM;
}
