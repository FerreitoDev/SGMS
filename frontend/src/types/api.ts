export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code?: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

export function isProblemDetails(error: unknown): error is ProblemDetails {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as Record<string, unknown>;
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.status === 'number' &&
    typeof candidate.detail === 'string' &&
    typeof candidate.instance === 'string'
  );
}

export interface BaseGetPaginatedQuery {
  offset?: number;
  limit: number;
  searchTerm?: string;
}

export interface BasePaginationData<T> {
  data: T[];
  total: number;
  results: number;
  page: number;
  totalPages: number;
  pageSize: number;
  currentPosition: number;
}
