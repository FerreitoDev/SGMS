import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, MachineStatus, ShiftAllocationStatus } from '@prisma/client';

describe('AllocationsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let op1Token: string;
  let op2Token: string;
  let op1Id: string;
  let op2Id: string;

  const op1Username = 'e2e.alc.op1';
  const op2Username = 'e2e.alc.op2';
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

    // Limpeza prévia específica do suíte de Allocations
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
        username: { in: [op1Username, op2Username] },
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
  });

  afterAll(async () => {
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
        username: { in: [op1Username, op2Username] },
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
          shiftDate: '2026-10-21',
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
          shiftDate: '2026-10-21',
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
          shiftDate: '2026-10-21',
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
          shiftDate: '2026-10-21',
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
          shiftDate: '2026-10-21',
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
});
