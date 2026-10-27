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

describe('AllocationsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let op1Token: string;
  let op2Token: string;
  let mgrToken: string;
  let op1Id: string;
  let op2Id: string;

  const op1Username = 'e2e.alc.op1';
  const op2Username = 'e2e.alc.op2';
  const mgrUsername = 'e2e.alc.mgr';
  const rawPassword = 'password123';
  const todayStr = new Date().toISOString().split('T')[0];

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

    // Limpeza prévia específica do suíte de Allocations
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-ALC-' } } },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-ALC-' } } },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-ALC-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: {
        name: { startsWith: 'E2E-ALC-' },
      },
    });
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-ALC-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [op1Username, op2Username, mgrUsername] },
      },
    });

    const user1 = await prisma.user.create({
      data: {
        name: 'Operador 1 Allocations E2E',
        username: op1Username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    op1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        name: 'Operador 2 Allocations E2E',
        username: op2Username,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
    });
    op2Id = user2.id;

    await prisma.user.create({
      data: {
        name: 'Gerente Allocations E2E',
        username: mgrUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    // Login Operador 1
    const op1Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: op1Username, password: rawPassword });
    op1Token = op1Login.body.accessToken;

    // Login Operador 2
    const op2Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: op2Username, password: rawPassword });
    op2Token = op2Login.body.accessToken;

    // Login Gerente
    const mgrLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: mgrUsername, password: rawPassword });
    mgrToken = mgrLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.productionEntry.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-ALC-' } } },
      },
    });
    await prisma.downtimeRecord.deleteMany({
      where: {
        allocation: { machine: { code: { startsWith: 'E2E-ALC-' } } },
      },
    });
    await prisma.shiftAllocation.deleteMany({
      where: {
        machine: { code: { startsWith: 'E2E-ALC-' } },
      },
    });
    await prisma.shift.deleteMany({
      where: {
        name: { startsWith: 'E2E-ALC-' },
      },
    });
    await prisma.machine.deleteMany({
      where: {
        code: { startsWith: 'E2E-ALC-' },
      },
    });
    await prisma.user.deleteMany({
      where: {
        username: { in: [op1Username, op2Username, mgrUsername] },
      },
    });
    await app.close();
  });

  describe('POST /api/allocations', () => {
    it('deve permitir ao operador assumir máquina no turno, criando alocação ACTIVE e mudando status para RUNNING', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-ALC-SOPRO-01',
          name: 'Sopradora Alc 01',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });

      const shift = await prisma.shift.create({
        data: {
          name: 'E2E-ALC-Turno Manhã',
          startTime: '06:00',
          endTime: '14:00',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/allocations')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          machineId: machine.id,
          shiftId: shift.id,
          shiftDate: todayStr,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe(ShiftAllocationStatus.ACTIVE);
      expect(response.body.machineId).toBe(machine.id);
      expect(response.body.shiftId).toBe(shift.id);
      expect(response.body.operatorId).toBe(op1Id);
      expect(response.body.machine.status).toBe(MachineStatus.RUNNING);

      // Verificar persistência no banco
      const updatedMachine = await prisma.machine.findUnique({
        where: { id: machine.id },
      });
      expect(updatedMachine!.status).toBe(MachineStatus.RUNNING);
    });

    it('deve rejeitar segunda alocação na mesma máquina e turno retornando HTTP 409 Conflict (RN-01)', async () => {
      const machine = await prisma.machine.findUnique({
        where: { code: 'E2E-ALC-SOPRO-01' },
      });
      const shift = await prisma.shift.findFirst({
        where: { name: 'E2E-ALC-Turno Manhã' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/allocations')
        .set('Authorization', `Bearer ${op2Token}`)
        .send({
          machineId: machine!.id,
          shiftId: shift!.id,
          shiftDate: todayStr,
        });

      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('MACHINE_ALREADY_ALLOCATED');
      expect(response.body.detail).toBe('Máquina já possui alocação ativa neste turno por outro operador.');
    });

    it('deve rejeitar alocação quando operador já possui alocação ativa em andamento com HTTP 409', async () => {
      const machine2 = await prisma.machine.create({
        data: {
          code: 'E2E-ALC-SOPRO-02',
          name: 'Sopradora Alc 02',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });
      const shift = await prisma.shift.findFirst({
        where: { name: 'E2E-ALC-Turno Manhã' },
      });

      // op1 já tem alocação ativa na SOPRO-01
      const response = await request(app.getHttpServer())
        .post('/api/allocations')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          machineId: machine2.id,
          shiftId: shift!.id,
          shiftDate: todayStr,
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('OPERATOR_ALREADY_ALLOCATED');
    });

    it('deve rejeitar alocação em máquina inativa com HTTP 422 Unprocessable Entity', async () => {
      const inactiveMachine = await prisma.machine.create({
        data: {
          code: 'E2E-ALC-INACTIVE',
          name: 'Sopradora Inativa',
          status: MachineStatus.INACTIVE,
          isActive: false,
        },
      });
      const shift = await prisma.shift.findFirst({
        where: { name: 'E2E-ALC-Turno Manhã' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/allocations')
        .set('Authorization', `Bearer ${op2Token}`)
        .send({
          machineId: inactiveMachine.id,
          shiftId: shift!.id,
          shiftDate: todayStr,
        });

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('MACHINE_INACTIVE');
    });

    it('deve rejeitar requisição sem token com HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/allocations')
        .send({
          machineId: '00000000-0000-4000-8000-000000000000',
          shiftId: '00000000-0000-4000-8000-000000000000',
          shiftDate: todayStr,
        });

      expect(response.status).toBe(401);
    });

    it('deve garantir atomicidade em concorrência estrita via Promise.all (apenas 1 ganha, outro 409)', async () => {
      // Criar nova máquina e turno isolados
      const concMachine = await prisma.machine.create({
        data: {
          code: 'E2E-ALC-CONCURRENT',
          name: 'Sopradora Concorrente',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });

      const concShift = await prisma.shift.create({
        data: {
          name: 'E2E-ALC-Turno Concorrente',
          startTime: '14:00',
          endTime: '22:00',
          isActive: true,
        },
      });

      // Limpeza prévia de concorrência
      await prisma.shiftAllocation.deleteMany({
        where: { operator: { username: { in: ['e2e.alc.conca', 'e2e.alc.concb'] } } },
      });
      await prisma.user.deleteMany({
        where: { username: { in: ['e2e.alc.conca', 'e2e.alc.concb'] } },
      });

      // Criar 2 novos operadores limpos sem alocações ativas
      const pHash = await bcrypt.hash('pass123', 10);
      const userA = await prisma.user.create({
        data: {
          name: 'Op Concorrente A',
          username: 'e2e.alc.conca',
          passwordHash: pHash,
          role: UserRole.OPERADOR,
          isActive: true,
        },
      });
      const userB = await prisma.user.create({
        data: {
          name: 'Op Concorrente B',
          username: 'e2e.alc.concb',
          passwordHash: pHash,
          role: UserRole.OPERADOR,
          isActive: true,
        },
      });

      const resA = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'e2e.alc.conca', password: 'pass123' });
      const resB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'e2e.alc.concb', password: 'pass123' });

      const tokenA = resA.body.accessToken;
      const tokenB = resB.body.accessToken;

      // Executar 2 requisições concorrentes disparadas simultaneamente
      const [responseA, responseB] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/allocations')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            machineId: concMachine.id,
            shiftId: concShift.id,
            shiftDate: '2026-10-22',
          }),
        request(app.getHttpServer())
          .post('/api/allocations')
          .set('Authorization', `Bearer ${tokenB}`)
          .send({
            machineId: concMachine.id,
            shiftId: concShift.id,
            shiftDate: '2026-10-22',
          }),
      ]);

      const statuses = [responseA.status, responseB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictResponse = responseA.status === 409 ? responseA : responseB;
      expect(conflictResponse.body.code).toBe('MACHINE_ALREADY_ALLOCATED');

      // Limpeza dos usuários concorrentes e suas alocações
      await prisma.shiftAllocation.deleteMany({
        where: { operator: { username: { in: ['e2e.alc.conca', 'e2e.alc.concb'] } } },
      });
      await prisma.user.deleteMany({
        where: { username: { in: ['e2e.alc.conca', 'e2e.alc.concb'] } },
      });
    });
  });

  describe('GET /api/allocations/current', () => {
    it('deve retornar null com HTTP 200 quando o operador não possuir alocação ativa (Zero Fallback)', async () => {
      await prisma.shiftAllocation.deleteMany({
        where: { operatorId: op2Id },
      });

      const response = await request(app.getHttpServer())
        .get('/api/allocations/current')
        .set('Authorization', `Bearer ${op2Token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });

    it('deve retornar dados completos da alocação corrente ativa para o operador alocado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/allocations/current')
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(200);
      expect(response.body).not.toBeNull();
      expect(response.body.status).toBe(ShiftAllocationStatus.ACTIVE);
      expect(response.body.operatorId).toBe(op1Id);
      expect(response.body).toHaveProperty('machine');
      expect(response.body.machine.code).toBe('E2E-ALC-SOPRO-01');
      expect(response.body.machine.status).toBe(MachineStatus.RUNNING);
      expect(response.body).toHaveProperty('shift');
      expect(response.body.shift.name).toBe('E2E-ALC-Turno Manhã');
    });

    it('deve rejeitar consulta sem token com HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/allocations/current');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/allocations/:id/release', () => {
    it('deve rejeitar tentativa de outro operador liberar alocação alheia com HTTP 403 Forbidden', async () => {
      // Buscar a alocação ativa do op1
      const currentRes = await request(app.getHttpServer())
        .get('/api/allocations/current')
        .set('Authorization', `Bearer ${op1Token}`);
      const allocationId = currentRes.body.id;

      // op2 tenta liberar a alocação do op1
      const response = await request(app.getHttpServer())
        .patch(`/api/allocations/${allocationId}/release`)
        .set('Authorization', `Bearer ${op2Token}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ALLOCATION');
    });

    it('deve permitir ao próprio operador liberar sua alocação, revertendo a máquina para IDLE', async () => {
      const currentRes = await request(app.getHttpServer())
        .get('/api/allocations/current')
        .set('Authorization', `Bearer ${op1Token}`);
      const allocationId = currentRes.body.id;

      const response = await request(app.getHttpServer())
        .patch(`/api/allocations/${allocationId}/release`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ShiftAllocationStatus.CLOSED);
      expect(response.body.closedAt).not.toBeNull();
      expect(response.body.machine.status).toBe(MachineStatus.IDLE);

      // Verificar persistência no banco da máquina como IDLE
      const machine = await prisma.machine.findUnique({
        where: { id: response.body.machineId },
      });
      expect(machine!.status).toBe(MachineStatus.IDLE);

      // Verificar que op1 não possui mais alocação ativa
      const checkCurrent = await request(app.getHttpServer())
        .get('/api/allocations/current')
        .set('Authorization', `Bearer ${op1Token}`);
      expect(checkCurrent.body).toBeNull();
    });

    it('deve rejeitar tentativa de liberar alocação já encerrada com HTTP 409 Conflict', async () => {
      const closedAllocation = await prisma.shiftAllocation.findFirst({
        where: {
          operatorId: op1Id,
          status: ShiftAllocationStatus.CLOSED,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/allocations/${closedAllocation!.id}/release`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('ALLOCATION_ALREADY_CLOSED');
    });

    it('deve permitir ao Gerente liberar a alocação de um operador', async () => {
      // Criar alocação nova para op2
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-ALC-MGR-REL',
          name: 'Sopradora Mgr Release',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });
      const shift = await prisma.shift.findFirst({
        where: { name: 'E2E-ALC-Turno Manhã' },
      });

      const allocRes = await request(app.getHttpServer())
        .post('/api/allocations')
        .set('Authorization', `Bearer ${op2Token}`)
        .send({
          machineId: machine.id,
          shiftId: shift!.id,
          shiftDate: '2026-10-23',
        });
      expect(allocRes.status).toBe(201);

      // Gerente libera a alocação do op2
      const response = await request(app.getHttpServer())
        .patch(`/api/allocations/${allocRes.body.id}/release`)
        .set('Authorization', `Bearer ${mgrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ShiftAllocationStatus.CLOSED);
      expect(response.body.machine.status).toBe(MachineStatus.IDLE);
    });

    it('deve retornar HTTP 404 se alocação não existir', async () => {
      const nonExistentUuid = 'a0000000-0000-4000-8000-000000000000';
      const response = await request(app.getHttpServer())
        .patch(`/api/allocations/${nonExistentUuid}/release`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(404);
    });

    it('deve retornar HTTP 400 se UUID fornecido for inválido', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/allocations/not-a-uuid/release')
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/allocations/:id/close', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    it('deve rejeitar tentativa de outro operador fechar alocação alheia com HTTP 403 Forbidden', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-ALC-CLS-OP1',
          name: 'Sopradora Close Test 1',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });
      const shift = await prisma.shift.findFirst({
        where: { name: 'E2E-ALC-Turno Manhã' },
      });

      const allocRes = await request(app.getHttpServer())
        .post('/api/allocations')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          machineId: machine.id,
          shiftId: shift!.id,
          shiftDate: todayStr,
        });
      expect(allocRes.status).toBe(201);

      // op2 tenta fechar a alocação do op1
      const response = await request(app.getHttpServer())
        .post(`/api/allocations/${allocRes.body.id}/close`)
        .set('Authorization', `Bearer ${op2Token}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN_ALLOCATION');
    });

    it('deve permitir ao próprio operador fechar seu turno, resolvendo paradas em andamento e liberando a máquina para IDLE', async () => {
      // Buscar a alocação ativa do op1
      const currentRes = await request(app.getHttpServer())
        .get('/api/allocations/current')
        .set('Authorization', `Bearer ${op1Token}`);
      const allocationId = currentRes.body.id;

      // Iniciar uma parada em andamento nesta alocação
      const downtimeRes = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId,
          reason: DowntimeReason.MOLDE,
          startTime: new Date().toISOString(),
          justification: 'Parada antes de encerrar o turno',
        });
      expect(downtimeRes.status).toBe(201);
      expect(downtimeRes.body.status).toBe(DowntimeStatus.IN_PROGRESS);

      // Operador fecha o turno
      const response = await request(app.getHttpServer())
        .post(`/api/allocations/${allocationId}/close`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ShiftAllocationStatus.CLOSED);
      expect(response.body.closedAt).not.toBeNull();
      expect(response.body.machine.status).toBe(MachineStatus.IDLE);

      // Verificar que a parada foi automaticamente resolvida no banco
      const downtimeDb = await prisma.downtimeRecord.findUnique({
        where: { id: downtimeRes.body.id },
      });
      expect(downtimeDb!.status).toBe(DowntimeStatus.RESOLVED);
      expect(downtimeDb!.endTime).not.toBeNull();
      expect(downtimeDb!.durationMinutes).toBeGreaterThanOrEqual(0);

      // Verificar máquina no banco como IDLE
      const machine = await prisma.machine.findUnique({
        where: { id: response.body.machineId },
      });
      expect(machine!.status).toBe(MachineStatus.IDLE);
    });

    it('deve rejeitar tentativa de fechar alocação já encerrada com HTTP 409 Conflict', async () => {
      const closedAllocation = await prisma.shiftAllocation.findFirst({
        where: {
          operatorId: op1Id,
          status: ShiftAllocationStatus.CLOSED,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/allocations/${closedAllocation!.id}/close`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('ALLOCATION_ALREADY_CLOSED');
    });

    it('deve permitir ao Gerente fechar a alocação de qualquer operador', async () => {
      const machine = await prisma.machine.create({
        data: {
          code: 'E2E-ALC-MGR-CLS',
          name: 'Sopradora Mgr Close',
          status: MachineStatus.IDLE,
          isActive: true,
        },
      });
      const shift = await prisma.shift.findFirst({
        where: { name: 'E2E-ALC-Turno Manhã' },
      });

      const allocRes = await request(app.getHttpServer())
        .post('/api/allocations')
        .set('Authorization', `Bearer ${op2Token}`)
        .send({
          machineId: machine.id,
          shiftId: shift!.id,
          shiftDate: todayStr,
        });
      expect(allocRes.status).toBe(201);

      // Gerente fecha a alocação do op2
      const response = await request(app.getHttpServer())
        .post(`/api/allocations/${allocRes.body.id}/close`)
        .set('Authorization', `Bearer ${mgrToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(ShiftAllocationStatus.CLOSED);
      expect(response.body.machine.status).toBe(MachineStatus.IDLE);
    });
  });

  describe('AllocationActiveGuard & Imutabilidade (RN-06)', () => {
    let closedAllocId: string;

    beforeAll(async () => {
      const closedAlloc = await prisma.shiftAllocation.findFirst({
        where: {
          operatorId: op1Id,
          status: ShiftAllocationStatus.CLOSED,
        },
      });
      closedAllocId = closedAlloc!.id;
    });

    it('deve rejeitar apontamento de produção em alocação encerrada por operador com HTTP 403 e code SHIFT_CLOSED', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocId,
          quantity: 150,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });

    it('deve rejeitar abertura de parada em alocação encerrada por operador com HTTP 403 e code SHIFT_CLOSED', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/downtimes/start')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocId,
          reason: DowntimeReason.MOLDE,
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });

    it('deve rejeitar parada retroativa em alocação encerrada por operador com HTTP 403 e code SHIFT_CLOSED', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10 * 60000);

      const response = await request(app.getHttpServer())
        .post('/api/downtimes/retroactive')
        .set('Authorization', `Bearer ${op1Token}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocId,
          reason: DowntimeReason.MECANICA,
          startTime: past.toISOString(),
          endTime: now.toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SHIFT_CLOSED');
    });

    it('deve permitir consulta de produções em alocação encerrada com HTTP 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/productions/allocation/${closedAllocId}`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.allocationId).toBe(closedAllocId);
    });

    it('deve permitir consulta de paradas em alocação encerrada com HTTP 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/downtimes/allocation/${closedAllocId}`)
        .set('Authorization', `Bearer ${op1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.allocationId).toBe(closedAllocId);
    });

    it('deve permitir ao Gerente realizar apontamento de produção em alocação encerrada (ajuste pós-fechamento)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/productions')
        .set('Authorization', `Bearer ${mgrToken}`)
        .send({
          clientUuid: randomUUID(),
          allocationId: closedAllocId,
          quantity: 200,
          timestamp: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(200);
    });
  });
});

