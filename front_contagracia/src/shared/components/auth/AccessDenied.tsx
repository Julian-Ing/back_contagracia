'use client';

import { ShieldX } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message = 'No tienes permisos para acceder a esta sección.' }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <ShieldX className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Acceso Denegado
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        {message}
      </p>
      <Button onClick={() => router.back()} variant="outline">
        Volver
      </Button>
    </div>
  );
}
