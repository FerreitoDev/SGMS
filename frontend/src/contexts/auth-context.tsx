import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AuthenticatedUser, AuthContextType } from '@/types/auth';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/lib/api-client';

export const AUTH_USER_KEY = 'sgms_auth_user';

export const AuthContext = createContext<AuthContextType | null>(null);

function getInitialUser(): AuthenticatedUser | null {
  try {
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    if (!rawUser) {
      return null;
    }
    const parsed = JSON.parse(rawUser) as Record<string, unknown>;
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.username === 'string' &&
      (parsed.role === 'GERENTE' || parsed.role === 'OPERADOR')
    ) {
      return {
        id: parsed.id,
        name: parsed.name,
        username: parsed.username,
        role: parsed.role,
      };
    }
    // Dados inválidos no storage: limpa para evitar estado corrompido
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AuthenticatedUser | null>(() => getInitialUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Sincroniza e valida a integridade da sessão inicial
    const currentToken = getAuthToken();
    const currentUser = getInitialUser();

    if (!currentToken || !currentUser) {
      // Sessão inconsistente (ou token sem user, ou user sem token): limpa ambos
      removeAuthToken();
      localStorage.removeItem(AUTH_USER_KEY);
      setToken(null);
      setUser(null);
    } else {
      setToken(currentToken);
      setUser(currentUser);
    }

    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: AuthenticatedUser) => {
    setAuthToken(newToken);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    } catch {
      // Ignora erro em caso de cota de armazenamento excedida
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    removeAuthToken();
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // Ignora erro de storage
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
