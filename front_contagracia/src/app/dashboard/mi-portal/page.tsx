'use client';

import { UserCircle, FileText, CalendarDays, UserCheck } from 'lucide-react';
import { ProtectedRoute } from '@/shared/components/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { PortalProfileTab } from '@/modules/hr/components/portal/PortalProfileTab';
import { PortalContractTab } from '@/modules/hr/components/portal/PortalContractTab';
import { PortalLeavesTab } from '@/modules/hr/components/portal/PortalLeavesTab';
import { PortalPayslipsTab } from '@/modules/hr/components/portal/PortalPayslipsTab';

export default function MiPortalPage() {
  const { can } = usePermissions();

  const canProfile  = can('portal.profile.view');
  const canContract = can('portal.contract.view');
  const canLeaves   = can('portal.leaves.view');
  const canPayslips = can('payslips.view');

  // Determinar el tab inicial según los permisos disponibles
  const defaultTab = canPayslips
    ? 'payslips'
    : canProfile
    ? 'profile'
    : canContract
    ? 'contract'
    : 'leaves';

  return (
    <ProtectedRoute
      anyPermission={['payslips.view', 'portal.profile.view', 'portal.contract.view', 'portal.leaves.view']}
      deniedMessage="No tienes acceso al portal del empleado."
    >
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Mi Portal</h1>
            <p className="text-sm text-muted-foreground">Tu información laboral personal</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {canPayslips && (
              <TabsTrigger value="payslips" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Mis Desprendibles
              </TabsTrigger>
            )}
            {canProfile && (
              <TabsTrigger value="profile" className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                Mi Perfil
              </TabsTrigger>
            )}
            {canContract && (
              <TabsTrigger value="contract" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Mi Contrato
              </TabsTrigger>
            )}
            {canLeaves && (
              <TabsTrigger value="leaves" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Mis Ausencias
              </TabsTrigger>
            )}
          </TabsList>

          {canPayslips && (
            <TabsContent value="payslips" className="mt-4">
              <PortalPayslipsTab />
            </TabsContent>
          )}
          {canProfile && (
            <TabsContent value="profile" className="mt-4">
              <PortalProfileTab />
            </TabsContent>
          )}
          {canContract && (
            <TabsContent value="contract" className="mt-4">
              <PortalContractTab />
            </TabsContent>
          )}
          {canLeaves && (
            <TabsContent value="leaves" className="mt-4">
              <PortalLeavesTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
