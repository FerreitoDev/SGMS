import { UserRole } from '@prisma/client';

export interface AuthTokenResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: UserRole;
  };
}
