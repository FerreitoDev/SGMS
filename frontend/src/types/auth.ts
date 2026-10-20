export type UserRole = 'GERENTE' | 'OPERADOR';

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}

export interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthenticatedUser) => void;
  logout: () => void;
}
