'use client';

import { useState, useEffect, useCallback } from 'react';
import { employeesService } from '../services/employees.service';
import type {
  SocialSecurityEntity,
  ContractType,
  WorkerType,
  WorkerSubtype,
  ArlRisk,
  CostCenter,
} from '../types';

interface UseSocialSecurityEntitiesReturn {
  eps: SocialSecurityEntity[];
  pensionFunds: SocialSecurityEntity[];
  arls: SocialSecurityEntity[];
  compensationFunds: SocialSecurityEntity[];
  severanceFunds: SocialSecurityEntity[];
  contractTypes: ContractType[];
  workerTypes: WorkerType[];
  workerSubtypes: WorkerSubtype[];
  arlRisks: ArlRisk[];
  costCenters: CostCenter[];
  loading: boolean;
  error: string | null;
  loadWorkerSubtypes: (workerTypeId: string) => Promise<void>;
  refetch: () => void;
}

export function useSocialSecurityEntities(): UseSocialSecurityEntitiesReturn {
  const [eps, setEps] = useState<SocialSecurityEntity[]>([]);
  const [pensionFunds, setPensionFunds] = useState<SocialSecurityEntity[]>([]);
  const [arls, setArls] = useState<SocialSecurityEntity[]>([]);
  const [compensationFunds, setCompensationFunds] = useState<SocialSecurityEntity[]>([]);
  const [severanceFunds, setSeveranceFunds] = useState<SocialSecurityEntity[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);
  const [workerSubtypes, setWorkerSubtypes] = useState<WorkerSubtype[]>([]);
  const [arlRisks, setArlRisks] = useState<ArlRisk[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Cargar todas las entidades en paralelo
      const [
        epsData,
        pensionFundsData,
        arlsData,
        compensationFundsData,
        severanceFundsData,
        contractTypesData,
        workerTypesData,
        arlRisksData,
        costCentersData,
      ] = await Promise.all([
        employeesService.getEps().catch(() => []),
        employeesService.getPensionFunds().catch(() => []),
        employeesService.getArl().catch(() => []),
        employeesService.getCompensationFunds().catch(() => []),
        employeesService.getSeveranceFunds().catch(() => []),
        employeesService.getContractTypes().catch(() => []),
        employeesService.getWorkerTypes().catch(() => []),
        employeesService.getArlRisks().catch(() => []),
        employeesService.getCostCenters().catch(() => []),
      ]);

      setEps(epsData);
      setPensionFunds(pensionFundsData);
      setArls(arlsData);
      setCompensationFunds(compensationFundsData);
      setSeveranceFunds(severanceFundsData);
      setContractTypes(contractTypesData);
      setWorkerTypes(workerTypesData);
      setArlRisks(arlRisksData);
      setCostCenters(costCentersData);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al cargar datos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadWorkerSubtypes = useCallback(async (workerTypeId: string) => {
    try {
      const subtypes = await employeesService.getWorkerSubtypes(workerTypeId);
      setWorkerSubtypes(subtypes);
    } catch (err) {
      setWorkerSubtypes([]);
    }
  }, []);

  return {
    eps,
    pensionFunds,
    arls,
    compensationFunds,
    severanceFunds,
    contractTypes,
    workerTypes,
    workerSubtypes,
    arlRisks,
    costCenters,
    loading,
    error,
    loadWorkerSubtypes,
    refetch: fetchData,
  };
}
