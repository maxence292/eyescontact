import { create } from 'zustand';

export type Mood = 'neutral' | 'suspicious' | 'surprised' | 'tired' | 'dizzy' | 'angry' | 'cross';

interface EyeState {
    mood: Mood;
    setMood: (mood: Mood) => void;
    isSleeping: boolean; // Drowsiness
    toggleSleep: () => void;
}

export const useEyeState = create<EyeState>((set) => ({
    mood: 'neutral',
    setMood: (mood) => set({ mood }),
    isSleeping: false,
    toggleSleep: () => set((state) => ({ isSleeping: !state.isSleeping })),
}));
