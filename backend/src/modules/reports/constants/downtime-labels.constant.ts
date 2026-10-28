import { DowntimeReason } from '@prisma/client';

export const DOWNTIME_REASON_LABELS: Record<DowntimeReason, string> = {
  [DowntimeReason.PRE_FORMA]: 'Pré-forma',
  [DowntimeReason.COMPRESSOR]: 'Compressor',
  [DowntimeReason.AQUECIMENTO_FORNO]: 'Aquecimento/Forno',
  [DowntimeReason.MOLDE]: 'Molde',
  [DowntimeReason.MECANICA]: 'Mecânica',
  [DowntimeReason.ELETRICA]: 'Elétrica',
  [DowntimeReason.REFEICAO_INTERVALO]: 'Refeição / Intervalo',
  [DowntimeReason.OUTROS]: 'Outros',
};
