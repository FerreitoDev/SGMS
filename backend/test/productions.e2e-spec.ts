import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, MachineStatus, ShiftAllocationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

describe('ProductionsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken: string;
  let op1Token: string;
  let op2Token: string;

  let op1Id: string;
  let op2Id: string;
  let activeAllocationId: string;
  let closedAllocationId: string;

  const mgrUsername = 'e2e.prod.mgr';
  const op1Username = 'e2e.prod.op1';
  const op2Username = 'e2e.prod.op2';
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

    // Limpeza de testes anteriores
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-PROD-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-PROD-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-PROD-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-PROD-' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, op1Username, op2Username] },
      },
    });

    // Criação de usuários
    await prisma.user.create({
      data: {
        name: 'Gerente Produção E2E',
        username: mgrUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    const op1 = await prisma.user.create({
      data: {
        name: 'Operador Produção 1',
        username: op1Username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    op1Id = op1.id;

    const op2 = await prisma.user.create({
      data: {
        name: 'Operador Produção 2',
        username: op2Username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    op2Id = op2.id;

    // Login dos usuários
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: mgrUsername, password: rawPassword });
    managerToken = mgrLogin.body.accessToken;

    const op1Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: op1Username, password: rawPassword });
    op1Token = op1Login.body.accessToken;

    const op2Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: op2Username, password: rawPassword });
    op2Token = op2Login.body.accessToken;

    // Criar Máquina e Turno
    const machine = await prisma.machine.create({
      data: {
        code: 'E2E-PROD-MCH-01',
        name: 'Sopradora E2E Produção',
        status: MachineStatus.RUNNING,
        isActive: true,
      },
    });

    const shift = await prisma.shift.create({
      data: {
        name: 'E2E-PROD-Turno 1',
        startTime: '06:00',
        endTime: '14:00',
        isActive: true,
      },
    });

    const todayIso = new Date().toISOString().split('T')[0];
    const todayDate = new Date(`${todayIso}T00:00:00.000Z`);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().split('T')[0];
    const yesterdayDate = new Date(`${yesterdayIso}T00:00:00.000Z`);

    // Criar Alocação ATIVA para op1
    const activeAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: machine.id,
        shiftId: shift.id,
        operatorId: op1Id,
        shiftDate: todayDate,
        status: ShiftAllocationStatus.ACTIVE,
      },
    });
    activeAllocationId = activeAlloc.id;

    // Criar Alocação CLOSED para testar bloqueio RN-06
    const closedAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: machine.id,
        shiftId: shift.id,
        operatorId: op1Id,
        shiftDate: yesterdayDate,
        status: ShiftAllocationStatus.CLOSED,
        closedAt: new Date(),
      },
    });
    closedAllocationId = closedAlloc.id;
  });

  afterAll(async () => {
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-PROD-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-PROD-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-PROD-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-PROD-' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, op1Username, op2Username] },
      },
    });
    await app.close();
  });

  describe('POST /api/productions', () => {
    const validClientUuid = randomUUID();

    it('deve permitir ao operador alocado registrar produção válida com HTTP 201 Created', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: validClientUuid,
          allocationId: activeAllocationId,
          quantity: 2400,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.clientUuid).toBe(validClientUuid);
      expect(response.body.allocationId).toBe(activeAllocationId);
      expect(response.body.quantity).toBe(2400);

      // Verificar persistência no banco
      const inDb = await prisma.productionEntry.findUnique({
        where: { clientUuid: validClientUuid },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.quantity).toBe(2400);
    });

    it('deve ser idempotente: reenviar o mesmo clientUuid deve retornar HTTP 200 OK sem duplicar contagem no banco (RN-07)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: validClientUuid,
          allocationId: activeAllocationId,
          quantity: 2400,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.clientUuid).toBe(validClientUuid);

      // Verificar que não duplicou registro no banco
      const totalCount = await prisma.productionEntry.count({
        where: { clientUuid: validClientUuid },
      });
      expect(totalCount).toBe(1);
    });

    it('deve permitir ao Gerente registrar produção em alocação ativa com HTTP 201 Created', async () => {
      const mgrClientUuid = randomUUID();
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          clientUuid: mgrClientUuid,
          allocationId: activeAllocationId,
          quantity: 1000,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(1000);
    });

    it('deve rejeitar apontamento com quantidade zero (quantity: 0) com HTTP 422 Unprocessable Entity (RN-02)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: 0,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(422);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('INVALID_QUANTITY');
    });

    it('deve rejeitar apontamento com quantidade negativa (quantity: -50) com HTTP 422 Unprocessable Entity (RN-02)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: -50,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(422);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('INVALID_QUANTITY');
    });

    it('deve rejeitar timestamp no futuro com HTTP 422 Unprocessable Entity (RN-05)', async () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hora no futuro
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: 500,
          timestamp: futureTime,
        });

      expect(response.status).toBe(422);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('FUTURE_TIMESTAMP');
    });

    it('deve rejeitar apontamento por operador não alocado na máquina com HTTP 403 Forbidden (RN-08)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op2Token}`) // op2 tentando apontar na alocação do op1
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: 300,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ALLOCATION');
    });

    it('deve rejeitar apontamento em alocação com status CLOSED com HTTP 403 Forbidden (RN-06)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocationId,
          quantity: 400,
          timestamp: new Date('2026-10-20T12:00:00.000Z').toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });

    it('deve retornar HTTP 404 se a alocação não for encontrada', async () => {
      const nonExistentUuid = randomUUID();
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: nonExistentUuid,
          quantity: 100,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar requisição sem token com HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: 100,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(401);
    });

    it('deve rejeitar UUID inválido com HTTP 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: 'not-a-uuid',
          allocationId: activeAllocationId,
          quantity: 100,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/productions/allocation/:id', () => {
    it('deve retornar o histórico ordenado de apontamentos e a quantidade acumulada do turno', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/productions/allocation/${activeAllocationId}`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.allocationId).toBe(activeAllocationId);
      expect(typeof response.body.totalQuantity).toBe('number');
      // 2400 (op1) + 1000 (mgr) = 3400
      expect(response.body.totalQuantity).toBe(3400);
      expect(Array.isArray(response.body.entries)).toBe(true);
      expect(response.body.entries.length).toBe(2);
    });

    it('deve retornar HTTP 404 se a alocação não existir', async () => {
      const nonExistentUuid = randomUUID();
      const response = await request(app.getHttpServer())
        .get(`/api/productions/allocation/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar HTTP 400 se o UUID fornecido for inválido', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/productions/allocation/invalido')
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar consulta sem autenticação com HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/productions/allocation/${activeAllocationId}`);

      expect(response.status).toBe(401);
    });
  });
});
