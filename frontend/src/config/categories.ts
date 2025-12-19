import type { Category } from '@/types';

export const CATEGORIES: Category[] = [
  {
    id: 'servers',
    name: 'Servers',
    icon: 'Server',
    order: 1,
    aiEnabled: true,
  },
  {
    id: 'vms',
    name: 'VM/CT',
    icon: 'Box',
    order: 2,
    aiEnabled: true,
  },
  {
    id: 'cameras',
    name: 'Cameras',
    icon: 'Camera',
    order: 3,
    aiEnabled: false,
    customLayout: true,
  },
  {
    id: 'automations',
    name: 'Automations',
    icon: 'Zap',
    order: 4,
    aiEnabled: true,
  },
  {
    id: 'devices',
    name: 'Smart Home',
    icon: 'Home',
    order: 5,
    aiEnabled: false,
  },
  {
    id: 'assistant',
    name: 'Assistant',
    icon: 'MessageSquare',
    order: 7,
    aiEnabled: true,
    aiOnly: true,
  },
];

export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORIES.find((cat) => cat.id === id);
};

export const getCategoriesForMenu = (): Category[] => {
  return [...CATEGORIES].sort((a, b) => a.order - b.order);
};
