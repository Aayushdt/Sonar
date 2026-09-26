import { create } from 'zustand';

/**
 * useRecordingStore
 * Scoped Zustand store for client-side call recording UI state.
 */
export const useRecordingStore = create((set) => ({
  isRecording: false,
  recordingSeconds: 0,
  recordingError: null,
  lastRecordingUrl: null,

  setIsRecording: (isRecording) => set({ isRecording }),
  setRecordingSeconds: (seconds) =>
    set((state) => ({
      recordingSeconds: typeof seconds === 'function' ? seconds(state.recordingSeconds) : seconds,
    })),
  setRecordingError: (recordingError) => set({ recordingError }),
  setLastRecordingUrl: (lastRecordingUrl) => set({ lastRecordingUrl }),

  reset: () =>
    set({
      isRecording: false,
      recordingSeconds: 0,
      recordingError: null,
    }),
}));
