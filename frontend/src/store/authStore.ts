import { create } from 'zustand';
import api from '../services/api';

export interface User {
  id: string;
  _id?: string;
  email: string;
  username: string;
  full_name: string;
  department: string;
  academic_year: string;
  role: 'student' | 'admin';
  bio: string;
  avatar_url: string | null;
  skills_offered: Array<{ name: string; level: string; category: string }>;
  skills_wanted: string[];
  interests: string[];
  languages: string[];
  availability: Array<{ day: string; start_time: string; end_time: string }>;
  is_profile_public: boolean;
  xp: number;
  level: number;
  skill_credits: number;
  badges: string[];
  completed_exchanges: number;
  onboarding_completed: boolean;
  onboarding_step: number;
  is_verified: boolean;
  created_at: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  initFromStorage: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem('cx_token', token);
    localStorage.setItem('cx_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  updateUser: (updates) =>
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null;
      if (updated) localStorage.setItem('cx_user', JSON.stringify(updated));
      return { user: updated };
    }),

  logout: () => {
    localStorage.removeItem('cx_token');
    localStorage.removeItem('cx_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data) {
        localStorage.setItem('cx_user', JSON.stringify(res.data));
        set({ user: res.data, isAuthenticated: true });
      }
    } catch {
      // Token might be expired or server offline
    }
  },

  initFromStorage: () => {
    const token = localStorage.getItem('cx_token');
    const userStr = localStorage.getItem('cx_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true });
        // Sync fresh profile from MongoDB Atlas in background
        api.get('/users/me')
          .then((res) => {
            if (res.data) {
              localStorage.setItem('cx_user', JSON.stringify(res.data));
              set({ user: res.data, isAuthenticated: true });
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem('cx_token');
        localStorage.removeItem('cx_user');
      }
    }
  },
}));
