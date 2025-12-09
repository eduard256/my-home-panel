import { create } from 'zustand';
import type { Section } from '@/shared/types';

interface UIState {
  // Current navigation
  section: Section;
  setSection: (section: Section) => void;

  // Selected items for detail view
  selectedServerId: string | null;
  setSelectedServer: (id: string | null) => void;

  selectedVMId: string | null;
  setSelectedVM: (id: string | null) => void;

  selectedAutomationId: string | null;
  setSelectedAutomation: (id: string | null) => void;

  selectedDeviceId: string | null;
  setSelectedDevice: (id: string | null) => void;

  selectedCameraId: string | null;
  setSelectedCamera: (id: string | null) => void;

  // Mobile navigation
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;

  isMenuOpen: boolean;
  setMenuOpen: (isOpen: boolean) => void;
  toggleMenu: () => void;

  activeBlock: 1 | 2 | 3;
  setActiveBlock: (block: 1 | 2 | 3) => void;

  // AI Chat visibility
  isAIChatOpen: boolean;
  setAIChatOpen: (isOpen: boolean) => void;
  toggleAIChat: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Navigation
  section: 'dashboard',
  setSection: (section) =>
    set((state) => ({
      section,
      // Reset selections when changing section
      selectedServerId: null,
      selectedVMId: null,
      selectedAutomationId: null,
      selectedDeviceId: null,
      selectedCameraId: null,
      isMenuOpen: false,
      // Keep AI chat open on desktop, close on mobile
      isAIChatOpen: !state.isMobile,
    })),

  // Server selection - close AI chat when selecting
  selectedServerId: null,
  setSelectedServer: (id) => set({ selectedServerId: id, isAIChatOpen: id === null }),

  // VM selection - close AI chat when selecting
  selectedVMId: null,
  setSelectedVM: (id) => set({ selectedVMId: id, isAIChatOpen: id === null }),

  // Automation selection - close AI chat when selecting
  selectedAutomationId: null,
  setSelectedAutomation: (id) => set({ selectedAutomationId: id, isAIChatOpen: id === null }),

  // Device selection - close AI chat when selecting
  selectedDeviceId: null,
  setSelectedDevice: (id) => set({ selectedDeviceId: id, isAIChatOpen: id === null }),

  // Camera selection - close AI chat when selecting
  selectedCameraId: null,
  setSelectedCamera: (id) => set({ selectedCameraId: id, isAIChatOpen: id === null }),

  // Mobile
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  setIsMobile: (isMobile) => set({ isMobile }),

  isMenuOpen: false,
  setMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),

  activeBlock: 2, // Default to overview block on mobile
  setActiveBlock: (block) => set({ activeBlock: block }),

  // AI Chat - default true on desktop
  isAIChatOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  setAIChatOpen: (isOpen) => set({ isAIChatOpen: isOpen }),
  toggleAIChat: () => set((state) => ({ isAIChatOpen: !state.isAIChatOpen })),
}));
