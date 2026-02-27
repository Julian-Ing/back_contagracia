'use client';

import { useEffect, useState } from 'react';
import { portalService } from '../../services/portal.service';
import { EmployeePayrollDetailEnhanced } from '../payroll/EmployeePayrollDetailEnhanced';

interface PortalPayslipDetailProps {
  detailId: string;
  open: boolean;
  onClose: () => void;
}

export function PortalPayslipDetail({ detailId, open, onClose }: PortalPayslipDetailProps) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !detailId) return;
    setLoading(true);
    setError(null);
    portalService.getPayslipDetail(detailId)
      .then(setDetail)
      .catch((err: any) => setError(err.response?.data?.message ?? 'Error al cargar el desprendible'))
      .finally(() => setLoading(false));
  }, [detailId, open]);

  if (!open) return null;

  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-background rounded-lg p-8 text-muted-foreground text-sm shadow-lg">
          {error ?? 'Cargando desprendible...'}
        </div>
      </div>
    );
  }

  return (
    <EmployeePayrollDetailEnhanced
      detail={detail}
      open={open}
      onClose={onClose}
    />
  );
}
