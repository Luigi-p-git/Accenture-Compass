import { create } from 'zustand';
import type { LensMode } from '@/types';

interface CompassStore {
  // Navigation
  lens: LensMode;
  setLens: (lens: LensMode) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Map interaction
  hoveredCountry: string | null;
  setHoveredCountry: (id: string | null) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;

  // Active selections
  activeSection: string | null;
  setActiveSection: (section: string | null) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useCompassStore = create<CompassStore>((set) => ({
  lens: 'regional',
  setLens: (lens) => set({ lens }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  hoveredCountry: null,
  setHoveredCountry: (id) => set({ hoveredCountry: id }),
  zoomLevel: 1,
  setZoomLevel: (level) => set({ zoomLevel: level }),

  activeSection: null,
  setActiveSection: (section) => set({ activeSection: section }),

  theme: 'dark',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}));
