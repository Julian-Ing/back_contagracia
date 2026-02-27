'use client';

import { useState } from 'react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { FileText, ScrollText, Settings } from 'lucide-react';
import DianConfigTab from './DianConfigTab';
import ResolutionsTab from './ResolutionsTab';

type SubTab = 'config' | 'resolutions';

export default function ElectronicTab() {
  const { can } = usePermissions();

  const showConfig = can('electronic_documents.view');
  const showResolutions = can('electronic_documents.resolutions.view');

  const [activeSubTab, setActiveSubTab] = useState<SubTab>(
    showConfig ? 'config' : 'resolutions'
  );

  if (activeSubTab === 'config' && !showConfig && showResolutions) {
    setActiveSubTab('resolutions');
  } else if (activeSubTab === 'resolutions' && !showResolutions && showConfig) {
    setActiveSubTab('config');
  }

  const subTabs = [
    { key: 'config' as SubTab, label: 'Configuración DIAN', icon: Settings, visible: showConfig },
    { key: 'resolutions' as SubTab, label: 'Resoluciones', icon: ScrollText, visible: showResolutions },
  ];

  const visibleTabs = subTabs.filter((t) => t.visible);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-500 rounded-lg">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Facturación y Nómina Electrónica</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">DIAN, producción y resoluciones</p>
        </div>
      </div>

      {/* Sub-tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'text-red-600 dark:text-red-400 border-red-500'
                    : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido */}
      {activeSubTab === 'config' && showConfig && <DianConfigTab />}
      {activeSubTab === 'resolutions' && showResolutions && <ResolutionsTab />}

      {/* Sin permisos */}
      {!showConfig && !showResolutions && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Sin acceso</p>
          <p className="text-sm mt-2">No tienes permisos para ver esta sección</p>
        </div>
      )}
    </div>
  );
}
