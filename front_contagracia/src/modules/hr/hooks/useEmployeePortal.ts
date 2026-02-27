'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  portalService,
  type PortalProfile,
  type PortalContract,
  type PortalLeave,
  type PortalPayslipSummary,
} from '../services/portal.service';

// ==================== PROFILE ====================

export function usePortalProfile() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalService.getProfile()
      .then(setProfile)
      .catch((err: any) => setError(err.response?.data?.message ?? 'Error al cargar el perfil'))
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading, error };
}

// ==================== CONTRACT ====================

export function usePortalContract() {
  const [contract, setContract] = useState<PortalContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalService.getContract()
      .then(setContract)
      .catch((err: any) => setError(err.response?.data?.message ?? 'Error al cargar el contrato'))
      .finally(() => setLoading(false));
  }, []);

  return { contract, loading, error };
}

// ==================== LEAVES ====================

export function usePortalLeaves(initialYear?: number) {
  const [data, setData] = useState<PortalLeave[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilterState] = useState<number | undefined>(initialYear);
  const [statusFilter, setStatusFilterState] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await portalService.getLeaves({ year: yearFilter, status: statusFilter, page });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al cargar ausencias');
    } finally {
      setLoading(false);
    }
  }, [page, yearFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setYearFilter = useCallback((y: number | undefined) => { setYearFilterState(y); setPage(1); }, []);
  const setStatusFilter = useCallback((s: string | undefined) => { setStatusFilterState(s); setPage(1); }, []);

  return { data, total, page, totalPages, loading, error, setPage, setYearFilter, setStatusFilter, refetch: fetchData };
}

// ==================== PAYSLIPS ====================

export function usePortalPayslips() {
  const [data, setData] = useState<PortalPayslipSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilterState] = useState<number | undefined>(undefined);
  const [monthFilter, setMonthFilterState] = useState<number | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await portalService.getPayslips({ year: yearFilter, month: monthFilter, page });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al cargar desprendibles');
    } finally {
      setLoading(false);
    }
  }, [page, yearFilter, monthFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setYearFilter = useCallback((y: number | undefined) => { setYearFilterState(y); setPage(1); }, []);
  const setMonthFilter = useCallback((m: number | undefined) => { setMonthFilterState(m); setPage(1); }, []);

  return { data, total, page, totalPages, loading, error, setPage, setYearFilter, setMonthFilter, refetch: fetchData };
}
