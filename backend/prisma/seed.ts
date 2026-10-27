import {
  PrismaClient,
  UserRole,
  MachineStatus,
  ShiftAllocationStatus,
  DowntimeReason,
  DowntimeStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Gerador pseudo-aleatório determinístico para reprodutibilidade estrita
let seed = 42;
function pseudoRandom(): number {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(pseudoRandom() * (max - min + 1)) + min;
}

interface ShiftConfig {
  name: string;
  startTime: string;
  endTime: string;
  startHour: number;
  endHour: number;
  crossesMidnight: boolean;
}

const SHIFTS_CONFIG: ShiftConfig[] = [
  {
    name: 'Turno 1 - Manhã',
    startTime: '06:00',
    endTime: '14:00',
    startHour: 6,
    endHour: 14,
    crossesMidnight: false,
  },
  {
    name: 'Turno 2 - Tarde',
    startTime: '14:00',
    endTime: '22:00',
    startHour: 14,
    endHour: 22,
    crossesMidnight: false,
  },
  {
    name: 'Turno 3 - Noite',
    startTime: '22:00',
    endTime: '06:00',
    startHour: 22,
    endHour: 6,
    crossesMidnight: true,
  },
];

const DOWNTIME_REASONS = [
  { reason: DowntimeReason.MOLDE, justification: 'Troca e alinhamento de insert de molde', weight: 0.32 },
  { reason: DowntimeReason.PRE_FORMA, justification: 'Travamento na calha de alimentação de pré-formas', weight: 0.26 },
  { reason: DowntimeReason.AQUECIMENTO_FORNO, justification: 'Ajuste térmico nas lâmpadas infravermelhas', weight: 0.16 },
  { reason: DowntimeReason.COMPRESSOR, justification: 'Oscilação transitória de pressão de sopro 40 bar', weight: 0.12 },
  { reason: DowntimeReason.MECANICA, justification: 'Ajuste de pinça de transferência de garrafas', weight: 0.07 },
  { reason: DowntimeReason.ELETRICA, justification: 'Falha intermitente em sensor óptico de garrafa', weight: 0.04 },
  { reason: DowntimeReason.OUTROS, justification: 'Higienização e limpeza de rotina da área de sopro', weight: 0.03 },
];

function pickDowntimeReason() {
  const r = pseudoRandom();
  let acc = 0;
  for (const item of DOWNTIME_REASONS) {
    acc += item.weight;
    if (r <= acc) {
      return item;
    }
  }
  return DOWNTIME_REASONS[0];
}

async function main() {
  console.log('[Seed] Iniciando população de banco de dados SGMS (30 dias + 3 turnos)...');

  // 1. Senhas padrão
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
  const operatorPasswordHash = await bcrypt.hash('operador123', saltRounds);

  // 2. Usuários (Gerente + 5 Operadores Ativos + 1 Inativo)
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
      name: 'Maria Oliveira (Operadora 3)',
      username: 'operador3',
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERADOR,
      isActive: true,
    },
    {
      name: 'Ana Souza (Operadora 4)',
      username: 'operador4',
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERADOR,
      isActive: true,
    },
    {
      name: 'Lucas Mendes (Operador 5)',
      username: 'operador5',
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERADOR,
      isActive: true,
    },
    {
      name: 'Marcos Lima (Inativo)',
      username: 'operador_inativo',
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
  }
  console.log(`[Seed] ${Object.keys(createdUsers).length} usuários prontos.`);

  // Lista de operadores ativos para rodízio nos turnos
  const activeOperatorIds = [
    createdUsers['operador1'],
    createdUsers['operador2'],
    createdUsers['operador3'],
    createdUsers['operador4'],
    createdUsers['operador5'],
  ];

  // 3. Turnos de Trabalho (3 Turnos Contínuos cobrindo 24h)
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
  }
  console.log(`[Seed] 3 Turnos operacionais configurados.`);

  // 4. Parque de Máquinas de Sopro (Machines)
  const machinesData = [
    {
      code: 'SOPRO-01',
      name: 'Sopradora Linha 01 (500ml / 1L)',
      model: 'Krones Contiform 3',
      baseSpeed: 1050, // garrafas por hora nominal
      status: MachineStatus.RUNNING, // Ativa no console do operador1
      isActive: true,
    },
    {
      code: 'SOPRO-02',
      name: 'Sopradora Linha 02 (Galão 5L)',
      model: 'Sidel SBO 6',
      baseSpeed: 550, // garrafas por hora nominal
      status: MachineStatus.IDLE,
      isActive: true,
    },
    {
      code: 'SOPRO-03',
      name: 'Sopradora Linha 03 (2L / 3L)',
      model: 'AOKI 250LL',
      baseSpeed: 800, // garrafas por hora nominal
      status: MachineStatus.IDLE,
      isActive: true,
    },
    {
      code: 'SOPRO-04',
      name: 'Sopradora Linha 04 (Mini PET)',
      model: null, // Zero Fallback: modelo opcional ausente
      baseSpeed: 700,
      status: MachineStatus.IDLE,
      isActive: true,
    },
    {
      code: 'SOPRO-05',
      name: 'Sopradora Reserva',
      model: 'Sidel Universal',
      baseSpeed: 600,
      status: MachineStatus.INACTIVE,
      isActive: false,
    },
  ];

  const createdMachines: Record<string, { id: string; baseSpeed: number }> = {};
  for (const m of machinesData) {
    const machine = await prisma.machine.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        model: m.model,
        status: m.status,
        isActive: m.isActive,
      },
      create: {
        code: m.code,
        name: m.name,
        model: m.model,
        status: m.status,
        isActive: m.isActive,
      },
    });
    createdMachines[m.code] = { id: machine.id, baseSpeed: m.baseSpeed };
  }
  console.log(`[Seed] Parque de sopradoras configurado.`);

  // 5. Limpeza de dados operacionais anteriores (para idempotência)
  console.log('[Seed] Limpando registros operacionais anteriores...');
  await prisma.downtimeRecord.deleteMany({});
  await prisma.productionEntry.deleteMany({});
  await prisma.shiftAllocation.deleteMany({});

  // 6. Geração de Histórico de 31 dias (30 dias passados + dia atual)
  const operationalMachineCodes = ['SOPRO-01', 'SOPRO-02', 'SOPRO-03'];
  const today = new Date();
  const totalDays = 31; // 30 dias passados + hoje

  const allocationsToInsert: Array<{
    id: string;
    machineId: string;
    shiftId: string;
    operatorId: string;
    shiftDate: Date;
    status: ShiftAllocationStatus;
    openedAt: Date;
    closedAt: Date | null;
  }> = [];

  const productionsToInsert: Array<{
    id: string;
    clientUuid: string;
    allocationId: string;
    quantity: number;
    timestamp: Date;
    createdAt: Date;
  }> = [];

  const downtimesToInsert: Array<{
    id: string;
    clientUuid: string;
    allocationId: string;
    reason: DowntimeReason;
    justification: string;
    status: DowntimeStatus;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  let operatorCycleIndex = 0;

  for (let dayOffset = totalDays - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - dayOffset);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const shiftDate = new Date(`${dateStr}T00:00:00.000Z`);

    const isToday = dayOffset === 0;

    for (const shiftConfig of SHIFTS_CONFIG) {
      const shiftId = createdShifts[shiftConfig.name];

      for (const machineCode of operationalMachineCodes) {
        const machine = createdMachines[machineCode];

        // Definir operador para esta alocação (rodízio equilibrado)
        const operatorId = activeOperatorIds[operatorCycleIndex % activeOperatorIds.length];
        operatorCycleIndex++;

        // Tratamento especial para o dia de hoje (2026-10-27, ~19:46):
        // Turno 1 (06:00 - 14:00): Encerrado
        // Turno 2 (14:00 - 22:00):
        //   - SOPRO-01: ATIVA para operador1 (console operacional pronto)
        //   - SOPRO-02 e SOPRO-03: Livres (sem alocação para permitir testes de alocação)
        // Turno 3 (22:00 - 06:00): Ainda não iniciado hoje
        if (isToday) {
          if (shiftConfig.name === 'Turno 3 - Noite') {
            // Turno futuro de hoje: não criar alocação antecipada
            continue;
          }

          if (shiftConfig.name === 'Turno 2 - Tarde') {
            if (machineCode === 'SOPRO-01') {
              // Alocação ATIVA atual
              const allocId = randomUUID();
              const openedAt = new Date(`${dateStr}T14:00:00.000Z`);

              allocationsToInsert.push({
                id: allocId,
                machineId: machine.id,
                shiftId,
                operatorId: createdUsers['operador1'], // Garante operador1
                shiftDate,
                status: ShiftAllocationStatus.ACTIVE,
                openedAt,
                closedAt: null,
              });

              // Lançamentos de produção até as 19:00 de hoje
              for (let h = 15; h <= 19; h++) {
                const hourStr = String(h).padStart(2, '0');
                const ts = new Date(`${dateStr}T${hourStr}:00:00.000Z`);
                const qty = Math.round(machine.baseSpeed * (0.92 + pseudoRandom() * 0.15));

                productionsToInsert.push({
                  id: randomUUID(),
                  clientUuid: randomUUID(),
                  allocationId: allocId,
                  quantity: qty,
                  timestamp: ts,
                  createdAt: ts,
                });
              }

              // 1 Parada resolvida às 16:20 (25 min)
              const dtStart = new Date(`${dateStr}T16:20:00.000Z`);
              const dtEnd = new Date(`${dateStr}T16:45:00.000Z`);
              const dtReason = pickDowntimeReason();

              downtimesToInsert.push({
                id: randomUUID(),
                clientUuid: randomUUID(),
                allocationId: allocId,
                reason: dtReason.reason,
                justification: dtReason.justification,
                status: DowntimeStatus.RESOLVED,
                startTime: dtStart,
                endTime: dtEnd,
                durationMinutes: 25,
                createdAt: dtStart,
                updatedAt: dtEnd,
              });

              continue;
            } else {
              // SOPRO-02 e SOPRO-03 ficam livres neste turno de hoje para teste de alocação
              continue;
            }
          }
        }

        // Alocações Históricas Fechadas (Dias passados ou Turno 1 de hoje)
        const allocId = randomUUID();

        // Cálculo de abertura e fechamento
        let openedAt: Date;
        let closedAt: Date;

        const startHourStr = String(shiftConfig.startHour).padStart(2, '0');
        const endHourStr = String(shiftConfig.endHour).padStart(2, '0');

        if (!shiftConfig.crossesMidnight) {
          openedAt = new Date(`${dateStr}T${startHourStr}:00:00.000Z`);
          closedAt = new Date(`${dateStr}T${endHourStr}:00:00.000Z`);
        } else {
          // Turno da noite (22:00 do dia atual até 06:00 do dia seguinte)
          openedAt = new Date(`${dateStr}T${startHourStr}:00:00.000Z`);
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextYear = nextDay.getFullYear();
          const nextMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
          const nextDayStr = String(nextDay.getDate()).padStart(2, '0');
          closedAt = new Date(`${nextYear}-${nextMonth}-${nextDayStr}T${endHourStr}:00:00.000Z`);
        }

        allocationsToInsert.push({
          id: allocId,
          machineId: machine.id,
          shiftId,
          operatorId,
          shiftDate,
          status: ShiftAllocationStatus.CLOSED,
          openedAt,
          closedAt,
        });

        // Determinar se haverá paradas neste turno (70% de chance de ter ao menos 1 parada)
        const hasDowntime = pseudoRandom() < 0.72;
        let totalDowntimeMinutesThisShift = 0;
        let downtimeHourIndex = -1;

        if (hasDowntime) {
          const dtCount = pseudoRandom() < 0.25 ? 2 : 1; // 25% de ter 2 paradas

          for (let d = 0; d < dtCount; d++) {
            const dtReason = pickDowntimeReason();
            const duration = getRandomInt(15, 55);
            totalDowntimeMinutesThisShift += duration;

            // Hora em que ocorre a parada (ex: 2ª ou 4ª hora do turno)
            downtimeHourIndex = d === 0 ? getRandomInt(1, 3) : getRandomInt(4, 6);

            let dtStartTime: Date;
            if (!shiftConfig.crossesMidnight) {
              const dtH = shiftConfig.startHour + downtimeHourIndex;
              const dtHStr = String(dtH).padStart(2, '0');
              dtStartTime = new Date(`${dateStr}T${dtHStr}:15:00.000Z`);
            } else {
              const dtH = (shiftConfig.startHour + downtimeHourIndex) % 24;
              const dtHStr = String(dtH).padStart(2, '0');
              const dtDate = dtH < 22 ? new Date(closedAt) : new Date(openedAt);
              const y = dtDate.getFullYear();
              const m = String(dtDate.getMonth() + 1).padStart(2, '0');
              const dayPart = String(dtDate.getDate()).padStart(2, '0');
              dtStartTime = new Date(`${y}-${m}-${dayPart}T${dtHStr}:15:00.000Z`);
            }

            const dtEndTime = new Date(dtStartTime.getTime() + duration * 60000);

            downtimesToInsert.push({
              id: randomUUID(),
              clientUuid: randomUUID(),
              allocationId: allocId,
              reason: dtReason.reason,
              justification: dtReason.justification,
              status: DowntimeStatus.RESOLVED,
              startTime: dtStartTime,
              endTime: dtEndTime,
              durationMinutes: duration,
              createdAt: dtStartTime,
              updatedAt: dtEndTime,
            });
          }
        }

        // Lançamentos horários de produção (8 lançamentos por turno de 8h)
        for (let h = 1; h <= 8; h++) {
          let entryTime: Date;

          if (!shiftConfig.crossesMidnight) {
            const curH = shiftConfig.startHour + h;
            const curHStr = String(curH).padStart(2, '0');
            entryTime = new Date(`${dateStr}T${curHStr}:00:00.000Z`);
          } else {
            const curH = (shiftConfig.startHour + h) % 24;
            const curHStr = String(curH).padStart(2, '0');
            const entryDate = curH <= 6 ? new Date(closedAt) : new Date(openedAt);
            const y = entryDate.getFullYear();
            const m = String(entryDate.getMonth() + 1).padStart(2, '0');
            const dayPart = String(entryDate.getDate()).padStart(2, '0');
            entryTime = new Date(`${y}-${m}-${dayPart}T${curHStr}:00:00.000Z`);
          }

          // Ajuste de quantidade: se houve parada nesta hora, reduz proporcionalmente
          const wasDowntimeHour = h === downtimeHourIndex;
          const factor = wasDowntimeHour ? 0.45 : 1.0;
          const noise = 0.92 + pseudoRandom() * 0.16;
          const qty = Math.max(80, Math.round(machine.baseSpeed * factor * noise));

          productionsToInsert.push({
            id: randomUUID(),
            clientUuid: randomUUID(),
            allocationId: allocId,
            quantity: qty,
            timestamp: entryTime,
            createdAt: entryTime,
          });
        }
      }
    }
  }

  // 7. Inserção em lote (Batch CreateMany)
  console.log(`[Seed] Inserindo ${allocationsToInsert.length} alocações...`);
  await prisma.shiftAllocation.createMany({
    data: allocationsToInsert,
  });

  console.log(`[Seed] Inserindo ${productionsToInsert.length} apontamentos de produção...`);
  // Inserir produções em chunks de 1000 para segurança de payload
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < productionsToInsert.length; i += CHUNK_SIZE) {
    const chunk = productionsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.productionEntry.createMany({ data: chunk });
  }

  console.log(`[Seed] Inserindo ${downtimesToInsert.length} registros de parada (Pareto)...`);
  for (let i = 0; i < downtimesToInsert.length; i += CHUNK_SIZE) {
    const chunk = downtimesToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.downtimeRecord.createMany({ data: chunk });
  }

  console.log('\n=========================================================');
  console.log(' [Seed] Base de dados populada com sucesso!');
  console.log('=========================================================');
  console.log(` - Período: Últimos 31 dias até hoje (${today.toISOString().split('T')[0]})`);
  console.log(` - Turnos Ativos (3): Turno 1 (Manhã), Turno 2 (Tarde), Turno 3 (Noite)`);
  console.log(` - Total de Alocações: ${allocationsToInsert.length}`);
  console.log(` - Total de Apontamentos de Produção: ${productionsToInsert.length}`);
  console.log(` - Total de Paradas (Pareto): ${downtimesToInsert.length}`);
  console.log('---------------------------------------------------------');
  console.log(' Credenciais para Testes:');
  console.log('   Gerente:  admin / admin123 (Acesso aos relatórios e dashboard)');
  console.log('   Operador: operador1 / operador123 (SOPRO-01 alocada no Turno 2)');
  console.log('   Operador: operador2 / operador123 (Livre para nova alocação)');
  console.log('   Operador: operador3, operador4, operador5 / operador123');
  console.log('=========================================================\n');
}

main()
  .catch((e) => {
    console.error('[Seed] Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
