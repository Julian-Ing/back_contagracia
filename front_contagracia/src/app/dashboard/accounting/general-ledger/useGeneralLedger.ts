'use client';

import { useState, useCallback } from 'react';
import { accountingClient } from '@/shared/services/api/apiClient';

export interface GeneralLedgerMovement {
  date: string;
  consecutive: string;
  description: string | null;
  third_party_name: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerAccount {
  code: string;
  name: string;
  type: string;
  nature: 'DEBIT' | 'CREDIT';
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
  movements: GeneralLedgerMovement[];
}

export interface GeneralLedgerData {
  from_date: string;
  to_date: string;
  accounts: GeneralLedgerAccount[];
  grand_total_debits: number;
  grand_total_credits: number;
}

export function useGeneralLedger() {
  const [data, setData] = useState<GeneralLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (dateFrom: string, dateTo: string) => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await accountingClient.get<GeneralLedgerData>('/general-ledger', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      setData(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al cargar el Libro Mayor';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetch };
}
