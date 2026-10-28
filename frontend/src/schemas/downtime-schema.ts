import { z } from 'zod';

export const DOWNTIME_REASONS = [
  'PRE_FORMA',
  'COMPRESSOR',
  'AQUECIMENTO_FORNO',
  'MOLDE',
  'MECANICA',
  'ELETRICA',
  'REFEICAO_INTERVALO',
  'OUTROS',
] as const;

export const DOWNTIME_LABELS: Record<(typeof DOWNTIME_REASONS)[number], string> = {
  PRE_FORMA: 'Falta de Pré-forma',
  COMPRESSOR: 'Compressor / Pressão de Ar',
  AQUECIMENTO_FORNO: 'Aquecimento do Forno',
  MOLDE: 'Defeito de Molde',
  MECANICA: 'Manutenção Mecânica',
  ELETRICA: 'Falha Elétrica',
  REFEICAO_INTERVALO: 'Refeição / Intervalo',
  OUTROS: 'Outros Motivos',
};

export const downtimeSchema = z
  .object({
    reason: z.enum(DOWNTIME_REASONS, {
      errorMap: () => ({ message: 'Selecione um motivo para a parada.' }),
    }),
    justification: z.string().optional(),
    startTime: z.string().min(1, 'Horário de início é obrigatório.'),
    endTime: z.string().optional(),
    isRetroactive: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.reason === 'OUTROS') {
        return !!data.justification && data.justification.trim().length >= 5;
      }
      return true;
    },
    {
      message: 'A justificativa detalhada é obrigatória (mínimo de 5 caracteres) para o motivo OUTROS.',
      path: ['justification'],
    },
  )
  .refine(
    (data) => {
      if (data.isRetroactive) {
        if (!data.endTime) return false;
        return new Date(data.endTime).getTime() >= new Date(data.startTime).getTime();
      }
      return true;
    },
    {
      message: 'O horário de término deve ser posterior ou igual ao horário de início.',
      path: ['endTime'],
    },
  );

export type DowntimeFormData = z.infer<typeof downtimeSchema>;
