import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: jest.Mocked<Partial<PrismaService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Administrador Gerente',
    username: 'admin',
    passwordHash: '$2a$10$hashedPasswordValue',
    role: UserRole.GERENTE,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      } as any,
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('deve realizar login com sucesso para credenciais válidas', async () => {
    (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

    const result = await authService.login({
      username: 'admin',
      password: 'password123',
    });

    expect(result).toHaveProperty('accessToken', 'mocked.jwt.token');
    expect(result.user).toEqual({
      id: mockUser.id,
      name: mockUser.name,
      username: mockUser.username,
      role: mockUser.role,
    });
    expect((result as any).user.passwordHash).toBeUndefined();
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      username: mockUser.username,
      role: mockUser.role,
    });
  });

  it('deve lançar UnauthorizedException quando o usuário não for encontrado', async () => {
    (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      authService.login({
        username: 'inexistente',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve lançar UnauthorizedException quando a senha estiver incorreta', async () => {
    (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

    await expect(
      authService.login({
        username: 'admin',
        password: 'senha_errada',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve lançar ForbiddenException quando o usuário estiver inativo (isActive = false)', async () => {
    (prismaService.user!.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      isActive: false,
    });
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

    await expect(
      authService.login({
        username: 'admin',
        password: 'password123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
