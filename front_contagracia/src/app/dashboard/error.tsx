'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-semibold text-foreground">Algo salio mal</h2>
        <p className="text-muted-foreground text-sm">
          {error.message || 'Ocurrio un error inesperado.'}
        </p>
        <Button onClick={reset} variant="outline">
          Reintentar
        </Button>
      </div>
    </div>
  );
}
