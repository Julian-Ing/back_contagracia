'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Loader2, AlertCircle, ChevronLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { chartOfAccountsService } from '../services/chartOfAccounts.service';
import {
  detectAccountType,
  getParentCode,
  getAccountLevelName,
  isValidAccountCode,
  isValidCodeLength,
} from '../utils/accountCode.utils';
import type { AccountType } from '../types';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  COST: 'Costo',
  PRODUCTION_COST: 'Costo de Producción',
  DEBTOR_ACCOUNTS: 'Cuentas Deudoras',
  CREDITOR_ACCOUNTS: 'Cuentas Acreedoras',
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  ASSET: 'bg-blue-100 text-blue-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-purple-100 text-purple-800',
  INCOME: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-orange-100 text-orange-800',
  COST: 'bg-yellow-100 text-yellow-800',
  PRODUCTION_COST: 'bg-amber-100 text-amber-800',
  DEBTOR_ACCOUNTS: 'bg-cyan-100 text-cyan-800',
  CREDITOR_ACCOUNTS: 'bg-pink-100 text-pink-800',
};

interface AccountFormData {
  code: string;
  name: string;
}

interface StackItem {
  code: string;
  name: string;
}

interface Props {
  mode: 'create' | 'edit';
  initialData?: {
    code: string;
    name: string;
  };
  /** Prefijo obligatorio para el código (ej: "13" para CxC, "22" para CxP) */
  codePrefix?: string;
  /** Descripción del prefijo para mostrar al usuario */
  codePrefixLabel?: string;
  onSuccess: (account?: { code: string; name: string }) => void;
  onCancel: () => void;
}

