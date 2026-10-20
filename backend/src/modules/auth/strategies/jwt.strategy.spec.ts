import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole } from '@prisma/client';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: jest.Mocked<Partial<PrismaService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Operador Teste',
    username: 'operador1',
    role: UserRole.OPERADOR,
    isActive: true,
  };

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test_jwt_secret';
        return null;
      }),
    };

    prismaService = {
      user: {
        findUnique: jest.fn(),
      } as any,
    };

    strategy = new JwtStrategy(
      configService as ConfigService,
      prismaService as PrismaService,
    );
  });

  const payload: JwtPayload = {
    sub: mockUser.id,
    username: mockUser.username,
    role: mockUser.role,
  };

  it('deve retornar o usuário autenticado quando o token for válido e o usuário estiver ativo', async () => {
    (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await strategy.validate(payload);

    expect(result).toEqual(mockUser);
    expect(prismaService.user!.findUnique).toHaveBeenCalledWith({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
      },
    });
  });

  it('deve lançar UnauthorizedException quando o usuário não existir no banco', async () => {
    (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('deve lançar UnauthorizedException quando o usuário estiver inativo', async () => {
    (prismaService.user!.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
