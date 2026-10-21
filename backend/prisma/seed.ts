import { PrismaClient, UserRole, MachineStatus, ShiftAllocationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Iniciando população da base de dados de desenvolvimento/testes...');

  // 1. Senhas padrão
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
  const operatorPasswordHash = await bcrypt.hash('operador123', saltRounds);

  // 2. Usuários (Gerente e Operadores)
  const usersData = [
    {
      name: 'Administrador Gerente',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: UserRole.GERENTE,
      isActive: true,
    },
    {
      name: 'Carlos Silva (Operador 1)',
      username: 'operador1',
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERADOR,
      isActive: true,
    },
    {
      name: 'João Santos (Operador 2)',
      username: 'operador2',
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERADOR,
      isActive: true,
    },
    {
      name: 'Marcos Lima (Inativo)',
      username: 'operador3',
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERADOR,
      isActive: false,
    },
  ];

  const createdUsers: Record<string, string> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        passwordHash: u.passwordHash,
      },
      create: u,
    });
    createdUsers[u.username] = user.id;
    console.log(`[Seed] Usuário '${u.username}' pronto (ID: ${user.id}, Role: ${u.role}, Ativo: ${u.isActive})`);
  }

  // 3. Turnos de Trabalho (Shifts)
  const shiftsData = [
    {
      name: 'Turno 1 - Manhã',
      startTime: '06:00',
      endTime: '14:00',
      isActive: true,
    },
    {
      name: 'Turno 2 - Tarde',
      startTime: '14:00',
      endTime: '22:00',
      isActive: true,
    },
    {
      name: 'Turno 3 - Noite',
      startTime: '22:00',
      endTime: '06:00',
      isActive: true,
    },
    {
      name: 'Turno 4 - Comercial',
      startTime: '08:00',
      endTime: '17:00',
      isActive: false,
    },
  ];

  const createdShifts: Record<string, string> = {};

  for (const s of shiftsData) {
    let shift = await prisma.shift.findFirst({
      where: { name: s.name },
    });

    if (!shift) {
      shift = await prisma.shift.create({ data: s });
    } else {
      shift = await prisma.shift.update({
        where: { id: shift.id },
        data: {
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive,
        },
      });
    }

    createdShifts[s.name] = shift.id;
    console.log(`[Seed] Turno '${s.name}' pronto (${s.startTime} - ${s.endTime}, Ativo: ${s.isActive})`);
  }

  // 4. Parque de Máquinas de Sopro (Machines)
  const machinesData = [
    {
      code: 'SOPRO-01',
      name: 'Sopradora Linha 01 (500ml / 1L)',
      model: 'Krones Contiform 3',
      status: MachineStatus.RUNNING, // Alocada para operador1
      isActive: true,
    },
    {
      code: 'SOPRO-02',
      name: 'Sopradora Linha 02 (Galão 5L)',
      model: 'Sidel SBO 6',
      status: MachineStatus.IDLE, // Livre
      isActive: true,
    },
    {
      code: 'SOPRO-03',
      name: 'Sopradora Linha 03 (2L / 3L)',
      model: 'AOKI 250LL',
      status: MachineStatus.IDLE, // Livre
      isActive: true,
    },
    {
      code: 'SOPRO-04',
      name: 'Sopradora Linha 04 (Mini PET)',
      model: null, // Zero Fallback: modelo opcional ausente
      status: MachineStatus.IDLE, // Livre
      isActive: true,
    },
    {
      code: 'SOPRO-05',
      name: 'Sopradora Reserva',
      model: 'Sidel Universal',
      status: MachineStatus.INACTIVE,
      isActive: false,
    },
  ];

  const createdMachines: Record<string, string> = {};

  for (const m of machinesData) {
    const machine = await prisma.machine.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        model: m.model,
        status: m.status,
        isActive: m.isActive,
      },
      create: m,
    });
    createdMachines[m.code] = machine.id;
    console.log(`[Seed] Máquina '${m.code}' pronta (Status: ${m.status}, Ativo: ${m.isActive})`);
  }

  // 5. Alocações de Turno (ShiftAllocations)
  // Data atual para testes operacionais
  const todayIso = new Date().toISOString().split('T')[0];
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().split('T')[0];
  const yesterdayDate = new Date(`${yesterdayIso}T00:00:00.000Z`);

  // Alocação ATIVA para operador1 em SOPRO-01 no Turno 1 de hoje
  const op1Id = createdUsers['operador1'];
  const sopro1Id = createdMachines['SOPRO-01'];
  const turno1Id = createdShifts['Turno 1 - Manhã'];

  const existingActiveAlloc = await prisma.shiftAllocation.findFirst({
    where: {
      operatorId: op1Id,
      status: ShiftAllocationStatus.ACTIVE,
    },
  });

  if (!existingActiveAlloc) {
    const activeAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: sopro1Id,
        shiftId: turno1Id,
        operatorId: op1Id,
        shiftDate: todayDate,
        status: ShiftAllocationStatus.ACTIVE,
        openedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Aberta há 2 horas
      },
    });
    console.log(`[Seed] Alocação ATIVA criada para 'operador1' na 'SOPRO-01' (ID: ${activeAlloc.id})`);
  } else {
    console.log(`[Seed] 'operador1' já possui alocação ativa (ID: ${existingActiveAlloc.id})`);
  }

  // Alocação FECHADA de ontem para operador2 em SOPRO-02 (histórico)
  const op2Id = createdUsers['operador2'];
  const sopro2Id = createdMachines['SOPRO-02'];

  const existingClosedAlloc = await prisma.shiftAllocation.findFirst({
    where: {
      operatorId: op2Id,
      shiftDate: yesterdayDate,
    },
  });

  if (!existingClosedAlloc) {
    const closedAlloc = await prisma.shiftAllocation.create({
      data: {
        machineId: sopro2Id,
        shiftId: turno1Id,
        operatorId: op2Id,
        shiftDate: yesterdayDate,
        status: ShiftAllocationStatus.CLOSED,
        openedAt: new Date(yesterday.setHours(6, 0, 0, 0)),
        closedAt: new Date(yesterday.setHours(14, 0, 0, 0)),
      },
    });
    console.log(`[Seed] Alocação ENCERRADA de ontem criada para 'operador2' (ID: ${closedAlloc.id})`);
  } else {
    console.log(`[Seed] Alocação encerrada de ontem para 'operador2' já existe.`);
  }

  console.log('\n[Seed] Resumo das credenciais para testes manuais:');
  console.log('---------------------------------------------------------');
  console.log(' Gerente / Admin:');
  console.log('   Username: admin');
  console.log('   Senha:    admin123');
  console.log('   Permissões: Total (/admin/machines, /admin/shifts, /admin/users)');
  console.log('---------------------------------------------------------');
  console.log(' Operador 1 (Com máquina alocada em andamento):');
  console.log('   Username: operador1');
  console.log('   Senha:    operador123');
  console.log('   Máquina:  SOPRO-01 (RUNNING) - Turno 1 Manhã');
  console.log('   Fluxo:    Direto para /chao-de-fabrica/console');
  console.log('---------------------------------------------------------');
  console.log(' Operador 2 (Livre, sem alocação ativa):');
  console.log('   Username: operador2');
  console.log('   Senha:    operador123');
  console.log('   Status:   Sem máquina');
  console.log('   Fluxo:    Direto para /chao-de-fabrica/alocacao (selecionar máquina e turno)');
  console.log('---------------------------------------------------------');
  console.log(' Operador 3 (Inativo):');
  console.log('   Username: operador3');
  console.log('   Senha:    operador123');
  console.log('   Status:   Inativo (testar rejeição de login)');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('[Seed] Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