export function AccountForm({ mode, initialData, codePrefix, codePrefixLabel, onSuccess, onCancel }: Props) {
  // Stack de cuentas a crear (para creación recursiva de padres)
  const [stack, setStack] = useState<StackItem[]>([]);

  // Datos del formulario actual
  const [code, setCode] = useState(initialData?.code || codePrefix || '');
  const [name, setName] = useState(initialData?.name || '');

  // Estados
  const [saving, setSaving] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeExists, setCodeExists] = useState<boolean | null>(null);
  const [existingAccount, setExistingAccount] = useState<{ code: string; name: string } | null>(null);
  const [checkingParent, setCheckingParent] = useState(false);
  const [parentExists, setParentExists] = useState<boolean | null>(null);
  const [parentAccount, setParentAccount] = useState<{ code: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Detectar tipo y padre
  const detectedType = detectAccountType(code);
  const detectedParentCode = getParentCode(code);
  const levelName = code ? getAccountLevelName(code) : '';

  // Validar código en tiempo real
  useEffect(() => {
    if (!code) {
      setCodeError(null);
      return;
    }

    if (!/^\d+$/.test(code)) {
      setCodeError('Solo se permiten dígitos');
      return;
    }

    if (code.charAt(0) === '0') {
      setCodeError('No puede empezar con 0');
      return;
    }

    if (!isValidCodeLength(code.length)) {
      setCodeError('Longitud debe ser 1, 2, 4, 6, 8... dígitos');
      return;
    }

    // Validar prefijo obligatorio
    if (codePrefix && !code.startsWith(codePrefix)) {
      setCodeError(`El código debe empezar con ${codePrefix}`);
      return;
    }

    setCodeError(null);
  }, [code, codePrefix]);

  // Verificar si el código ya existe (solo en modo crear)
  const checkCodeExists = useCallback(async () => {
    if (mode === 'edit' || !isValidAccountCode(code)) {
      setCodeExists(null);
      setExistingAccount(null);
      return;
    }

    setCheckingCode(true);
    try {
      const result = await chartOfAccountsService.exists(code);
      setCodeExists(result.exists);
      if (result.exists && result.account) {
        setExistingAccount({ code: result.account.code, name: result.account.name });
      } else {
        setExistingAccount(null);
      }
    } catch {
      setCodeExists(null);
      setExistingAccount(null);
    } finally {
      setCheckingCode(false);
    }
  }, [code, mode]);

  // Verificar si el padre existe cuando cambia el código
  const checkParent = useCallback(async () => {
    if (!detectedParentCode || !isValidAccountCode(code)) {
      setParentExists(null);
      setParentAccount(null);
      return;
    }

    setCheckingParent(true);
    try {
      const result = await chartOfAccountsService.exists(detectedParentCode);
      setParentExists(result.exists);
      if (result.exists && result.account) {
        setParentAccount({ code: result.account.code, name: result.account.name });
      } else {
        setParentAccount(null);
      }
    } catch {
      setParentExists(null);
      setParentAccount(null);
    } finally {
      setCheckingParent(false);
    }
  }, [code, detectedParentCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkCodeExists();
      checkParent();
    }, 300);
    return () => clearTimeout(timer);
  }, [checkCodeExists, checkParent]);

  // Crear cuenta padre (push al stack)
  const handleCreateParent = () => {
    if (!detectedParentCode) return;

    // Guardar estado actual en el stack
    setStack((prev) => [...prev, { code, name }]);

    // Ir al formulario del padre
    setCode(detectedParentCode);
    setName('');
    setError(null);
  };

  // Volver al formulario anterior (pop del stack)
  const handleBack = () => {
    if (stack.length === 0) {
      onCancel();
      return;
    }

    const prev = stack[stack.length - 1];
    setStack((s) => s.slice(0, -1));
    setCode(prev.code);
    setName(prev.name);
    setError(null);
  };

  // Guardar cuenta
  const handleSave = async () => {
    if (!code || !name) {
      setError('Código y nombre son requeridos');
      return;
    }

    if (codeError) {
      setError(codeError);
      return;
    }

    if (detectedParentCode && !parentExists) {
      setError('Debe crear la cuenta padre primero');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === 'create') {
        await chartOfAccountsService.create({ code, name });
        toast.success(`Cuenta ${code} creada exitosamente`);
      } else {
        await chartOfAccountsService.update(code, { name });
        toast.success('Cuenta actualizada exitosamente');
      }

      // Si hay items en el stack, volver al anterior
      if (stack.length > 0) {
        // Re-verificar padre después de crear
        const prev = stack[stack.length - 1];
        setStack((s) => s.slice(0, -1));
        setCode(prev.code);
        setName(prev.name);
        setError(null);
        // Forzar re-check del padre
        setTimeout(checkParent, 100);
      } else {
        // Pasar la cuenta creada para auto-selección
        onSuccess({ code, name });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al guardar la cuenta';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const isCodeValid = code && !codeError;
  const canSave = mode === 'edit'
    ? name.trim() !== ''
    : isCodeValid && name.trim() !== '' && codeExists === false && (parentExists || !detectedParentCode);

  return (
    <div className="space-y-4">
      {/* Breadcrumb del stack */}
      {stack.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </button>
          <span>|</span>
          <span>
            Creando padre para: <strong>{stack[stack.length - 1].code || '(nuevo)'}</strong>
          </span>
        </div>
      )}

      {/* Indicador de prefijo obligatorio */}
      {codePrefix && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Prefijo requerido:</strong> {codePrefix} ({codePrefixLabel || 'cuenta específica'})
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            El código debe empezar con {codePrefix}
          </p>
        </div>
      )}

      {/* Campo Código - solo en modo crear */}
      {mode === 'create' && (
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={codePrefix ? `Ej: ${codePrefix}0505` : 'Ej: 110505'}
            className={codeError || codeExists ? 'border-red-500' : ''}
          />
          {codeError && <p className="text-sm text-red-500">{codeError}</p>}

          {/* Estado del código */}
          {isCodeValid && !codeError && (
            <div className="space-y-2">
              {/* Verificando */}
              {checkingCode && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando disponibilidad...
                </div>
              )}

              {/* Código ya existe */}
              {!checkingCode && codeExists && existingAccount && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Ya existe: {existingAccount.name}
                </div>
              )}

              {/* Código disponible */}
              {!checkingCode && codeExists === false && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span className="h-4 w-4 flex items-center justify-center">✓</span>
                  Código disponible
                </div>
              )}

              {/* Info de tipo y nivel */}
              {detectedType && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Nivel:</span>
                  <span className="font-medium">{levelName}</span>
                  <span className="text-gray-500">| Tipo:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_TYPE_COLORS[detectedType]}`}>
                    {ACCOUNT_TYPE_LABELS[detectedType]}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info de cuenta en modo editar */}
      {mode === 'edit' && (
        <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-500">Código</div>
          <div className="font-mono font-medium">{code}</div>
        </div>
      )}

      {/* Campo Nombre */}
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la cuenta"
        />
      </div>

      {/* Info de cuenta padre - solo en modo crear */}
      {mode === 'create' && isCodeValid && detectedParentCode && (
        <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-500 mb-1">Cuenta padre: {detectedParentCode}</div>
          {checkingParent ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </div>
          ) : parentExists ? (
            <div className="text-green-600 font-medium">{parentAccount?.name}</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                La cuenta padre no existe
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateParent}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear cuenta {detectedParentCode}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Error general */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={handleBack} disabled={saving}>
          {stack.length > 0 ? 'Volver' : 'Cancelar'}
        </Button>
        <Button onClick={handleSave} disabled={!canSave || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            mode === 'create' ? 'Crear cuenta' : 'Guardar cambios'
          )}
        </Button>
      </div>
    </div>
  );
}
