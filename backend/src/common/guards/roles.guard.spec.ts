import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext);

  it('deve permitir acesso se a rota não exigir papéis específicos', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve permitir acesso se o usuário possuir o papel exigido', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.GERENTE]);

    const context = createMockContext({
      id: 'uuid-1',
      role: UserRole.GERENTE,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve lançar ForbiddenException com code FORBIDDEN_ROLE se o usuário possuir papel diferente', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.GERENTE]);

    const context = createMockContext({
      id: 'uuid-2',
      role: UserRole.OPERADOR,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('deve lançar ForbiddenException se não houver usuário autenticado no request', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.GERENTE]);

    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
