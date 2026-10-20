import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-context';
import { AuthContextType } from '@/types/auth';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado obrigatoriamente dentro de um AuthProvider.');
  }
  return context;
}
