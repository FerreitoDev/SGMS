import * as z from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o nome de usuário ou login.'),
  password: z.string().min(1, 'Informe a senha de acesso.'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
