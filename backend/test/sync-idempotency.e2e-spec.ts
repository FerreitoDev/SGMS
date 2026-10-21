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

describe('SyncIdempotency & ZeroFallback Audit (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let opToken: string;
  let opId: string;
  let machineId: string;
  let activeAllocationId: string;
  let closedAllocationId: string;

  const username = 'e2e.idem.op';
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
          machine: { code: { startsWith: 'E2E-IDEM-' } },
        },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-IDEM-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-IDEM-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-IDEM-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-IDEM-' } },
    });
    await prisma.user.deleteMany({
      where: { username },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Operador Idempotência E2E',
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
        code: 'E2E-IDEM-MCH-01',
        name: 'Sopradora Idempotência',
        status: MachineStatus.RUNNING,
        isActive: true,
      },
    });
    machineId = machine.id;

    const shift = await prisma.shift.create({
      data: {
        name: 'E2E-IDEM-Turno 1',
        startTime: '06:00',
        endTime: '14:00',
        isActive: true,
      },
    });

    const activeAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: machine.id,
        shiftId: shift.id,
        operatorId: opId,
        shiftDate: new Date('2026-10-21T00:00:00.000Z'),
        status: ShiftAllocationStatus.ACTIVE,
      },
    });
    activeAllocationId = activeAlloc.id;

    const closedAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: machine.id,
        shiftId: shift.id,
        operatorId: opId,
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
          machine: { code: { startsWith: 'E2E-IDEM-' } },
        },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-IDEM-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-IDEM-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-IDEM-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-IDEM-' } },
    });
    await prisma.user.deleteMany({
      where: { username },
    });

    await app.close();
  });

  describe('Idempotência Sob Retransmissão Múltipla de Lotes', () => {
    it('deve processar 5 retransmissões sucessivas do mesmo lote mantendo o volume total estritamente inalterado', async () => {
      const event1Uuid = randomUUID();
      const event2Uuid = randomUUID();
      const event3Uuid = randomUUID();

      const batchPayload = {
        events: [
          {
            clientUuid: event1Uuid,
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 300,
              timestamp: '2026-10-21T07:00:00.000Z',
            },
          },
          {
            clientUuid: event2Uuid,
            type: 'PRODUCTION',
            payload: {
              allocationId: activeAllocationId,
              quantity: 200,
              timestamp: '2026-10-21T08:00:00.000Z',
            },
          },
          {
            clientUuid: event3Uuid,
            type: 'DOWNTIME',
            payload: {
              allocationId: activeAllocationId,
              reason: DowntimeReason.MOLDE,
              startTime: '2026-10-21T08:30:00.000Z',
              endTime: '2026-10-21T08:50:00.000Z',
            },
          },
        ],
      };

      // 1ª transmissão: deve gravar todos os 3 eventos
      const res1 = await request(app.getHttpServer())
        .post('/api/sync')
        .set('Authorization', `Bearer ${opToken}`)
        .send(batchPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.processedCount).toBe(3);
      expect(res1.body.ignoredCount).toBe(0);

      // Reenvios 2 a 5: devem ser totalmente ignorados sem alterar contagens
      for (let i = 2; i <= 5; i++) {
        const retransmitRes = await request(app.getHttpServer())
          .post('/api/sync')
          .set('Authorization', `Bearer ${opToken}`)
          .send(batchPayload);

        expect(retransmitRes.status).toBe(200);
        expect(retransmitRes.body.processedCount).toBe(0);
        expect(retransmitRes.body.ignoredCount).toBe(3);
      }

      // Validar consulta agregada de produção: exatamente 500 garrafas (300 + 200)
      const prodHistory = await request(app.getHttpServer())
        .get(`/api/productions/allocation/${activeAllocationId}`)
        .set('Authorization', `Bearer ${opToken}`);

      expect(prodHistory.status).toBe(200);
      expect(prodHistory.body.totalQuantity).toBe(500);
      expect(prodHistory.body.entries.length).toBe(2);

      // Validar consulta agregada de paradas: exatamente 20 minutos (1 registro)
      const downHistory = await request(app.getHttpServer())
        .get(`/api/downtimes/allocation/${activeAllocationId}`)
        .set('Authorization', `Bearer ${opToken}`);

      expect(downHistory.status).toBe(200);
      expect(downHistory.body.totalDurationMinutes).toBe(20);
      expect(downHistory.body.records.length).toBe(1);
    });

    it('deve rejeitar apontamento de produção em alocação fechada com HTTP 403 Forbidden (RN-06)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocationId,
          quantity: 100,
          timestamp: '2026-10-20T10:00:00.000Z',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });

    it('deve rejeitar apontamento de parada em alocação fechada com HTTP 403 Forbidden (RN-06)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocationId,
          reason: DowntimeReason.MECANICA,
          startTime: '2026-10-20T11:00:00.000Z',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });
  });

  describe('Auditoria de Integridade Zero Fallback', () => {
    it('deve garantir que paradas com motivo diferente de OUTROS tenham justification estritamente null no banco de dados', async () => {
      const clientUuid = randomUUID();
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid,
          allocationId: activeAllocationId,
          reason: DowntimeReason.COMPRESSOR,
          justification: 'Texto espúrio enviado acidentalmente pelo cliente',
          startTime: '2026-10-21T09:00:00.000Z',
          endTime: '2026-10-21T09:15:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.justification).toBeNull();

      // Consulta direta ao banco de dados via Prisma para prova de integridade
      const record = await prisma.downtimeRecord.findUnique({
        where: { clientUuid },
      });
      expect(record?.justification).toBeNull();
    });

    it('deve garantir que paradas com motivo OUTROS persistam o texto exato sem fallbacks artificiais', async () => {
      const clientUuid = randomUUID();
      const justificationText = 'Troca emergencial da válvula termostática';
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid,
          allocationId: activeAllocationId,
          reason: DowntimeReason.OUTROS,
          justification: justificationText,
          startTime: '2026-10-21T09:30:00.000Z',
          endTime: '2026-10-21T09:55:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.justification).toBe(justificationText);

      const record = await prisma.downtimeRecord.findUnique({
        where: { clientUuid },
      });
      expect(record?.justification).toBe(justificationText);
    });

    it('deve assegurar que paradas abertas tenham durationMinutes estritamente null até sua resolução', async () => {
      const clientUuid = randomUUID();
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${opToken}`)
        .send({
          clientUuid,
          allocationId: activeAllocationId,
          reason: DowntimeReason.AQUECIMENTO_FORNO,
          startTime: '2026-10-21T10:00:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(DowntimeStatus.IN_PROGRESS);
      expect(response.body.durationMinutes).toBeNull();
      expect(response.body.endTime).toBeNull();

      const record = await prisma.downtimeRecord.findUnique({
        where: { clientUuid },
      });
      expect(record?.durationMinutes).toBeNull();
      expect(record?.endTime).toBeNull();

      // Limpar
      await prisma.downtimeRecord.delete({ where: { clientUuid } });
      await prisma.machine.update({
        where: { id: machineId },
        data: { status: MachineStatus.RUNNING },
      });
    });
  });
});
