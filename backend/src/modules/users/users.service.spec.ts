import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaService: jest.Mocked<Partial<PrismaService>>;

  const mockOperator = {
    id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    name: 'João Operador',
    username: 'joao.operador',
    role: UserRole.OPERADOR,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      } as any,
      shiftAllocation: {
        findFirst: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('createOperator', () => {
    it('deve criar um operador com sucesso criptografando a senha e sem expor passwordHash', async () => {
      (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user!.create as jest.Mock).mockResolvedValue(mockOperator);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword'));

      const result = await usersService.createOperator({
        name: 'João Operador',
        username: 'joao.operador',
        password: 'password123',
      });

      expect(result).toEqual(mockOperator);
      expect((result as any).passwordHash).toBeUndefined();
      expect(prismaService.user!.create).toHaveBeenCalledWith({
        data: {
          name: 'João Operador',
          username: 'joao.operador',
          passwordHash: 'hashedPassword',
          role: UserRole.OPERADOR,
          isActive: true,
        },
        select: expect.objectContaining({
          id: true,
          name: true,
          username: true,
          role: true,
          isActive: true,
        }),
      });
    });

    it('deve lançar ConflictException quando o username já estiver cadastrado', async () => {
      (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(mockOperator);

      await expect(
        usersService.createOperator({
          name: 'Outro Nome',
          username: 'joao.operador',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('deve listar todos os operadores ordenados por nome', async () => {
      (prismaService.user!.findMany as jest.Mock).mockResolvedValue([mockOperator]);

      const result = await usersService.findAll();

      expect(result).toEqual([mockOperator]);
      expect(prismaService.user!.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.OPERADOR },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('deve aplicar filtro isActive quando especificado', async () => {
      (prismaService.user!.findMany as jest.Mock).mockResolvedValue([mockOperator]);

      await usersService.findAll({ isActive: true });

      expect(prismaService.user!.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.OPERADOR, isActive: true },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar o status do operador com sucesso quando não houver alocação ativa', async () => {
      (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(mockOperator);
      (prismaService.shiftAllocation!.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user!.update as jest.Mock).mockResolvedValue({
        ...mockOperator,
        isActive: false,
      });

      const result = await usersService.updateStatus(mockOperator.id, {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
      expect(prismaService.user!.update).toHaveBeenCalledWith({
        where: { id: mockOperator.id },
        data: { isActive: false },
        select: expect.any(Object),
      });
    });

    it('deve lançar ConflictException quando o operador possuir alocação ACTIVE ao ser inativado', async () => {
      (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(mockOperator);
      (prismaService.shiftAllocation!.findFirst as jest.Mock).mockResolvedValue({
        id: 'alloc-active-1',
        operatorId: mockOperator.id,
        status: 'ACTIVE',
      });

      await expect(
        usersService.updateStatus(mockOperator.id, { isActive: false }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve lançar NotFoundException quando o operador não for encontrado', async () => {
      (prismaService.user!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        usersService.updateStatus('uuid-inexistente', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
