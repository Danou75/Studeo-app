import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { GamificationData, Achievement } from '../types';
import { INITIAL_GAMIFICATION_DATA } from '../utils/achievements';

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface GamificationState {
    gamificationData: GamificationData;
    newAchievements: Achievement[];
    
    setGamificationData: (updater: GamificationData | ((prev: GamificationData) => GamificationData)) => void;
    setNewAchievements: (updater: Achievement[] | ((prev: Achievement[]) => Achievement[])) => void;
}

export const useGamificationStore = create<GamificationState>()(
    persist(
        (setState) => ({
            gamificationData: INITIAL_GAMIFICATION_DATA,
            newAchievements: [],

            setGamificationData: (updater) => setState((state) => ({
                gamificationData: typeof updater === 'function' ? updater(state.gamificationData) : updater
            })),
            
            setNewAchievements: (updater) => setState((state) => ({
                newAchievements: typeof updater === 'function' ? updater(state.newAchievements) : updater
            }))
        }),
        {
            name: 'studeo-gamification-storage',
            storage: createJSONStorage(() => idbStorage),
            partialize: (state) => ({
                gamificationData: state.gamificationData,
                // Don't persist newAchievements
            })
        }
    )
);
