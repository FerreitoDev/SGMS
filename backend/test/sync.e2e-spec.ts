import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  MachineStatus,
  ShiftAllocationStatus,
  DowntimeReason,
  DowntimeStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

describe('SyncModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken: string;
  let op1Token: string;
  let op2Token: string;

  let op1Id: string;
  let op2Id: string;
  let machineId: string;
  let activeAllocationId: string;
  let closedAllocationId: string;

  const mgrUsername = 'e2e.sync.mgr';
  const op1Username = 'e2e.sync.op1';
  const op2Username = 'e2e.sync.op2';
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
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-SYNC-' } },
        },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-SYNC-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-SYNC-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-SYNC-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-SYNC-' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, op1Username, op2Username] },
      },
    });

    // Criar usuários
    await prisma.user.create({
      data: {
        name: 'Gerente Sync E2E',
        username: mgrUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    const op1 = await prisma.user.create({
      data: {
        name: 'Operador Sync 1',
        username: op1Username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    op1Id = op1.id;

    const op2 = await prisma.user.create({
      data: {
        name: 'Operador Sync 2',
        username: op2Username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    op2Id = op2.id;

    // Login
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
        code: 'E2E-SYNC-MCH-01',
        name: 'Sopradora E2E Sync',
        status: MachineStatus.RUNNING,
        isActive: true,
      },
    });
    machineId = machine.id;

    const shift = await prisma.shift.create({
      data: {
        name: 'E2E-SYNC-Turno 1',
        startTime: '06:00',
        endTime: '14:00',
        isActive: true,
      },
    });

    // Criar Alocação Ativa
    const activeAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: machine.id,
        shiftId: shift.id,
        operatorId: op1Id,
        shiftDate: new Date('2026-10-21T00:00:00.000Z'),
        status: ShiftAllocationStatus.ACTIVE,
      },
    });
    activeAllocationId = activeAlloc.id;

    // Criar Alocação Fechada
    const closedAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: machine.id,
        shiftId: shift.id,
        operatorId: op1Id,
        shiftDate: new Date('2026-10-20T00:00:00.000Z'),
        status: ShiftAllocationStatus.CLOSED,
        closedAt: new Date('2026-10-20T14:00:00.000Z'),
      },
    });
    closedAllocationId = closedAlloc.id;
  });

  afterAll(async () => {
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-SYNC-' } },
        },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-SYNC-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-SYNC-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-SYNC-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-SYNC-' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, op1Username, op2Username] },
      },
    });

    await app.close();
  });

  describe('POST /api/sync', () => {
    it('deve processar lote vazio retornando contagens zeradas', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({ events: [] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        totalReceived: 0,
        processedCount: 0,
        ignoredCount: 0,
        processedClientUuids: [],
        ignoredClientUuids: [],
      });
    });

    it('deve sincronizar com sucesso lote com produção e paradas (consolidada e em tempo real)', async () => {
      const prodUuid = randomUUID();
      const retroDownUuid = randomUUID();
      const realTimeDownUuid = randomUUID();

      const startTime = '2026-10-21T09:00:00.000Z';
      const endTime = '2026-10-21T09:30:00.000Z';
      const realTimeStart = '2026-10-21T11:00:00.000Z';

      const payload = {
        events: [
          {
            clientUuid: prodUuid,
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 250,
              timestamp: '2026-10-21T08:30:00.000Z',
            },
          },
          {
            clientUuid: retroDownUuid,
            type: 'DOWNTIME',
            payload: {
              allocationId: activeAllocationId,
              reason: DowntimeReason.MECANICA,
              startTime,
              endTime,
            },
          },
          {
            clientUuid: realTimeDownUuid,
            type: 'DOWNTIME',
            payload: {
              allocationId: activeAllocationId,
              reason: DowntimeReason.OUTROS,
              justification: 'Vazamento de água no molde principal',
              startTime: realTimeStart,
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalReceived).toBe(3);
      expect(response.body.processedCount).toBe(3);
      expect(response.body.ignoredCount).toBe(0);
      expect(response.body.processedClientUuids).toEqual([
        prodUuid,
        retroDownUuid,
        realTimeDownUuid,
      ]);

      // Verificar persistência no banco
      const savedProd = await prisma.productionEntry.findUnique({
        where: { clientUuid: prodUuid },
      });
      expect(savedProd).not.toBeNull();
      expect(savedProd?.quantity).toBe(250);

      const savedRetro = await prisma.downtimeRecord.findUnique({
        where: { clientUuid: retroDownUuid },
      });
      expect(savedRetro).not.toBeNull();
      expect(savedRetro?.status).toBe(DowntimeStatus.RESOLVED);
      expect(savedRetro?.durationMinutes).toBe(30);

      const savedRealTime = await prisma.downtimeRecord.findUnique({
        where: { clientUuid: realTimeDownUuid },
      });
      expect(savedRealTime).not.toBeNull();
      expect(savedRealTime?.status).toBe(DowntimeStatus.IN_PROGRESS);
      expect(savedRealTime?.justification).toBe('Vazamento de água no molde principal');

      // Máquina deve ter sido alterada para STOPPED por causa da parada em tempo real
      const mch = await prisma.machine.findUnique({ where: { id: machineId } });
      expect(mch?.status).toBe(MachineStatus.STOPPED);

      // Limpar parada aberta para os próximos testes
      await prisma.downtimeRecord.delete({ where: { id: savedRealTime!.id } });
      await prisma.machine.update({
        where: { id: machineId },
        data: { status: MachineStatus.RUNNING },
      });
    });

    it('deve ser 100% idempotente ao reenviar lote idêntico já processado (RN-07)', async () => {
      const prodUuid = randomUUID();
      const payload = {
        events: [
          {
            clientUuid: prodUuid,
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 100,
              timestamp: '2026-10-21T07:30:00.000Z',
            },
          },
        ],
      };

      // Primeiro envio
      const firstRes = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.processedCount).toBe(1);
      expect(firstRes.body.ignoredCount).toBe(0);

      // Segundo envio imediato
      const secondRes = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.processedCount).toBe(0);
      expect(secondRes.body.ignoredCount).toBe(1);
      expect(secondRes.body.ignoredClientUuids).toEqual([prodUuid]);
    });

    it('deve realizar rollback atômico de todo o lote se um evento violar regra de negócio (ACID)', async () => {
      const validProdUuid = randomUUID();
      const invalidProdUuid = randomUUID();

      const payload = {
        events: [
          {
            clientUuid: validProdUuid,
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 50,
              timestamp: '2026-10-21T08:00:00.000Z',
            },
          },
          {
            clientUuid: invalidProdUuid,
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: -10, // Inválido! Q >= 1
              timestamp: '2026-10-21T08:05:00.000Z',
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('INVALID_QUANTITY');

      // Provar rollback: O evento válido NÃO deve estar salvo no banco de dados!
      const shouldNotExist = await prisma.productionEntry.findUnique({
        where: { clientUuid: validProdUuid },
      });
      expect(shouldNotExist).toBeNull();
    });

    it('deve rejeitar lote contendo timestamp futuro com HTTP 422 (RN-05)', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const payload = {
        events: [
          {
            clientUuid: randomUUID(),
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 100,
              timestamp: futureDate,
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('FUTURE_TIMESTAMP');
    });

    it('deve rejeitar lote em turno fechado com HTTP 403 (RN-06)', async () => {
      const payload = {
        events: [
          {
            clientUuid: randomUUID(),
            type: 'PRODUCTION',
            payload: {
              allocationId: closedAllocationId,
              quantity: 80,
              timestamp: '2026-10-20T10:00:00.000Z',
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });

    it('deve rejeitar lote de operador não alocado com HTTP 403 (RN-08)', async () => {
      const payload = {
        events: [
          {
            clientUuid: randomUUID(),
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 80,
              timestamp: '2026-10-21T09:00:00.000Z',
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${op2Token}`)
        .send(payload);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ALLOCATION');
    });

    it('deve permitir sincronização executada por GERENTE', async () => {
      const mgrProdUuid = randomUUID();
      const payload = {
        events: [
          {
            clientUuid: mgrProdUuid,
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 120,
              timestamp: '2026-10-21T09:15:00.000Z',
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.processedClientUuids).toContain(mgrProdUuid);
    });
  });
});
