import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ProblemDetails, isProblemDetails } from '@/types/api';

export const AUTH_TOKEN_KEY = 'sgms_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Falha em ambiente sem localStorage (ex: SSR/testes)
  }
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Falha em ambiente sem localStorage
  }
}

export class ProblemDetailsError extends Error implements ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly code?: string;
  readonly timestamp: string;
  readonly errors?: Record<string, string[]>;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'ProblemDetailsError';
    this.type = problem.type;
    this.title = problem.title;
    this.status = problem.status;
    this.detail = problem.detail;
    this.instance = problem.instance;
    this.code = problem.code;
    this.timestamp = problem.timestamp;
    this.errors = problem.errors;
    Object.setPrototypeOf(this, ProblemDetailsError.prototype);
  }
}

export function extractProblemDetail(error: unknown): string {
  if (isProblemDetails(error)) {
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Anexa o Bearer Token obtido do storage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response Interceptor: Mapeia respostas de erro RFC 7807 e gerencia redirecionamento 401
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    // Se o token expirou ou é inválido, limpa sessão e redireciona (exceto se já estiver na tela de login)
    if (status === 401) {
      removeAuthToken();
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login';
      }
    }

    if (error.response?.data) {
      const data = error.response.data as Record<string, unknown>;

      if (isProblemDetails(data)) {
        return Promise.reject(new ProblemDetailsError(data));
      }

      // Normalização caso a API retorne corpo com pequenas variações de schema
      const detail =
        typeof data.detail === 'string'
          ? data.detail
          : typeof data.message === 'string'
            ? data.message
            : Array.isArray(data.message)
              ? data.message.join('; ')
              : error.message;

      const problem: ProblemDetails = {
        type:
          typeof data.type === 'string'
            ? data.type
            : `https://sgms.gepf.local/errors/http-${status ?? 500}`,
        title:
          typeof data.title === 'string'
            ? data.title
            : `Erro HTTP ${status ?? 500}`,
        status: typeof status === 'number' ? status : 500,
        detail,
        instance:
          typeof data.instance === 'string'
            ? data.instance
            : (error.config?.url ?? ''),
        timestamp:
          typeof data.timestamp === 'string'
            ? data.timestamp
            : new Date().toISOString(),
        ...(typeof data.code === 'string' ? { code: data.code } : {}),
        ...(typeof data.errors === 'object' && data.errors !== null
          ? { errors: data.errors as Record<string, string[]> }
          : {}),
      };

      return Promise.reject(new ProblemDetailsError(problem));
    }

    // Erro de rede ou indisponibilidade do servidor local (Zero Fallback: sem mascarar causa)
    const networkProblem: ProblemDetails = {
      type: 'https://sgms.gepf.local/errors/network-error',
      title: 'Falha de Conectividade de Rede Local',
      status: 0,
      detail:
        error.message ||
        'Não foi possível estabelecer conexão com o servidor SGMS na rede local.',
      instance: error.config?.url ?? '',
      timestamp: new Date().toISOString(),
    };

    return Promise.reject(new ProblemDetailsError(networkProblem));
  }
);

export const api = apiClient;
export default apiClient;
