import { z } from 'zod';

export const productionSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, 'Informe a quantidade de garrafas.')
    .regex(/^[1-9]\d*$/, 'A quantidade deve ser um número inteiro maior que zero.')
    .transform((val) => Number(val)),
});

export type ProductionFormData = {
  quantity: string;
};
