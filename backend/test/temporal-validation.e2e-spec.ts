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
} from '@prisma/client';
import { randomUUID } from 'crypto';

describe('TemporalValidation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let opToken: string;
  let opId: string;
  let activeAllocationId: string;

  const username = 'e2e.temp.op';
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
          machine: { code: { startsWith: 'E2E-TEMP-' } },
        },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-TEMP-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-TEMP-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-TEMP-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-TEMP-' } },
    });
    await prisma.user.deleteMany({
      where: { username },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Operador Temporal E2E',
        username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    opId = user.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username, password: rawPassword });
    opToken = loginRes.body.accessToken;

    const machine = await prisma.machine.create({
      data: {
        code: 'E2E-TEMP-MCH-01',
        name: 'Sopradora Temporal',
        status: MachineStatus.RUNNING,
        isActive: true,
      },
    });

    const shift = await prisma.shift.create({
      data: {
        name: 'E2E-TEMP-Turno 1',
        startTime: '06:00',
        endTime: '14:00',
        isActive: true,
      },
    });

    const allocation = await prisma.shiftAllocation.create({
      data: {
        machineId: machine.id,
        shiftId: shift.id,
        operatorId: opId,
        shiftDate: new Date('2026-10-21T00:00:00.000Z'),
        status: ShiftAllocationStatus.ACTIVE,
      },
    });
    activeAllocationId = allocation.id;
  });

  afterAll(async () => {
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-TEMP-' } },
        },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-TEMP-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-TEMP-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-TEMP-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-TEMP-' } },
    });
    await prisma.user.deleteMany({
      where: { username },
    });

    await app.close();
  });

  describe('Validação Temporal Estrita (RN-05)', () => {
    it('deve rejeitar carimbo mais de 2 minutos no futuro com HTTP 422 (FUTURE_TIMESTAMP)', async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min no futuro
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: 100,
          timestamp: futureDate,
        });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('FUTURE_TIMESTAMP');
    });

    it('deve tolerar pequeno desvio de relógio (ex: 30 segundos no futuro) retornando HTTP 201', async () => {
      const slightFuture = new Date(Date.now() + 30 * 1000).toISOString(); // 30s no futuro (dentro da tolerância de 2min)
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: 150,
          timestamp: slightFuture,
        });

      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(150);
    });

    it('deve rejeitar evento com data discrepante fora da janela do turno com HTTP 422 (OUT_OF_SHIFT_WINDOW)', async () => {
      const pastDate = new Date('2026-10-10T10:00:00.000Z').toISOString(); // 11 dias antes do turno da alocação
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          quantity: 200,
          timestamp: pastDate,
        });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('OUT_OF_SHIFT_WINDOW');
    });

    it('deve validar tolerância temporal em paradas retroativas também', async () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.ELETRICA,
          startTime: '2026-10-21T08:00:00.000Z',
          endTime: farFuture,
        });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('FUTURE_TIMESTAMP');
    });
  });
});
