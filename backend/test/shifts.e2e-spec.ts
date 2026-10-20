import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, MachineStatus, ShiftAllocationStatus } from '@prisma/client';

describe('ShiftsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken: string;
  let operatorToken: string;
  let operatorId: string;

  const managerUsername = 'e2e.shift.mgr';
  const operatorUsername = 'e2e.shift.op';
  const rawPassword = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Limpeza prévia específica do suíte de Shifts
    await prisma.shiftAllocation.deleteMany({
      where: {
        shift: { name: { startsWith: 'E2E-SFT-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: {
        name: { startsWith: 'E2E-SFT-' },
      },
    });
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-SFT-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [managerUsername, operatorUsername] },
      },
    });

    await prisma.user.create({
      data: {
        name: 'Gerente Shifts E2E',
        username: managerUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    const op = await prisma.user.create({
      data: {
        name: 'Operador Shifts E2E',
        username: operatorUsername,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    operatorId = op.id;

    // Login Manager
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: managerUsername, password: rawPassword });
    managerToken = mgrLogin.body.accessToken;

    // Login Operator
    const opLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: operatorUsername, password: rawPassword });
    operatorToken = opLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.shiftAllocation.deleteMany({
      where: {
        shift: { name: { startsWith: 'E2E-SFT-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: {
        name: { startsWith: 'E2E-SFT-' },
      },
    });
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-SFT-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [managerUsername, operatorUsername] },
      },
    });
    await app.close();
  });

  describe('POST /api/shifts', () => {
    it('deve permitir ao Gerente cadastrar um novo turno com horários válidos', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/shifts')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'E2E-SFT-Turno A - Manhã',
          startTime: '06:00',
          endTime: '14:00',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E-SFT-Turno A - Manhã');
      expect(response.body.startTime).toBe('06:00');
      expect(response.body.endTime).toBe('14:00');
      expect(response.body.isActive).toBe(true);
    });

    it('deve rejeitar cadastro com horário startTime inválido "25:00" retornando HTTP 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/shifts')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'E2E-SFT-Turno Inválido',
          startTime: '25:00',
          endTime: '14:00',
        });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.status).toBe(400);
      expect(response.body.title).toBe('Requisição Inválida');
    });

    it('deve rejeitar cadastro com horário endTime inválido "99:99" retornando HTTP 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/shifts')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'E2E-SFT-Turno Fim Inválido',
          startTime: '14:00',
          endTime: '99:99',
        });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });

    it('deve rejeitar cadastro com nome de turno duplicado retornando HTTP 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/shifts')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'E2E-SFT-Turno A - Manhã',
          startTime: '07:00',
          endTime: '15:00',
        });

      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('SHIFT_NAME_ALREADY_EXISTS');
    });

    it('deve rejeitar cadastro por Operador com HTTP 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/shifts')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          name: 'E2E-SFT-Turno Operador',
          startTime: '08:00',
          endTime: '16:00',
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe(403);
    });

    it('deve rejeitar cadastro sem token com HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/shifts')
        .send({
          name: 'E2E-SFT-Turno Sem Token',
          startTime: '08:00',
          endTime: '16:00',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/shifts', () => {
    beforeAll(async () => {
      await prisma.shift.createMany({
        data: [
          { name: 'E2E-SFT-Turno B - Tarde', startTime: '14:00', endTime: '22:00', isActive: true },
          { name: 'E2E-SFT-Turno C - Noite', startTime: '22:00', endTime: '06:00', isActive: true },
        ],
      });
    });

    it('deve listar turnos ordenados por startTime em ordem crescente para usuário autenticado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/shifts')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const e2eShifts = response.body.filter((s: { name: string }) => s.name.startsWith('E2E-SFT-'));
      expect(e2eShifts.length).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < e2eShifts.length - 1; i++) {
        expect(e2eShifts[i].startTime <= e2eShifts[i + 1].startTime).toBe(true);
      }
    });

    it('deve permitir filtrar turnos por isActive', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/shifts?isActive=true')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((s: { isActive: boolean }) => s.isActive)).toBe(true);
    });
  });

  describe('GET /api/shifts/:id', () => {
    it('deve buscar um turno por UUID existente', async () => {
      const created = await prisma.shift.create({
        data: {
          name: 'E2E-SFT-Turno Específico',
          startTime: '10:00',
          endTime: '18:00',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/shifts/${created.id}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.name).toBe('E2E-SFT-Turno Específico');
    });

    it('deve retornar HTTP 404 se UUID não existir', async () => {
      const nonExistentUuid = 'a0000000-0000-4000-8000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/shifts/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });

    it('deve retornar HTTP 400 se UUID fornecido for inválido', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/shifts/invalid-uuid')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('PATCH /api/shifts/:id', () => {
    it('deve permitir ao Gerente atualizar os dados cadastrais do turno', async () => {
      const shift = await prisma.shift.create({
        data: {
          name: 'E2E-SFT-Turno Antigo',
          startTime: '05:00',
          endTime: '13:00',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/shifts/${shift.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'E2E-SFT-Turno Atualizado',
          startTime: '05:30',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('E2E-SFT-Turno Atualizado');
      expect(response.body.startTime).toBe('05:30');
    });
  });

  describe('PATCH /api/shifts/:id/status', () => {
    it('deve permitir ao Gerente inativar um turno sem alocações ativas', async () => {
      const shift = await prisma.shift.create({
        data: {
          name: 'E2E-SFT-Turno Para Inativar',
          startTime: '12:00',
          endTime: '20:00',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/shifts/${shift.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });

    it('deve impedir inativação de turno se ele possuir alocação ACTIVE retornando HTTP 409', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-SFT-SOPRO-TEST',
          name: 'Sopradora Turno Teste',
          status: MachineStatus.RUNNING,
          isActive: true,
        },
      });

      const shift = await prisma.shift.create({
        data: {
          name: 'E2E-SFT-Turno Ativo Bloqueado',
          startTime: '01:00',
          endTime: '09:00',
          isActive: true,
        },
      });

      await prisma.shiftAllocation.create({
        data: {
          machineId: machine.id,
          shiftId: shift.id,
          operatorId: operatorId,
          shiftDate: new Date('2026-10-20'),
          status: ShiftAllocationStatus.ACTIVE,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/shifts/${shift.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('SHIFT_HAS_ACTIVE_ALLOCATION');
      expect(response.body.detail).toContain('Não é possível inativar o turno enquanto houver alocações ativas');
    });

    it('deve rejeitar alteração de status por Operador com HTTP 403 Forbidden', async () => {
      const shift = await prisma.shift.findFirst();
      const response = await request(app.getHttpServer())
        .patch(`/api/shifts/${shift!.id}/status`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(403);
    });
  });
});
