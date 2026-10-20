import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, MachineStatus, ShiftAllocationStatus } from '@prisma/client';

describe('MachinesModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken: string;
  let operatorToken: string;
  let operatorId: string;

  const managerUsername = 'e2e.machine.mgr';
  const operatorUsername = 'e2e.machine.op';
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

    // Limpeza prévia
    await prisma.shiftAllocation.deleteMany({});
    await prisma.shift.deleteMany({});
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [managerUsername, operatorUsername] },
      },
    });

    await prisma.user.create({
      data: {
        name: 'Gerente Machines E2E',
        username: managerUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    const op = await prisma.user.create({
      data: {
        name: 'Operador Machines E2E',
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
    await prisma.shiftAllocation.deleteMany({});
    await prisma.shift.deleteMany({});
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [managerUsername, operatorUsername] },
      },
    });
    await app.close();
  });

  describe('POST /api/machines', () => {
    it('deve permitir ao Gerente cadastrar uma nova sopradora com status inicial IDLE', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/machines')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          code: 'E2E-SOPRO-01',
          name: 'Sopradora E2E 01',
          model: 'Krones Contiform 3',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe('E2E-SOPRO-01');
      expect(response.body.name).toBe('Sopradora E2E 01');
      expect(response.body.model).toBe('Krones Contiform 3');
      expect(response.body.status).toBe(MachineStatus.IDLE);
      expect(response.body.isActive).toBe(true);
    });

    it('deve rejeitar cadastro com código duplicado retornando HTTP 409 Conflict em formato RFC 7807', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/machines')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          code: 'E2E-SOPRO-01',
          name: 'Sopradora Duplicada',
        });

      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.status).toBe(409);
      expect(response.body.title).toBe('Conflito de Regra de Negócio');
      expect(response.body.code).toBe('MACHINE_CODE_ALREADY_EXISTS');
    });

    it('deve rejeitar cadastro por Operador com HTTP 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/machines')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          code: 'E2E-SOPRO-02',
          name: 'Sopradora Proibida',
        });

      expect(response.status).toBe(403);
      expect(response.body.status).toBe(403);
    });

    it('deve rejeitar cadastro sem token com HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/machines')
        .send({
          code: 'E2E-SOPRO-03',
          name: 'Sopradora Sem Token',
        });

      expect(response.status).toBe(401);
    });

    it('deve rejeitar cadastro com dados obrigatórios ausentes retornando HTTP 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/machines')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          model: 'Modelo Sem Nome Nem Código',
        });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('GET /api/machines', () => {
    it('deve permitir a usuário autenticado (Operador) listar sopradoras', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/machines')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const machine = response.body.find((m: { code: string }) => m.code === 'E2E-SOPRO-01');
      expect(machine).toBeDefined();
    });

    it('deve permitir filtrar máquinas por status e isActive', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/machines?isActive=true&status=IDLE')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every((m: { isActive: boolean; status: string }) => m.isActive && m.status === 'IDLE')).toBe(true);
    });
  });

  describe('GET /api/machines/:id', () => {
    it('deve buscar uma máquina por UUID existente', async () => {
      const created = await prisma.machine.create({
        data: {
          code: 'E2E-SOPRO-FIND',
          name: 'Sopradora Busca',
          model: 'Sidel SBO 6',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/machines/${created.id}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.code).toBe('E2E-SOPRO-FIND');
    });

    it('deve retornar HTTP 404 se UUID não existir', async () => {
      const nonExistentUuid = 'a0000000-0000-4000-8000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/machines/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });

    it('deve retornar HTTP 400 se UUID fornecido for inválido', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/machines/not-a-uuid')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('PATCH /api/machines/:id/status', () => {
    it('deve permitir ao Gerente inativar uma máquina sem alocações ativas', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-SOPRO-INACTIVATE',
          name: 'Sopradora Para Inativar',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/machines/${machine.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
      expect(response.body.status).toBe(MachineStatus.INACTIVE);
    });

    it('deve rejeitar transição manual direta para status RUNNING com HTTP 400', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-SOPRO-NORUN',
          name: 'Sopradora Sem Transição Manual',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/machines/${machine.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: MachineStatus.RUNNING,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('deve impedir inativação de máquina se ela possuir alocação ACTIVE retornando HTTP 409', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-SOPRO-ALLOCATED',
          name: 'Sopradora com Turno Ativo',
          status: MachineStatus.RUNNING,
          isActive: true,
        },
      });

      const shift = await prisma.shift.create({
        data: {
          name: 'Turno Teste E2E',
          startTime: '06:00',
          endTime: '14:00',
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
        .patch(`/api/machines/${machine.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('MACHINE_HAS_ACTIVE_ALLOCATION');
      expect(response.body.detail).toContain('Não é possível inativar a máquina enquanto houver uma alocação ativa');
    });

    it('deve rejeitar alteração de status por Operador com HTTP 403 Forbidden', async () => {
      const machine = await prisma.machine.findFirst();
      const response = await request(app.getHttpServer())
        .patch(`/api/machines/${machine!.id}/status`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/machines/:id', () => {
    it('deve permitir ao Gerente atualizar os dados cadastrais da sopradora', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-SOPRO-EDIT',
          name: 'Nome Antigo',
          model: 'Modelo Antigo',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/machines/${machine.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Nome Atualizado',
          model: 'Modelo Atualizado',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Nome Atualizado');
      expect(response.body.model).toBe('Modelo Atualizado');
    });
  });
});
