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

describe('DowntimesModule (e2e)', () => {
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

  const mgrUsername = 'e2e.down.mgr';
  const op1Username = 'e2e.down.op1';
  const op2Username = 'e2e.down.op2';
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
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-DWN-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-DWN-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-DWN-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-DWN-' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, op1Username, op2Username] },
      },
    });

    // Criar usuários
    await prisma.user.create({
      data: {
        name: 'Gerente Downtimes E2E',
        username: mgrUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    const op1 = await prisma.user.create({
      data: {
        name: 'Operador Downtimes 1',
        username: op1Username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    op1Id = op1.id;

    const op2 = await prisma.user.create({
      data: {
        name: 'Operador Downtimes 2',
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
        code: 'E2E-DWN-MCH-01',
        name: 'Sopradora E2E Paradas',
        status: MachineStatus.RUNNING,
        isActive: true,
      },
    });
    machineId = machine.id;

    const shift = await prisma.shift.create({
      data: {
        name: 'E2E-DWN-Turno 1',
        startTime: '06:00',
        endTime: '14:00',
        isActive: true,
      },
    });

    // Alocação ATIVA
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

    // Alocação CLOSED
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
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: {
          machine: { code: { startsWith: 'E2E-DWN-' } },
        },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-DWN-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: { name: { startsWith: 'E2E-DWN-' } },
    });
    await prisma.machine.deleteMany({
      where: { code: { startsWith: 'E2E-DWN-' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [mgrUsername, op1Username, op2Username] },
      },
    });
    await app.close();
  });

  describe('POST /api/downtimes/start e PATCH /api/downtimes/:id/resolve (Ciclo Real-Time)', () => {
    let createdDowntimeId: string;
    const startClientUuid = randomUUID();
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    it('deve abrir ocorrência de parada em tempo real e alterar status da máquina para STOPPED', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: startClientUuid,
          allocationId: activeAllocationId,
          reason: DowntimeReason.COMPRESSOR,
          startTime: twentyMinutesAgo,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      createdDowntimeId = response.body.id;
      expect(response.body.status).toBe(DowntimeStatus.IN_PROGRESS);
      expect(response.body.reason).toBe(DowntimeReason.COMPRESSOR);
      expect(response.body.justification).toBeNull();
      expect(response.body.endTime).toBeNull();
      expect(response.body.durationMinutes).toBeNull();

      // Verificar que a máquina transitou para STOPPED
      const machine = await prisma.machine.findUnique({
        where: { id: machineId },
      });
      expect(machine!.status).toBe(MachineStatus.STOPPED);
    });

    it('deve ser idempotente ao reenviar o mesmo clientUuid de parada (RN-07)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: startClientUuid,
          allocationId: activeAllocationId,
          reason: DowntimeReason.COMPRESSOR,
          startTime: twentyMinutesAgo,
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdDowntimeId);

      const count = await prisma.downtimeRecord.count({
        where: { clientUuid: startClientUuid },
      });
      expect(count).toBe(1);
    });

    it('deve rejeitar abertura de nova parada concorrente se já houver parada IN_PROGRESS na máquina', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.MOLDE,
          startTime: new Date().toISOString(),
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('DOWNTIME_ALREADY_IN_PROGRESS');
    });

    it('deve rejeitar resolução com horário de término anterior ao início com HTTP 422 (RN-03)', async () => {
      const earlierTime = new Date(new Date(twentyMinutesAgo).getTime() - 5 * 60 * 1000).toISOString();
      const response = await request(app.getHttpServer())
        .patch(`/api/downtimes/${createdDowntimeId}/resolve`)
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          endTime: earlierTime,
        });

      expect(response.status).toBe(422);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('INVALID_DOWNTIME_RANGE');
    });

    it('deve rejeitar resolução com horário futuro com HTTP 422 (RN-05)', async () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const response = await request(app.getHttpServer())
        .patch(`/api/downtimes/${createdDowntimeId}/resolve`)
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          endTime: futureTime,
        });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('FUTURE_TIMESTAMP');
    });

    it('deve rejeitar resolução de parada por operador não vinculado com HTTP 403', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/downtimes/${createdDowntimeId}/resolve`)
        .set('Authorization', `Bearer ${op2Token}`)
        .send({
          endTime: new Date().toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ALLOCATION');
    });

    it('deve resolver a parada com sucesso, calculando durationMinutes e revertendo máquina para RUNNING', async () => {
      // startTime foi 20 minutos atrás, endTime agora -> durationMinutes deve ser aproximadamente 20
      const resolveTime = new Date().toISOString();
      const response = await request(app.getHttpServer())
        .patch(`/api/downtimes/${createdDowntimeId}/resolve`)
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          endTime: resolveTime,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(DowntimeStatus.RESOLVED);
      expect(response.body.endTime).not.toBeNull();
      expect(response.body.durationMinutes).toBeGreaterThanOrEqual(19);

      // Verificar que máquina reverteu para RUNNING
      const machine = await prisma.machine.findUnique({
        where: { id: machineId },
      });
      expect(machine!.status).toBe(MachineStatus.RUNNING);
    });

    it('deve rejeitar tentativa de resolver parada já encerrada com HTTP 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/downtimes/${createdDowntimeId}/resolve`)
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          endTime: new Date().toISOString(),
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('DOWNTIME_ALREADY_RESOLVED');
    });
  });

  describe('Validações Específicas de Motivo OUTROS e Zero Fallback (RN-04)', () => {
    it('deve rejeitar motivo OUTROS sem justificativa com HTTP 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.OUTROS,
          startTime: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_JUSTIFICATION');
    });

    it('deve rejeitar motivo OUTROS com justificativa menor que 5 caracteres com HTTP 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.OUTROS,
          justification: 'abc', // < 5 caracteres
          startTime: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_JUSTIFICATION');
    });

    it('deve aceitar motivo OUTROS com justificativa válida (>= 5 caracteres)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.OUTROS,
          justification: 'Vazamento na mangueira pneumática auxiliar',
          startTime: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.reason).toBe(DowntimeReason.OUTROS);
      expect(response.body.justification).toBe('Vazamento na mangueira pneumática auxiliar');

      // Limpar parada aberta para os próximos testes
      await prisma.downtimeRecord.delete({ where: { id: response.body.id } });
      await prisma.machine.update({
        where: { id: machineId },
        data: { status: MachineStatus.RUNNING },
      });
    });

    it('deve anular justificativa (null estrito) se motivo for diferente de OUTROS mesmo se enviada (Zero Fallback)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.ELETRICA,
          justification: 'Texto qualquer que deve ser ignorado',
          startTime: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.reason).toBe(DowntimeReason.ELETRICA);
      expect(response.body.justification).toBeNull();

      // Limpar
      await prisma.downtimeRecord.delete({ where: { id: response.body.id } });
      await prisma.machine.update({
        where: { id: machineId },
        data: { status: MachineStatus.RUNNING },
      });
    });

    it('deve rejeitar apontamento de parada em turno fechado com HTTP 403 (RN-06)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocationId,
          reason: DowntimeReason.MECANICA,
          startTime: new Date('2026-10-20T10:00:00.000Z').toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });
  });

  describe('GET /api/downtimes/allocation/:id', () => {
    it('deve retornar o sumário e a lista de ocorrências da alocação', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/downtimes/allocation/${activeAllocationId}`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.allocationId).toBe(activeAllocationId);
      expect(typeof response.body.totalDurationMinutes).toBe('number');
      expect(Array.isArray(response.body.records)).toBe(true);
    });

    it('deve retornar HTTP 404 se a alocação não existir', async () => {
      const nonExistentUuid = randomUUID();
      const response = await request(app.getHttpServer())
        .get(`/api/downtimes/allocation/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/downtimes/retroactive', () => {
    it('deve registrar parada retroativa com status RESOLVED, calcular durationMinutes e NÃO alterar o status da máquina', async () => {
      const clientUuid = randomUUID();
      const startTime = '2026-10-21T10:00:00.000Z';
      const endTime = '2026-10-21T10:45:00.000Z';

      // Verificar status prévio da máquina
      const machineBefore = await prisma.machine.findUnique({ where: { id: machineId } });
      expect(machineBefore?.status).toBe(MachineStatus.RUNNING);

      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid,
          allocationId: activeAllocationId,
          reason: DowntimeReason.MECANICA,
          startTime,
          endTime,
        });

      expect(response.status).toBe(201);
      expect(response.body.clientUuid).toBe(clientUuid);
      expect(response.body.allocationId).toBe(activeAllocationId);
      expect(response.body.reason).toBe(DowntimeReason.MECANICA);
      expect(response.body.status).toBe(DowntimeStatus.RESOLVED);
      expect(response.body.justification).toBeNull();
      expect(response.body.durationMinutes).toBe(45);
      expect(new Date(response.body.startTime).toISOString()).toBe(startTime);
      expect(new Date(response.body.endTime).toISOString()).toBe(endTime);

      // Invariante essencial: Status da máquina continua RUNNING
      const machineAfter = await prisma.machine.findUnique({ where: { id: machineId } });
      expect(machineAfter?.status).toBe(MachineStatus.RUNNING);
    });

    it('deve retornar idempotência HTTP 200 ao reenviar mesmo clientUuid (RN-07)', async () => {
      const clientUuid = randomUUID();
      const startTime = '2026-10-21T11:00:00.000Z';
      const endTime = '2026-10-21T11:20:00.000Z';

      const payload = {
        clientUuid,
        allocationId: activeAllocationId,
        reason: DowntimeReason.ELETRICA,
        startTime,
        endTime,
      };

      const firstResponse = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(firstResponse.status).toBe(201);

      const duplicateResponse = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send(payload);

      expect(duplicateResponse.status).toBe(200);
      expect(duplicateResponse.body.id).toBe(firstResponse.body.id);
      expect(duplicateResponse.body.durationMinutes).toBe(20);
    });

    it('deve exigir justificativa com no mínimo 5 caracteres quando motivo for OUTROS (HTTP 400)', async () => {
      // Sem justificativa
      const resWithout = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.OUTROS,
          startTime: '2026-10-21T12:00:00.000Z',
          endTime: '2026-10-21T12:15:00.000Z',
        });

      expect(resWithout.status).toBe(400);
      expect(resWithout.body.detail).toMatch(/justificativa.*obrigatória/i);

      // Justificativa curta (< 5 chars)
      const resShort = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.OUTROS,
          justification: 'abc',
          startTime: '2026-10-21T12:00:00.000Z',
          endTime: '2026-10-21T12:15:00.000Z',
        });

      expect(resShort.status).toBe(400);
      expect(resShort.body.detail).toMatch(/mínimo de 5 caracteres/i);
    });

    it('deve aceitar OUTROS com justificativa >= 5 caracteres', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.OUTROS,
          justification: 'Falta de ar comprimido na linha geral',
          startTime: '2026-10-21T12:00:00.000Z',
          endTime: '2026-10-21T12:30:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.reason).toBe(DowntimeReason.OUTROS);
      expect(response.body.justification).toBe('Falta de ar comprimido na linha geral');
      expect(response.body.durationMinutes).toBe(30);
    });

    it('deve anular justificativa (null estrito) se motivo for diferente de OUTROS mesmo se enviada (Zero Fallback)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.MOLDE,
          justification: 'Texto qualquer que deve ser ignorado',
          startTime: '2026-10-21T13:00:00.000Z',
          endTime: '2026-10-21T13:10:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.reason).toBe(DowntimeReason.MOLDE);
      expect(response.body.justification).toBeNull();
      expect(response.body.durationMinutes).toBe(10);
    });

    it('deve rejeitar se endTime < startTime com HTTP 422 (INVALID_DOWNTIME_RANGE)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.MECANICA,
          startTime: '2026-10-21T14:00:00.000Z',
          endTime: '2026-10-21T13:00:00.000Z',
        });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('INVALID_DOWNTIME_RANGE');
    });

    it('deve rejeitar timestamps futuros com HTTP 422 (FUTURE_TIMESTAMP)', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.MECANICA,
          startTime: '2026-10-21T10:00:00.000Z',
          endTime: futureDate,
        });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('FUTURE_TIMESTAMP');
    });

    it('deve rejeitar operador não alocado tentando registrar parada com HTTP 403 (FORBIDDEN_ALLOCATION)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op2Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.MECANICA,
          startTime: '2026-10-21T10:00:00.000Z',
          endTime: '2026-10-21T10:15:00.000Z',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ALLOCATION');
    });

    it('deve rejeitar registro em turno fechado com HTTP 403 (SHIFT_CLOSED)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocationId,
          reason: DowntimeReason.MECANICA,
          startTime: '2026-10-20T10:00:00.000Z',
          endTime: '2026-10-20T10:30:00.000Z',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });

    it('deve permitir que GERENTE registre parada retroativa mesmo não sendo o operador alocado', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: activeAllocationId,
          reason: DowntimeReason.COMPRESSOR,
          startTime: '2026-10-21T15:00:00.000Z',
          endTime: '2026-10-21T15:25:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.reason).toBe(DowntimeReason.COMPRESSOR);
      expect(response.body.durationMinutes).toBe(25);
    });
  });
});
