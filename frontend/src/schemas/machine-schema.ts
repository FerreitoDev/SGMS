import { z } from 'zod';

export const machineSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'O código identificador deve ter no mínimo 2 caracteres (ex: SOPRO-01).')
    .max(30, 'O código identificador deve ter no máximo 30 caracteres.'),
  name: z
    .string()
    .trim()
    .min(3, 'O nome da sopradora deve ter no mínimo 3 caracteres.')
    .max(100, 'O nome da sopradora deve ter no máximo 100 caracteres.'),
  model: z
    .string()
    .trim()
    .max(100, 'O modelo deve ter no máximo 100 caracteres.')
    .optional(),
});

export type MachineFormData = z.infer<typeof machineSchema>;
