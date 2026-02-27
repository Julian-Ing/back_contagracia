'use client';

import { GitBranch } from 'lucide-react';

export default function ReceivedInvoicesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
        <GitBranch className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Evento Radian</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">
        Gestiona los eventos Radian de la DIAN: recepción, aceptación y rechazo de facturas electrónicas.
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500">Próximamente</p>
    </div>
  );
}
