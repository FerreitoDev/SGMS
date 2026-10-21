/**
 * Calcula a duração planejada de um turno em minutos a partir de horários no formato HH:mm.
 * Suporta turnos que viram a noite (ex: 22:00 às 06:00).
 */
export function calculateShiftDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes > startMinutes) {
    return endMinutes - startMinutes;
  }

  // Turno que vira a noite (ex: 22:00 -> 1320min, 06:00 -> 360min => 1440 - 1320 + 360 = 480min)
  return 24 * 60 - startMinutes + endMinutes;
}

/**
 * Converte strings de data (YYYY-MM-DD ou ISO 8601) em instâncias de Date cobrindo o dia completo.
 */
export function parseDateRange(
  startDateStr: string,
  endDateStr: string,
): { startDate: Date; endDate: Date } {
  const startIso = startDateStr.includes('T')
    ? startDateStr
    : `${startDateStr}T00:00:00.000Z`;

  const endIso = endDateStr.includes('T')
    ? endDateStr
    : `${endDateStr}T23:59:59.999Z`;

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  return { startDate, endDate };
}
