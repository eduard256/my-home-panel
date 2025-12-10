import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState } from '@/types';
import { api } from '@/lib/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,

      login: async (inputToken: string): Promise<boolean> => {
        try {
          const response = await api.post('/api/auth/login', {
            token: inputToken,
          });

          const { access_token } = response.data;

          // Set token in store and axios defaults
          set({
            token: access_token,
            isAuthenticated: true,
          });

          // Update axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

          return true;
        } catch (error) {
          console.error('Login failed:', error);
          set({
            token: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      logout: () => {
        // Clear token from store and axios
        set({
          token: null,
          isAuthenticated: false,
        });

        // Remove authorization header
        delete api.defaults.headers.common['Authorization'];

        // Clear localStorage
        localStorage.removeItem('auth_token');
      },

      checkAuth: (): boolean => {
        const state = get();

        if (state.token) {
          // Restore axios header on app load
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
          return true;
        }

        return false;
      },
    }),
    {
      name: 'auth_token',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
