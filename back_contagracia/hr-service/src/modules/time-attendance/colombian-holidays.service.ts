import { Injectable, Logger } from '@nestjs/common';

interface Holiday {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
  type: string;
}

interface CacheEntry {
  data: Holiday[];
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class ColombianHolidaysService {
  private readonly logger = new Logger(ColombianHolidaysService.name);
  private cache = new Map<number, CacheEntry>();

  /**
   * Obtiene los festivos colombianos para un año dado.
   * Usa cache en memoria de 1 hora.
   */
  async fetchHolidays(year: number): Promise<Holiday[]> {
    const cached = this.cache.get(year);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/CO`,
      );

      if (!response.ok) {
        this.logger.warn(`API de festivos respondio con status ${response.status}`);
        return cached?.data || [];
      }

      const holidays: Holiday[] = await response.json();
      this.cache.set(year, { data: holidays, timestamp: Date.now() });
      return holidays;
    } catch (error) {
      this.logger.error(`Error al obtener festivos: ${error}`);
      return cached?.data || [];
    }
  }

  /**
   * Verifica si una fecha es festivo colombiano.
   */
  async isHoliday(date: Date | string): Promise<boolean> {
    const d = new Date(date);
    const year = d.getFullYear();
    const dateStr = this.formatDate(d);
    const holidays = await this.fetchHolidays(year);
    return holidays.some((h) => h.date === dateStr);
  }

  /**
   * Verifica si una fecha es domingo o festivo.
   */
  async isSundayOrHoliday(date: Date | string): Promise<boolean> {
    const d = new Date(date);
    const isSunday = d.getDay() === 0;
    if (isSunday) return true;
    return this.isHoliday(date);
  }

  /**
   * Obtiene información del festivo si la fecha es festiva.
   */
  async getHolidayInfo(date: Date | string): Promise<Holiday | null> {
    const d = new Date(date);
    const year = d.getFullYear();
    const dateStr = this.formatDate(d);
    const holidays = await this.fetchHolidays(year);
    return holidays.find((h) => h.date === dateStr) || null;
  }

  /**
   * Obtiene todos los festivos en un rango de fechas.
   */
  async getHolidaysInRange(startDate: Date | string, endDate: Date | string): Promise<Holiday[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const years = new Set<number>();

    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      years.add(y);
    }

    const allHolidays: Holiday[] = [];
    for (const year of years) {
      const holidays = await this.fetchHolidays(year);
      allHolidays.push(...holidays);
    }

    const startStr = this.formatDate(start);
    const endStr = this.formatDate(end);

    return allHolidays.filter((h) => h.date >= startStr && h.date <= endStr);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
