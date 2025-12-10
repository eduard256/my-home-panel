import { create } from 'zustand';
import type { NavigationState, CategoryId } from '@/types';
import { sessionStorage as ss } from '@/lib/utils';

const FIRST_VISIT_KEY = 'home_panel_first_visit';

export const useNavigationStore = create<NavigationState>((set) => ({
  currentCategory: 'servers',
  block3State: {
    isOpen: false,
    type: null,
    detailType: null,
    detailId: null,
  },
  isFirstVisit: !ss.get(FIRST_VISIT_KEY, false),

  setCategory: (category: CategoryId) => {
    set(() => ({
      currentCategory: category,
      // Close Block3 when changing category (except for assistant which always opens AI)
      block3State:
        category === 'assistant'
          ? {
              isOpen: true,
              type: 'ai-chat',
              detailType: null,
              detailId: null,
            }
          : {
              isOpen: false,
              type: null,
              detailType: null,
              detailId: null,
            },
    }));
  },

  openDetail: (type: CategoryId, id: string) => {
    set({
      block3State: {
        isOpen: true,
        type: 'detail',
        detailType: type,
        detailId: id,
      },
    });
  },

  openAI: () => {
    set((state) => ({
      block3State: {
        isOpen: true,
        type: 'ai-chat',
        detailType: state.currentCategory,
        detailId: null,
      },
    }));
  },

  closeBlock3: () => {
    set({
      block3State: {
        isOpen: false,
        type: null,
        detailType: null,
        detailId: null,
      },
    });
  },

  setFirstVisitComplete: () => {
    ss.set(FIRST_VISIT_KEY, true);
    set({ isFirstVisit: false });
  },
}));
