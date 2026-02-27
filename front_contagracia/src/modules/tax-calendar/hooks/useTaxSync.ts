'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { syncService } from '../services/taxCalendar.service';
import type {
  CalendarStatusResponse,
  SyncLogEntry,
  SyncResult,
  ParsePdfResult,
} from '../types';

export function useTaxSync() {
  // Estado
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos
  const [status, setStatus] = useState<CalendarStatusResponse | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [parseResult, setParseResult] = useState<ParsePdfResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  /**
   * Verifica el estado de un año
   */
  const checkStatus = useCallback(async (year: number) => {
    try {
      setLoading(true);
      setError(null);

      const data = await syncService.getStatus(year);
      setStatus(data);

      return data;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al verificar estado';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene el historial de sincronizaciones
   */
  const fetchSyncLogs = useCallback(async (limit?: number) => {
    try {
      setLoading(true);
      setError(null);

      const logs = await syncService.getSyncLogs(limit);
      setSyncLogs(logs);

      return logs;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar historial';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sincroniza desde DIAN automáticamente
   */
  const syncFromDian = useCallback(async (year: number) => {
    try {
      setSyncing(true);
      setError(null);

      const result = await syncService.syncFromDian(year);

      // El backend retorna PdfParseResult, convertir a SyncResult para el estado
      const syncResult: SyncResult = {
        success: result.totalDates > 0 && result.parseErrors.length === 0,
        year: result.year,
        source: 'dian',
        datesImported: result.totalDates,
        message: result.parseErrors.length > 0
          ? result.parseErrors.join(', ')
          : `${result.totalDates} fechas importadas`,
      };

      setSyncResult(syncResult);

      if (syncResult.success) {
        toast.success(`Calendario ${year} sincronizado: ${syncResult.datesImported} fechas importadas`);
      } else {
        toast.error(syncResult.message || 'Error en sincronización');
      }

      return syncResult;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al sincronizar desde DIAN';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * Sincroniza desde una URL
   */
  const syncFromUrl = useCallback(async (url: string, year: number) => {
    try {
      setSyncing(true);
      setError(null);

      const result = await syncService.syncFromUrl({ url, year });

      // El backend retorna PdfParseResult, convertir a SyncResult
      const syncResult: SyncResult = {
        success: result.totalDates > 0 && result.parseErrors.length === 0,
        year: result.year,
        source: 'url',
        datesImported: result.totalDates,
        message: result.parseErrors.length > 0
          ? result.parseErrors.join(', ')
          : `${result.totalDates} fechas importadas`,
      };

      setSyncResult(syncResult);

      if (syncResult.success) {
        toast.success(`Calendario ${year} sincronizado desde URL: ${syncResult.datesImported} fechas`);
      } else {
        toast.error(syncResult.message || 'Error en sincronización');
      }

      return syncResult;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al sincronizar desde URL';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * Sincroniza desde un archivo PDF
   */
  const syncFromPdf = useCallback(async (file: File, year: number) => {
    try {
      setSyncing(true);
      setError(null);

      const result = await syncService.syncFromPdf(file, year);

      // El backend retorna PdfParseResult, convertir a SyncResult
      const syncResult: SyncResult = {
        success: result.totalDates > 0 && result.parseErrors.length === 0,
        year: result.year,
        source: 'pdf',
        datesImported: result.totalDates,
        message: result.parseErrors.length > 0
          ? result.parseErrors.join(', ')
          : `${result.totalDates} fechas importadas`,
      };

      setSyncResult(syncResult);

      if (syncResult.success) {
        toast.success(`Calendario ${year} sincronizado: ${syncResult.datesImported} fechas importadas`);
      } else {
        toast.error(syncResult.message || 'Error en sincronización');
      }

      return syncResult;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al sincronizar desde PDF';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * Parsea un PDF sin guardar (preview)
   */
  const parsePdf = useCallback(async (file: File, year: number) => {
    try {
      setParsing(true);
      setError(null);

      const result = await syncService.parsePdf(file, year);
      setParseResult(result);

      toast.success(`PDF parseado: ${result.totalDates} fechas encontradas`);

      return result;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al parsear PDF';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setParsing(false);
    }
  }, []);

  /**
   * Limpia los resultados
   */
  const clearResults = useCallback(() => {
    setParseResult(null);
    setSyncResult(null);
    setError(null);
  }, []);

  return {
    // Estado
    loading,
    syncing,
    parsing,
    error,

    // Datos
    status,
    syncLogs,
    parseResult,
    syncResult,

    // Acciones
    checkStatus,
    fetchSyncLogs,
    syncFromDian,
    syncFromUrl,
    syncFromPdf,
    parsePdf,
    clearResults,
  };
}

export default useTaxSync;
