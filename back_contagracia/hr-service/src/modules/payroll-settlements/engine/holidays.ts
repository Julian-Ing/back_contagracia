/**
 * Festivos colombianos y dias habiles
 * Implementa festivos fijos, Ley Emiliani (movibles a lunes) y dependientes de Pascua
 */

/** Calcula la fecha de Pascua usando el algoritmo de Gauss */
export function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/** Mueve una fecha al lunes siguiente si no es lunes (Ley Emiliani) */
function moveToNextMonday(d: Date): Date {
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
  if (dayOfWeek === 1) return d; // ya es lunes
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const result = new Date(d);
  result.setDate(result.getDate() + daysUntilMonday);
  return result;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Obtiene los festivos colombianos para un ano dado.
 * Incluye festivos fijos, movibles (Ley Emiliani) y dependientes de Pascua.
 * @returns Array de strings YYYY-MM-DD ordenados
 */
export function getColombianHolidays(year: number): string[] {
  const holidays: string[] = [];

  // Festivos fijos
  const fixedHolidays: [number, number][] = [
    [1, 1],   // Ano Nuevo
    [5, 1],   // Dia del Trabajo
    [7, 20],  // Dia de la Independencia
    [8, 7],   // Batalla de Boyaca
    [12, 8],  // Inmaculada Concepcion
    [12, 25], // Navidad
  ];

  for (const [month, day] of fixedHolidays) {
    holidays.push(formatDate(new Date(year, month - 1, day)));
  }

  // Festivos movibles - Ley Emiliani (se mueven al lunes siguiente)
  const emilianiHolidays: [number, number][] = [
    [1, 6],   // Reyes Magos
    [3, 19],  // San Jose
    [6, 29],  // San Pedro y San Pablo
    [8, 15],  // Asuncion de la Virgen
    [10, 12], // Dia de la Raza
    [11, 1],  // Todos los Santos
    [11, 11], // Independencia de Cartagena
  ];

  for (const [month, day] of emilianiHolidays) {
    const original = new Date(year, month - 1, day);
    holidays.push(formatDate(moveToNextMonday(original)));
  }

  // Festivos dependientes de Pascua
  const easter = calculateEaster(year);

  // Jueves Santo (3 dias antes de Pascua)
  holidays.push(formatDate(addDays(easter, -3)));

  // Viernes Santo (2 dias antes de Pascua)
  holidays.push(formatDate(addDays(easter, -2)));

  // Ascension del Senor (39 dias despues de Pascua, movido a lunes)
  holidays.push(formatDate(moveToNextMonday(addDays(easter, 39))));

  // Corpus Christi (60 dias despues de Pascua, movido a lunes)
  holidays.push(formatDate(moveToNextMonday(addDays(easter, 60))));

  // Sagrado Corazon (68 dias despues de Pascua, movido a lunes)
  holidays.push(formatDate(moveToNextMonday(addDays(easter, 68))));

  return holidays.sort();
}

/**
 * Calcula dias habiles entre dos fechas, excluyendo domingos y festivos colombianos.
 */
export function calculateBusinessDays(
  startDate: string,
  endDate: string,
  holidays?: string[],
): { businessDays: number; calendarDays: number; holidaysFound: string[] } {
  if (!startDate || !endDate) {
    return { businessDays: 0, calendarDays: 0, holidaysFound: [] };
  }

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  if (end < start) {
    return { businessDays: 0, calendarDays: 0, holidaysFound: [] };
  }

  const holidaysSet = new Set(holidays ?? []);
  const holidaysFound: string[] = [];
  let businessDays = 0;
  let calendarDays = 0;
  const current = new Date(start);

  while (current <= end) {
    calendarDays++;
    const dateStr = formatDate(current);
    const isSunday = current.getDay() === 0;
    const isHoliday = holidaysSet.has(dateStr);

    if (isHoliday) {
      holidaysFound.push(dateStr);
    }

    if (!isSunday && !isHoliday) {
      businessDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return { businessDays, calendarDays, holidaysFound };
}
