'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { shiftsService } from '../services/shifts.service';
import type {
  ShiftTemplate,
  ShiftSchedule,
  ShiftAssignment,
  ShiftSwapRequest,
  CreateShiftTemplateDto,
  CreateScheduleDto,
  CreateAssignmentDto,
  QueryAssignmentsParams,
  ShiftAssignmentStatus,
} from '../types';

export function useShiftTemplates(enabled = true) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await shiftsService.getTemplates();
      setTemplates(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch(); }, [fetch, enabled]);

  const create = useCallback(async (data: CreateShiftTemplateDto) => {
    const res = await shiftsService.createTemplate(data);
    toast.success(res.message);
    fetch();
    return res;
  }, [fetch]);

  const update = useCallback(async (id: string, data: Partial<CreateShiftTemplateDto>) => {
    const res = await shiftsService.updateTemplate(id, data);
    toast.success(res.message);
    fetch();
    return res;
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    const res = await shiftsService.deleteTemplate(id);
    toast.success(res.message);
    fetch();
  }, [fetch]);

  return { templates, loading, error, create, update, remove, refetch: fetch };
}

export function useShiftSchedules(enabled = true) {
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await shiftsService.getSchedules();
      setSchedules(response.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar programaciones');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch(); }, [fetch, enabled]);

  const create = useCallback(async (data: CreateScheduleDto) => {
    const res = await shiftsService.createSchedule(data);
    toast.success(res.message);
    fetch();
    return res;
  }, [fetch]);

  const update = useCallback(async (id: string, data: Partial<CreateScheduleDto>) => {
    await shiftsService.updateSchedule(id, data);
    toast.success('Programación actualizada');
    fetch();
  }, [fetch]);

  const publish = useCallback(async (id: string) => {
    const res = await shiftsService.publishSchedule(id);
    toast.success(res.message);
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    const res = await shiftsService.deleteSchedule(id);
    toast.success(res.message);
    fetch();
  }, [fetch]);

  return { schedules, loading, create, update, publish, remove, refetch: fetch };
}

export function useShiftAssignments(initialParams: QueryAssignmentsParams = {}, enabled = true) {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [params, setParams] = useState<QueryAssignmentsParams>(initialParams);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await shiftsService.getAssignments(params);
      setAssignments(response.data);
      setTotal(response.total);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  }, [params, enabled]);

  useEffect(() => { if (enabled) fetch(); }, [fetch, enabled]);

  const create = useCallback(async (data: CreateAssignmentDto) => {
    const res = await shiftsService.createAssignment(data);
    toast.success(res.message);
    fetch();
    return res;
  }, [fetch]);

  const cancel = useCallback(async (id: string) => {
    const res = await shiftsService.deleteAssignment(id);
    toast.success(res.message);
    fetch();
  }, [fetch]);

  const updateFilters = useCallback((newParams: Partial<QueryAssignmentsParams>) => {
    setParams(prev => ({ ...prev, ...newParams, page: newParams.page ?? 1 }));
  }, []);

  return { assignments, total, loading, params, create, cancel, updateFilters, refetch: fetch };
}

export function useShiftSwaps(enabled = true) {
  const [swaps, setSwaps] = useState<ShiftSwapRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await shiftsService.getSwaps();
      setSwaps(response.data);
      setTotal(response.total);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar intercambios');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch(); }, [fetch, enabled]);

  const approve = useCallback(async (id: string) => {
    const res = await shiftsService.approveSwap(id);
    toast.success(res.message);
    fetch();
  }, [fetch]);

  const reject = useCallback(async (id: string, reason?: string) => {
    const res = await shiftsService.rejectSwap(id, reason);
    toast.success(res.message);
    fetch();
  }, [fetch]);

  return { swaps, total, loading, approve, reject, refetch: fetch };
}

export function useMyShifts(enabled = true) {
  const [myShifts, setMyShifts] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await shiftsService.getMyShifts();
      setMyShifts(response.data);
    } catch {
      // Silently fail - admin users without employee profiles will get 403
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch(); }, [fetch, enabled]);

  const confirm = useCallback(async (id: string) => {
    const res = await shiftsService.confirmMyShift(id);
    toast.success(res.message);
    fetch();
  }, [fetch]);

  return { myShifts, loading, confirm, refetch: fetch };
}
