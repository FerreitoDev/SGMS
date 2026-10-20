import { z } from 'zod';

export const shiftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome do turno deve ter no mínimo 2 caracteres (ex: 1º Turno Matutino).')
    .max(60, 'O nome do turno deve ter no máximo 60 caracteres.'),
  startTime: z
    .string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário de início deve estar no formato HH:mm (ex: 06:00).'),
  endTime: z
    .string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário de término deve estar no formato HH:mm (ex: 14:00).'),
});

export type ShiftFormData = z.infer<typeof shiftSchema>;

export function calculateShiftDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '-';
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) return '-';

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60; // cruza a meia-noite
  }

  const diffMinutes = endTotal - startTotal;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}min`;
}
