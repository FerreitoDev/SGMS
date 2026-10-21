import { z } from 'zod';

export const productionSchema = z.object({
  quantity: z
    .number({ invalid_type_error: 'Informe uma quantidade válida.' })
    .int('A quantidade deve ser um número inteiro.')
    .positive('A quantidade deve ser maior que zero.'),
  recordedAt: z.string().min(1, 'Horário do apontamento é obrigatório.'),
});

export type ProductionFormData = z.infer<typeof productionSchema>;
