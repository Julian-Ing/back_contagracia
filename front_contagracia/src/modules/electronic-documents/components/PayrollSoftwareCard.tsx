'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/shared/hooks';
import { electronicDocsClient } from '@/shared/services/api/apiClient';
import { PayrollTestSetModal } from './PayrollTestSetModal';

interface SoftwareConfig {
  software_id: string;
  software_pin: string;
  test_set_id: string;
  environment: 1 | 2;
}

export const PayrollSoftwareCard = () => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [envLoading, setEnvLoading] = useState(false);
  const [testSetLoading, setTestSetLoading] = useState(false);
  const [testSetModalOpen, setTestSetModalOpen] = useState(false);
  const [config, setConfig] = useState<SoftwareConfig>({
    software_id: '',
    software_pin: '',
    test_set_id: '',
    environment: 2,
  });

  const canManageSoftware = can('electronic_documents.payroll_software.manage');
  const canManageEnvironment = can('electronic_documents.payroll_environment.manage');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await electronicDocsClient.get('/software/payroll');
      setConfig(response.data);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const handleSaveSoftware = async () => {
    if (!config.software_id || !config.software_pin) {
      toast.error('Completa los campos requeridos');
      return;
    }

    if (config.software_pin.length !== 5) {
      toast.error('El PIN debe tener 5 dígitos');
      return;
    }

    setLoading(true);
    try {
      await electronicDocsClient.patch('/software/payroll', {
        payroll_id: config.software_id,
        payroll_pin: Number(config.software_pin),
      });

      toast.success('Software de nómina guardado');
      loadConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleEnvironmentChange = async (env: 1 | 2) => {
    setEnvLoading(true);
    try {
      const endpoint = env === 1
        ? '/environment/payroll/production'
        : '/environment/payroll/habilitation';

      await electronicDocsClient.patch(endpoint);

      setConfig((prev) => ({ ...prev, environment: env }));
      toast.success(`Nómina en ${env === 1 ? 'PRODUCCIÓN' : 'HABILITACIÓN'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar');
    } finally {
      setEnvLoading(false);
    }
  };

  const handleSaveTestSet = async () => {
    if (!config.test_set_id) {
      toast.error('Ingresa el Test Set ID');
      return;
    }

    setTestSetLoading(true);
    try {
      await electronicDocsClient.patch('/software/payroll/test-set', {
        test_set_id: config.test_set_id,
      });

      toast.success('Test Set ID guardado');
      loadConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setTestSetLoading(false);
    }
  };

  if (!canManageSoftware && !canManageEnvironment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nómina Electrónica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            No tienes permisos para esta sección
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Nómina Electrónica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canManageSoftware && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Software ID</Label>
                <Input
                  placeholder="UUID"
                  value={config.software_id}
                  onChange={(e) => setConfig({ ...config, software_id: e.target.value })}
                  disabled={loading}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">PIN</Label>
                <Input
                  placeholder="12345"
                  maxLength={5}
                  value={config.software_pin}
                  onChange={(e) => setConfig({ ...config, software_pin: e.target.value.replace(/\D/g, '') })}
                  disabled={loading}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button onClick={handleSaveSoftware} disabled={loading} size="sm" className="w-full h-8">
              {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Guardar Software
            </Button>
          </div>
        )}

        {canManageEnvironment && (
          <div className="space-y-2 pt-2 border-t">
            <div>
              <Label className="text-xs text-muted-foreground">Test Set ID</Label>
              <Input
                placeholder="UUID"
                value={config.test_set_id}
                onChange={(e) => setConfig({ ...config, test_set_id: e.target.value })}
                disabled={testSetLoading}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveTestSet}
                disabled={!config.test_set_id || testSetLoading}
                size="sm"
                variant="outline"
                className="flex-1 h-8"
              >
                {testSetLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Guardar
              </Button>
              <Button
                onClick={() => {
                  if (!config.test_set_id) {
                    toast.error('Ingresa el Test Set ID');
                    return;
                  }
                  setTestSetModalOpen(true);
                }}
                disabled={!config.test_set_id}
                size="sm"
                className="flex-1 h-8"
              >
                Habilitar
              </Button>
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ambiente</span>
                <span className="font-medium">{config.environment === 1 ? 'PRODUCCIÓN' : 'HABILITACIÓN'}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={config.environment === 1 ? 'default' : 'outline'}
                  onClick={() => handleEnvironmentChange(1)}
                  disabled={envLoading || config.environment === 1}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                >
                  Producción
                </Button>
                <Button
                  variant={config.environment === 2 ? 'default' : 'outline'}
                  onClick={() => handleEnvironmentChange(2)}
                  disabled={envLoading || config.environment === 2}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                >
                  Habilitación
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <PayrollTestSetModal
        open={testSetModalOpen}
        onOpenChange={(open) => {
          setTestSetModalOpen(open);
          if (!open) loadConfig();
        }}
        testSetId={config.test_set_id}
      />
    </Card>
  );
};
