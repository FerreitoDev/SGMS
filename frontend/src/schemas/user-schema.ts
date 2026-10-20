import * as z from 'zod';

export const createOperatorSchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres.'),
  username: z
    .string()
    .trim()
    .min(3, 'Login deve ter no mínimo 3 caracteres.')
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'Login deve conter apenas letras, números, ponto, hífen ou sublinhado.'
    ),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
});

export type CreateOperatorFormData = z.infer<typeof createOperatorSchema>;
