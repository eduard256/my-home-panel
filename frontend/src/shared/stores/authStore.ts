import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '@/shared/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (accessToken: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (accessToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await auth.login(accessToken);
          const jwtToken = response.access_token;

          localStorage.setItem('auth_token', jwtToken);
          set({
            token: jwtToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          set({ token, isAuthenticated: true });
          return true;
        }
        return false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
