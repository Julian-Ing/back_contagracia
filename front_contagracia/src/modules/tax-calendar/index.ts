/**
 * Tax Calendar Module
 * Módulo para el calendario tributario DIAN
 */

// Types
export * from './types';

// Services
export {
  taxCalendarService,
  obligationTypesService,
  syncService,
  calendarService,
  reminderService,
} from './services/taxCalendar.service';

// Hooks
export {
  useTaxCalendar,
  useUpcomingObligations,
  useTaxSync,
  useReminders,
} from './hooks';
