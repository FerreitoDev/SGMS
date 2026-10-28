import { z } from 'zod';

export const productionSchema = z.object({
  quantity: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) {
        return NaN;
      }
      return Number(val);
    },
    z
      .number({ invalid_type_error: 'Informe uma quantidade válida.' })
      .refine((n) => !Number.isNaN(n), { message: 'Informe a quantidade de garrafas.' })
      .pipe(
        z
          .number()
          .int('A quantidade deve ser um número inteiro.')
          .positive('A quantidade deve ser maior que zero.'),
      ),
  ),
});

export type ProductionFormData = z.infer<typeof productionSchema>;
