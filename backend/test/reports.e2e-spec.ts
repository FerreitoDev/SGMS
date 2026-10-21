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

describe('ReportsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let managerToken: string;
  let operatorToken: string;

  let machineId: string;
  let shiftId: string;
  let allocationId: string;

  const mgrUsername = 'e2e.rep.mgr';
  const opUsername = 'e2e.rep.op1';
  const rawPassword = 'password123';
  const todayStr = '2026-10-21';

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

    // Limpeza de testes anteriores do suíte
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-REP-' } } },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-REP-' } } },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-REP-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: {
        name: { startsWith: 'E2E-REP-' },
      },
    });
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-REP-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, opUsername] },
      },
    });

    const mgr = await prisma.user.create({
      data: {
        name: 'Gerente Reports E2E',
        username: mgrUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    const op = await prisma.user.create({
      data: {
        name: 'Operador Reports E2E',
        username: opUsername,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });

    // Login Gerente
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: mgrUsername, password: rawPassword });
    managerToken = mgrLogin.body.accessToken;

    // Login Operador
    const opLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: opUsername, password: rawPassword });
    operatorToken = opLogin.body.accessToken;

    // Criar Máquina e Turno
    const machine = await prisma.machine.create({
      data: {
        code: 'E2E-REP-M01',
        name: 'Sopradora Reports E2E',
        status: MachineStatus.IDLE,
        isActive: true,
      },
    });
    machineId = machine.id;

    const shift = await prisma.shift.create({
      data: {
        name: 'E2E-REP-Turno Manhã',
        startTime: '06:00',
        endTime: '14:00', // 480 min
        isActive: true,
      },
    });
    shiftId = shift.id;

    // Criar Alocação com produções e paradas consolidadas
    const allocation = await prisma.shiftAllocation.create({
      data: {
        machineId,
        shiftId,
        operatorId: op.id,
        shiftDate: new Date(`${todayStr}T00:00:00.000Z`),
        status: ShiftAllocationStatus.CLOSED,
        openedAt: new Date(`${todayStr}T06:00:00.000Z`),
        closedAt: new Date(`${todayStr}T14:00:00.000Z`),
      },
    });
    allocationId = allocation.id;

    // Produção: 5000 + 3000 = 8000 garrafas
    await prisma.productionEntry.createMany({
      data: [
        {
          clientUuid: randomUUID(),
          allocationId,
          quantity: 5000,
          timestamp: new Date(`${todayStr}T08:00:00.000Z`),
        },
        {
          clientUuid: randomUUID(),
          allocationId,
          quantity: 3000,
          timestamp: new Date(`${todayStr}T11:00:00.000Z`),
        },
      ],
    });

    // Paradas: MOLDE (40 min) e COMPRESSOR (20 min) = 60 min total
    await prisma.downtimeRecord.createMany({
      data: [
        {
          clientUuid: randomUUID(),
          allocationId,
          reason: DowntimeReason.MOLDE,
          justification: 'Troca de insert do molde',
          status: DowntimeStatus.RESOLVED,
          startTime: new Date(`${todayStr}T09:00:00.000Z`),
          endTime: new Date(`${todayStr}T09:40:00.000Z`),
          durationMinutes: 40,
        },
        {
          clientUuid: randomUUID(),
          allocationId,
          reason: DowntimeReason.COMPRESSOR,
          justification: 'Queda transitória de pressão',
          status: DowntimeStatus.RESOLVED,
          startTime: new Date(`${todayStr}T12:00:00.000Z`),
          endTime: new Date(`${todayStr}T12:20:00.000Z`),
          durationMinutes: 20,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-REP-' } } },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-REP-' } } },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-REP-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: {
        name: { startsWith: 'E2E-REP-' },
      },
    });
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-REP-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, opUsername] },
      },
    });
    await app.close();
  });

  describe('GET /api/reports/dashboard', () => {
    it('deve retornar métricas consolidadas e ranking Pareto quando consultado por Gerente', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .query({
          startDate: todayStr,
          endDate: todayStr,
        })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalBottles', 8000);
      expect(response.body).toHaveProperty('totalDowntimeMinutes', 60);
      expect(response.body).toHaveProperty('totalPlannedMinutes', 480);
      // T_liquido = 480 - 60 = 420 min (7h)
      // D = (420 / 480) * 100 = 87.5%
      expect(response.body).toHaveProperty('availabilityPercentage', 87.5);
      // R = 8000 / 7h = 1142.9 garrafas/h
      expect(response.body).toHaveProperty('averagePaceBottlesPerHour', 1142.9);

      // Pareto
      expect(response.body.pareto).toHaveLength(2);
      expect(response.body.pareto[0].reason).toBe(DowntimeReason.MOLDE);
      expect(response.body.pareto[0].reasonLabel).toBe('Molde');
      expect(response.body.pareto[0].totalMinutes).toBe(40);
      expect(response.body.pareto[0].percentage).toBe(66.7);
      expect(response.body.pareto[0].cumulativePercentage).toBe(66.7);

      expect(response.body.pareto[1].reason).toBe(DowntimeReason.COMPRESSOR);
      expect(response.body.pareto[1].totalMinutes).toBe(20);
      expect(response.body.pareto[1].percentage).toBe(33.3);
      expect(response.body.pareto[1].cumulativePercentage).toBe(100);
    });

    it('deve filtrar corretamente por machineId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .query({
          startDate: todayStr,
          endDate: todayStr,
          machineId,
        })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalBottles).toBe(8000);
      expect(response.body.totalDowntimeMinutes).toBe(60);
    });

    it('deve filtrar corretamente por shiftId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .query({
          startDate: todayStr,
          endDate: todayStr,
          shiftId,
        })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalBottles).toBe(8000);
    });

    it('deve retornar zeros honestos para período sem apontamentos (Zero Fallback)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .query({
          startDate: '2026-01-01',
          endDate: '2026-01-02',
        })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalBottles: 0,
        totalDowntimeMinutes: 0,
        totalPlannedMinutes: 0,
        availabilityPercentage: 0,
        averagePaceBottlesPerHour: 0,
        pareto: [],
      });
    });

    it('deve rejeitar acesso de Operador retornando HTTP 403 Forbidden com code FORBIDDEN_ROLE', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .query({
          startDate: todayStr,
          endDate: todayStr,
        })
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('deve rejeitar consulta sem token retornando HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .query({
          startDate: todayStr,
          endDate: todayStr,
        });

      expect(response.status).toBe(401);
    });

    it('deve rejeitar consulta sem parâmetros obrigatórios com HTTP 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(400);
    });

    it('deve rejeitar consulta quando endDate for menor que startDate com HTTP 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .query({
          startDate: '2026-10-25',
          endDate: '2026-10-20',
        })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_DATE_RANGE');
    });
  });
});
