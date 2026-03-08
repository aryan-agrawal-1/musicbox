import { createContext } from 'react';
import type { User } from '@/types/api';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  appleSignIn: (
    identityToken: string,
    email: string,
    fullName: { givenName: string; familyName: string }
  ) => Promise<{ isExistingUser: boolean }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  appleSignIn: async () => ({ isExistingUser: false }),
  logout: async () => {},
  deleteAccount: async () => {},
  refreshUser: async () => {},
});
