import { createContext, useContext } from 'react';
import type { User } from './types';
export interface AuthState {
  user: User | null;
  refreshUser: () => Promise<void>;
}
export const AuthContext = createContext<AuthState>({ user: null, refreshUser: async () => {} });
export const useAuth = () => useContext(AuthContext);
export const isStaff = (user: User | null) =>
  user?.role === 'admin' || user?.role === 'receptionist';
