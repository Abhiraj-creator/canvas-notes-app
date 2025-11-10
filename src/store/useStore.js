import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // User
      user: null,
      setUser: (user) => set({ user }),

      // Notes
      notes: [],
      setNotes: (notes) => set({ notes }),
      addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates } : note)),
        })),
      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        })),

      // Selected Note
      selectedNote: null,
      setSelectedNote: (note) => set({ selectedNote: note }),

      // Canvas Data
      canvasData: {},
      setCanvasData: (noteId, data) =>
        set((state) => ({
          canvasData: { ...state.canvasData, [noteId]: data },
        })),
    }),
    {
      name: 'notes-app-storage',
      partialize: (state) => ({
        theme: state.theme,
        canvasData: state.canvasData,
      }),
    }
  )
)
