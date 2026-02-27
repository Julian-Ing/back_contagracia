'use client';

import { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Decimal from 'decimal.js';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { CompanySettingsContext } from '@/shared/providers/CompanySettingsProvider';
import { ProtectedRoute } from '@/shared/components/auth';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { FormattedNumber, useFormatNumber } from '@/shared/components/ui/formatted-number';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
import { AsyncSearchableSelect, LoadOptionsResult } from '@/shared/components/ui/async-searchable-select';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { accountingClient } from '@/shared/services/api/apiClient';
import { RefTypeSelect, RefTypeOption } from '@/shared/components/ui/ref-type-select';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Edit, Plus, Trash2, Loader2, Search, X, Maximize2, Minimize2, AlertTriangle, FileSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import { thirdPartiesService } from '@/modules/third-parties';
import { accountingConfigService } from '@/modules/accounting';
import { costCentersService, useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';
import SelectArApDocumentModal, { SelectedDocument } from './SelectArApDocumentModal';
import SelectPrepaymentModal, { SelectedPrepayment } from './SelectPrepaymentModal';

type RefType = 'NORMAL' | 'CXC_CREATED' | 'CXP_CREATED' | 'CXC_PAID' | 'CXP_PAID' | 'PREP_USED'
  | 'PREP_CREATED_CLIENT' | 'PREP_CREATED_SUPPLIER' | 'PREP_CREATED_EMPLOYEE';

const REF_TYPE_OPTIONS: RefTypeOption[] = [
  { value: 'NORMAL', label: 'Normal', color: '#6B7280' },
  { value: 'CXC_CREATED', label: 'Crear CXC', allowedType: 'DEBIT', color: '#22C55E' },
  { value: 'CXP_CREATED', label: 'Crear CXP', allowedType: 'CREDIT', color: '#EF4444' },
  { value: 'CXC_PAID', label: 'Cobrar CXC', allowedType: 'CREDIT', color: '#3B82F6' },
  { value: 'CXP_PAID', label: 'Pagar CXP', allowedType: 'DEBIT', color: '#F59E0B' },
  { value: 'PREP_USED', label: 'Usar Anticipo', color: '#8B5CF6' },
  { value: 'PREP_CREATED', label: 'Crear Anticipo', color: '#10B981' },
];

const CREATOR_TYPES: RefType[] = ['CXC_CREATED', 'CXP_CREATED', 'PREP_CREATED_CLIENT', 'PREP_CREATED_SUPPLIER', 'PREP_CREATED_EMPLOYEE'];
const CONSUMER_TYPES: RefType[] = ['CXC_PAID', 'CXP_PAID', 'PREP_USED'];

const COLUMN_DEFS = [
  { key: 'ref_type', label: 'Ref. Tipo', minWidth: 140, defaultWidth: 170 },
  { key: 'account', label: 'Cuenta', minWidth: 160, defaultWidth: 220 },
  { key: 'third_party', label: 'Tercero', minWidth: 150, defaultWidth: 200 },
  { key: 'bank', label: 'Banco/Caja', minWidth: 140, defaultWidth: 190 },
  { key: 'description', label: 'Descripción', minWidth: 120, defaultWidth: 200 },
  { key: 'type', label: 'Tipo', minWidth: 60, defaultWidth: 75 },
  { key: 'amount', label: 'Monto', minWidth: 100, defaultWidth: 170 },
  { key: 'actions', label: '', minWidth: 44, defaultWidth: 44 },
];

interface JournalEntryLine {
  id: string;
  account_code: string;
  account_label: string;
  third_party_id: string;
  third_party_label: string;
  bank_account_id: string;
  bank_account_label: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  description: string;
  reference_type: RefType;
  reference_id: string;
  reference_label: string;
  reference_max_amount: number;
  is_locked: boolean;
  pair_id: string;
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
  cost_center_movement_type_key: string;
  cost_center_movement_type_label: string;
}

const NEEDS_DOCUMENT: RefType[] = ['CXC_PAID', 'CXP_PAID', 'PREP_USED'];

const createEmptyLine = (type: 'DEBIT' | 'CREDIT'): JournalEntryLine => ({
  id: crypto.randomUUID(),
  account_code: '',
  account_label: '',
  third_party_id: '',
  third_party_label: '',
  bank_account_id: '',
  bank_account_label: '',
  type,
  amount: '',
  description: '',
  reference_type: 'NORMAL',
  reference_id: '',
  reference_label: '',
  reference_max_amount: 0,
  is_locked: false,
  pair_id: '',
  cost_center_id: '',
  cost_center_label: '',
  cost_center_path: [],
  cost_center_movement_type_key: '',
  cost_center_movement_type_label: '',
});

// Determina si una cuenta requiere selección de cuenta bancaria
const getBankAccountRequirement = (accountCode: string): 'bank' | 'cash' | null => {
  if (accountCode.startsWith('1110')) return 'bank'; // Bancos → solo SAVINGS/CHECKING
  if (accountCode.startsWith('1105')) return 'cash'; // Caja → solo CASH
  return null;
};

const isBankCashAccount = (code: string) => code.startsWith('1105') || code.startsWith('1110');

export default function NewJournalEntryPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { fmtNumber } = useFormatNumber();
  const settings = useContext(CompanySettingsContext);
  const dd = settings?.displayDecimals;
  const roundMax = useCallback((val: number) =>
    dd !== undefined ? new Decimal(val).toDecimalPlaces(dd, Decimal.ROUND_HALF_UP).toNumber() : val,
  [dd]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<JournalEntryLine[]>([
    createEmptyLine('DEBIT'),
    createEmptyLine('CREDIT'),
  ]);

  const [isExpanded, setIsExpanded] = useState(false);

  // --- Modales de selección de documento ---
  const [docModalLineId, setDocModalLineId] = useState<string | null>(null);
  const [docModalType, setDocModalType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [prepModalLineId, setPrepModalLineId] = useState<string | null>(null);

  // --- Centro de costos ---
  const { hasModule } = useCompanyModules();
  const hasCCModule = hasModule('cost_centers');
  const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);
  const [ccMovementTypeOptions, setCcMovementTypeOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!hasCCModule) return;
    costCentersService.getMovementTypes().then(types => {
      setCcMovementTypeOptions(types.map(t => ({ value: t.key, label: t.name })));
    }).catch(() => {});
  }, [hasCCModule]);

  // --- Columnas redimensionables ---
  const [colWidths, setColWidths] = useState(() => COLUMN_DEFS.map(c => c.defaultWidth));
  const gridCols = colWidths.map(w => `${w}px`).join(' ');

  const handleResizeStart = useCallback((colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colIdx];
    const move = (ev: MouseEvent) => {
      const w = Math.max(COLUMN_DEFS[colIdx].minWidth, startW + ev.clientX - startX);
      setColWidths(p => { const n = [...p]; n[colIdx] = w; return n; });
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [colWidths]);

  // --- Filtros ---
  const [filterDesc, setFilterDesc] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [filterRefType, setFilterRefType] = useState<string>('ALL');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterThirdParty, setFilterThirdParty] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterErrors, setFilterErrors] = useState(false);

  // Errores por línea (para filtro y validación)
  const lineErrorsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const errs: string[] = [];
      const amt = new Decimal(line.amount || '0');
      if (!line.account_code) errs.push('Debe seleccionar una cuenta');
      if (amt.lte(0)) errs.push('Debe ingresar un monto mayor a 0');
      if (!line.description.trim()) errs.push('La descripción es requerida');
      if (line.account_code) {
        const req = getBankAccountRequirement(line.account_code);
        if (req && !line.bank_account_id) {
          errs.push(`Cuenta ${line.account_code} requiere ${req === 'cash' ? 'caja' : 'banco'}`);
        }
        if (isBankCashAccount(line.account_code) && line.reference_type !== 'NORMAL') {
          errs.push(`Cuentas de Banco/Caja solo permiten tipo "Normal"`);
        }
      }
      if (line.reference_type !== 'NORMAL') {
        if (!line.third_party_id) {
          const refLabel = REF_TYPE_OPTIONS.find(o => o.value === line.reference_type || (o.value === 'PREP_CREATED' && line.reference_type.startsWith('PREP_CREATED_')))?.label || line.reference_type;
          errs.push(`"${refLabel}" requiere tercero`);
        }
        const refOpt = REF_TYPE_OPTIONS.find(o => o.value === line.reference_type);
        if (refOpt?.allowedType && refOpt.allowedType !== line.type) {
          errs.push(`"${refOpt.label}" solo aplica en líneas tipo ${refOpt.allowedType === 'DEBIT' ? 'Débito' : 'Crédito'}`);
        }
        // Validar PREP_CREATED tipo de línea
        if (line.reference_type === 'PREP_CREATED_CLIENT' && line.type !== 'CREDIT') {
          errs.push('"Crear Anticipo Cliente" solo aplica en líneas Crédito');
        }
        if ((line.reference_type === 'PREP_CREATED_SUPPLIER' || line.reference_type === 'PREP_CREATED_EMPLOYEE') && line.type !== 'DEBIT') {
          errs.push('"Crear Anticipo" de proveedor/empleado solo aplica en líneas Débito');
        }
        // Consumidores: validar documento o vinculación
        if (CONSUMER_TYPES.includes(line.reference_type)) {
          if (line.pair_id) {
            // Vinculado a creador del asiento — validar monto vs disponible
            const creator = lines.find(l => l.pair_id === line.pair_id && CREATOR_TYPES.includes(l.reference_type));
            if (creator) {
              const otherConsumers = lines.filter(l =>
                l.id !== line.id && l.pair_id === line.pair_id && CONSUMER_TYPES.includes(l.reference_type)
              );
              const consumed = otherConsumers.reduce((s, l) => s.plus(new Decimal(l.amount || '0')), new Decimal(0));
              const available = new Decimal(creator.amount || '0').minus(consumed);
              if (amt.gt(available)) {
                errs.push(`Excede el disponible del documento vinculado (${fmtNumber(available.toNumber())})`);
              }
            }
          } else if (!line.reference_id) {
            const refLabel = REF_TYPE_OPTIONS.find(o => o.value === line.reference_type)?.label || line.reference_type;
            errs.push(`"${refLabel}" requiere seleccionar un documento`);
          } else if (new Decimal(line.reference_max_amount).gt(0)) {
            // Documento externo — validar monto vs saldo
            const otherLinesTotal = lines
              .filter(l => l.id !== line.id && l.reference_id === line.reference_id)
              .reduce((sum, l) => sum.plus(new Decimal(l.amount || '0')), new Decimal(0));
            const effectiveMax = new Decimal(line.reference_max_amount).minus(otherLinesTotal);
            if (amt.gt(effectiveMax)) {
              errs.push(`El monto no puede exceder el saldo disponible del documento (${fmtNumber(effectiveMax.toNumber())})`);
            }
          }
        } else if (!CREATOR_TYPES.includes(line.reference_type)) {
          // Otros tipos no-NORMAL que no son creadores ni consumidores
          if (line.reference_id && new Decimal(line.reference_max_amount).gt(0)) {
            const otherLinesTotal = lines
              .filter(l => l.id !== line.id && l.reference_id === line.reference_id)
              .reduce((sum, l) => sum.plus(new Decimal(l.amount || '0')), new Decimal(0));
            const effectiveMax = new Decimal(line.reference_max_amount).minus(otherLinesTotal);
            if (amt.gt(effectiveMax)) {
              errs.push(`El monto no puede exceder el saldo disponible del documento (${fmtNumber(effectiveMax.toNumber())})`);
            }
          }
        }
      }
      if (hasCCModule) {
        if (!line.cost_center_id) errs.push('Debe seleccionar un centro de costos');
        if (!line.cost_center_movement_type_key) errs.push('Debe seleccionar un tipo de movimiento CC');
      }
      if (errs.length > 0) map.set(line.id, errs);
    }
    return map;
  }, [lines, hasCCModule]);

  const linesWithErrorsCount = lineErrorsMap.size;

  const hasActiveFilters = !!(filterDesc || filterType !== 'ALL' || filterRefType !== 'ALL' || filterAccount || filterThirdParty || filterBank || filterErrors);

  const filteredLines = useMemo(() => {
    if (!hasActiveFilters) return lines;
    return lines.filter(line => {
      if (filterErrors && !lineErrorsMap.has(line.id)) return false;
      if (filterDesc && !line.description.toLowerCase().includes(filterDesc.toLowerCase())) return false;
      if (filterType !== 'ALL' && line.type !== filterType) return false;
      if (filterRefType !== 'ALL') {
        if (filterRefType === 'PREP_CREATED') {
          if (!line.reference_type.startsWith('PREP_CREATED_')) return false;
        } else if (line.reference_type !== filterRefType) return false;
      }
      if (filterAccount) {
        const q = filterAccount.toLowerCase();
        if (!line.account_code.toLowerCase().includes(q) && !line.account_label.toLowerCase().includes(q)) return false;
      }
      if (filterThirdParty) {
        const q = filterThirdParty.toLowerCase();
        if (!line.third_party_label.toLowerCase().includes(q)) return false;
      }
      if (filterBank) {
        const q = filterBank.toLowerCase();
        if (!line.bank_account_label.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [lines, filterDesc, filterType, filterRefType, filterAccount, filterThirdParty, filterBank, filterErrors, lineErrorsMap, hasActiveFilters]);

  const clearFilters = () => {
    setFilterDesc('');
    setFilterType('ALL');
    setFilterRefType('ALL');
    setFilterAccount('');
    setFilterThirdParty('');
    setFilterBank('');
    setFilterErrors(false);
  };

  // Cargar cuentas bancarias filtradas por tipo
  const loadBankAccounts = useCallback(
    (filterType: 'bank' | 'cash') =>
      async (search: string, page: number): Promise<LoadOptionsResult> => {
        try {
          const params: Record<string, string> = { page: String(page), limit: '50' };
          if (search) params.search = search;
          // Filtrar por tipo
          if (filterType === 'cash') {
            params.type = 'CASH';
          }

          const response = await accountingClient.get('/bank-accounts', { params });
          let data = response.data.data;

          // Para 'bank', excluir CASH del lado cliente
          if (filterType === 'bank') {
            data = data.filter((a: any) => a.account_type !== 'CASH');
          }

          return {
            data: data.map((a: any) => ({
              value: a.id,
              label: a.account_type === 'CASH'
                ? a.account_name
                : `${a.bank_name || ''} - ${a.account_name}`.replace(/^- /, ''),
            })),
            hasMore: response.data.hasMore,
            total: response.data.total,
          };
        } catch {
          return { data: [], hasMore: false, total: 0 };
        }
      },
    []
  );

  const updateLine = (id: string, updates: Partial<JournalEntryLine>) => {
    setLines(prev => {
      const oldLine = prev.find(l => l.id === id);
      const newLines = prev.map(line => {
        if (line.id !== id) return line;
        const updated = { ...line, ...updates };
        // Si cambia la cuenta, limpiar banco si ya no aplica
        if (updates.account_code !== undefined) {
          const newReq = getBankAccountRequirement(updates.account_code);
          const oldReq = getBankAccountRequirement(line.account_code);
          if (newReq !== oldReq) {
            updated.bank_account_id = '';
            updated.bank_account_label = '';
          }
        }
        // Si cambia reference_type, limpiar documento y desbloquear
        if (updates.reference_type !== undefined && updates.reference_type !== line.reference_type) {
          updated.reference_id = '';
          updated.reference_label = '';
          updated.reference_max_amount = 0;
          updated.is_locked = false;
          // Si venía bloqueado, limpiar campos autollenados
          if (line.is_locked) {
            updated.third_party_id = '';
            updated.third_party_label = '';
            updated.account_code = '';
            updated.account_label = '';
          }
          // Generar pair_id para creadores, limpiar para otros
          if (CREATOR_TYPES.includes(updates.reference_type)) {
            updated.pair_id = crypto.randomUUID();
          } else {
            updated.pair_id = '';
          }
          // Forzar tipo correcto para PREP_CREATED_*
          if (updates.reference_type === 'PREP_CREATED_CLIENT') {
            updated.type = 'CREDIT';
          } else if (updates.reference_type === 'PREP_CREATED_SUPPLIER' || updates.reference_type === 'PREP_CREATED_EMPLOYEE') {
            updated.type = 'DEBIT';
          }
        }
        return updated;
      });
      // Si un creador cambia de tipo, limpiar pair_id de sus consumidores
      if (oldLine && updates.reference_type !== undefined && updates.reference_type !== oldLine.reference_type && oldLine.pair_id) {
        const oldPairId = oldLine.pair_id;
        return newLines.map(l => {
          if (l.id !== id && l.pair_id === oldPairId && CONSUMER_TYPES.includes(l.reference_type)) {
            return { ...l, pair_id: '', reference_label: '', reference_max_amount: 0, is_locked: false };
          }
          return l;
        });
      }
      return newLines;
    });
  };

  // Cuando el usuario selecciona un documento CxC/CxP
  const handleDocumentSelected = useCallback(async (doc: SelectedDocument) => {
    if (!docModalLineId) return;
    const refType = lines.find(l => l.id === docModalLineId)?.reference_type;
    const isReceivable = refType === 'CXC_PAID';

    // Resolver cuenta contable: ThirdParty.cxc/cxp_account_code → fallback config
    let accountCode = '';
    let accountLabel = '';
    try {
      const tp = await thirdPartiesService.getOne(doc.third_party_id);
      const tpAccount = isReceivable ? tp.cxc_account_code : tp.cxp_account_code;
      if (tpAccount) {
        accountCode = tpAccount;
        const tpAccountObj = isReceivable ? tp.cxc_account : tp.cxp_account;
        accountLabel = tpAccountObj ? `${tpAccountObj.code} - ${tpAccountObj.name}` : tpAccount;
      }
    } catch { /* ignorar, intentar fallback */ }

    if (!accountCode) {
      try {
        const configKey = isReceivable ? 'finance_cxc' : 'finance_cxp';
        const config = await accountingConfigService.getByKey(configKey);
        if (config?.account_code) {
          accountCode = config.account_code;
          accountLabel = config.account ? `${config.account.code} - ${config.account.name}` : config.account_code;
        }
      } catch { /* sin cuenta */ }
    }

    updateLine(docModalLineId, {
      reference_id: doc.id,
      reference_label: `${doc.consecutive || '-'} | ${doc.source_description}: ${doc.source_number || '-'}`,
      reference_max_amount: roundMax(doc.balance),
      is_locked: true,
      third_party_id: doc.third_party_id,
      third_party_label: `${doc.third_party_document || ''} - ${doc.third_party_name}`.replace(/^- /, ''),
      ...(accountCode ? { account_code: accountCode, account_label: accountLabel } : {}),
      type: isReceivable ? 'CREDIT' : 'DEBIT',
    });
    setDocModalLineId(null);
  }, [docModalLineId, lines]);

  // Cuando el usuario selecciona un anticipo
  const handlePrepaymentSelected = useCallback(async (prep: SelectedPrepayment) => {
    if (!prepModalLineId) return;
    const typeLabel = ({ CLIENT: 'Cliente', SUPPLIER: 'Proveedor', EMPLOYEE: 'Empleado' } as Record<string, string>)[prep.prepayment_type] || prep.prepayment_type;

    // Resolver cuenta contable: Prepayment.account_code → fallback config por tipo
    let accountCode = prep.account_code || '';
    let accountLabel = prep.account_code || '';

    if (!accountCode) {
      const PREP_CONFIG_MAP: Record<string, string> = {
        CLIENT: 'sales_customer_advance',
        SUPPLIER: 'purchases_supplier_advance',
        EMPLOYEE: 'accounting_employee_advance',
      };
      const configKey = PREP_CONFIG_MAP[prep.prepayment_type];
      if (configKey) {
        try {
          const config = await accountingConfigService.getByKey(configKey);
          if (config?.account_code) {
            accountCode = config.account_code;
            accountLabel = config.account ? `${config.account.code} - ${config.account.name}` : config.account_code;
          }
        } catch { /* sin cuenta */ }
      }
    }

    // CLIENT advance is liability (credit balance) → DEBIT to reduce
    // SUPPLIER/EMPLOYEE advances are assets (debit balance) → CREDIT to reduce
    const prepSide: 'DEBIT' | 'CREDIT' = prep.prepayment_type === 'CLIENT' ? 'DEBIT' : 'CREDIT';

    updateLine(prepModalLineId, {
      reference_id: prep.id,
      reference_label: `Anticipo ${prep.consecutive || '-'} (${typeLabel})`,
      reference_max_amount: roundMax(prep.balance),
      is_locked: true,
      third_party_id: prep.third_party_id,
      third_party_label: `${prep.third_party_document || ''} - ${prep.third_party_name}`.replace(/^- /, ''),
      type: prepSide,
      ...(accountCode ? { account_code: accountCode, account_label: accountLabel } : {}),
    });
    setPrepModalLineId(null);
  }, [prepModalLineId]);

  // Limpiar selección de documento (externo o vinculado)
  const clearDocumentSelection = (lineId: string) => {
    updateLine(lineId, {
      reference_id: '',
      reference_label: '',
      reference_max_amount: 0,
      is_locked: false,
      pair_id: '',
      third_party_id: '',
      third_party_label: '',
      account_code: '',
      account_label: '',
    });
  };

  // Buscar líneas creadoras compatibles para un consumidor
  const getCompatibleCreators = useCallback((consumerType: RefType) => {
    return lines.filter(l => {
      if (!l.pair_id || !CREATOR_TYPES.includes(l.reference_type)) return false;
      if (consumerType === 'CXC_PAID') return l.reference_type === 'CXC_CREATED';
      if (consumerType === 'CXP_PAID') return l.reference_type === 'CXP_CREATED';
      if (consumerType === 'PREP_USED') return l.reference_type.startsWith('PREP_CREATED_');
      return false;
    });
  }, [lines]);

  // Vincular un consumidor a un creador del mismo asiento
  const linkToCreator = useCallback((lineId: string, creator: JournalEntryLine) => {
    const consumerLine = lines.find(l => l.id === lineId);
    if (!consumerLine) return;

    // Tipo del consumidor
    let consumerType: 'DEBIT' | 'CREDIT' = consumerLine.type;
    if (consumerLine.reference_type === 'CXC_PAID') consumerType = 'CREDIT';
    else if (consumerLine.reference_type === 'CXP_PAID') consumerType = 'DEBIT';
    else if (consumerLine.reference_type === 'PREP_USED') {
      consumerType = creator.reference_type === 'PREP_CREATED_CLIENT' ? 'DEBIT' : 'CREDIT';
    }

    // Monto disponible del creador
    const otherConsumers = lines.filter(l =>
      l.id !== lineId && l.pair_id === creator.pair_id && CONSUMER_TYPES.includes(l.reference_type)
    );
    const consumed = otherConsumers.reduce((s, l) => s.plus(new Decimal(l.amount || '0')), new Decimal(0));
    const available = new Decimal(creator.amount || '0').minus(consumed);

    updateLine(lineId, {
      pair_id: creator.pair_id,
      reference_label: `${creator.third_party_label || 'Sin tercero'} — ${creator.account_label || creator.account_code}`,
      reference_max_amount: roundMax(available.toNumber()),
      is_locked: true,
      third_party_id: creator.third_party_id || consumerLine.third_party_id,
      third_party_label: creator.third_party_label || consumerLine.third_party_label,
      account_code: creator.account_code,
      account_label: creator.account_label,
      type: consumerType,
    });
  }, [lines, roundMax]);

  // Abrir modal de documento según ref_type
  const openDocumentModal = (lineId: string, refType: RefType) => {
    if (refType === 'CXC_PAID') {
      setDocModalType('RECEIVABLE');
      setDocModalLineId(lineId);
    } else if (refType === 'CXP_PAID') {
      setDocModalType('PAYABLE');
      setDocModalLineId(lineId);
    } else if (refType === 'PREP_USED') {
      setPrepModalLineId(lineId);
    }
  };

  const toggleType = (id: string) => {
    setLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      return { ...line, type: line.type === 'DEBIT' ? 'CREDIT' : 'DEBIT' };
    }));
  };

  const addLine = () => {
    setLines(prev => [...prev, createEmptyLine('DEBIT')]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(prev => {
      const removedLine = prev.find(l => l.id === id);
      let filtered = prev.filter(line => line.id !== id);
      // Si se elimina un creador, limpiar pair_id de sus consumidores
      if (removedLine?.pair_id && CREATOR_TYPES.includes(removedLine.reference_type)) {
        const pairId = removedLine.pair_id;
        filtered = filtered.map(l =>
          l.pair_id === pairId && CONSUMER_TYPES.includes(l.reference_type)
            ? { ...l, pair_id: '', reference_label: '', reference_max_amount: 0, is_locked: false }
            : l
        );
      }
      return filtered;
    });
  };

  // Detectar si hay líneas de crear CXC/CXP
  const hasArApLines = useMemo(() =>
    lines.some(l => l.reference_type === 'CXC_CREATED' || l.reference_type === 'CXP_CREATED'),
  [lines]);

  // Cálculo de totales con precisión decimal (4 decimales)
  const totals = useMemo(() => {
    const debits = lines
      .filter(l => l.type === 'DEBIT')
      .reduce((sum, l) => sum.plus(new Decimal(l.amount || '0')), new Decimal(0));
    const credits = lines
      .filter(l => l.type === 'CREDIT')
      .reduce((sum, l) => sum.plus(new Decimal(l.amount || '0')), new Decimal(0));
    const difference = debits.minus(credits);
    return {
      debits: debits.toDecimalPlaces(4),
      credits: credits.toDecimalPlaces(4),
      difference: difference.toDecimalPlaces(4),
    };
  }, [lines]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!date) errors.push('La fecha es requerida');
    if (!description.trim()) errors.push('La descripción es requerida');
    if (lines.length < 2) errors.push('Se necesitan al menos 2 líneas');
    // Agregar errores de cada línea
    for (let i = 0; i < lines.length; i++) {
      const lineErrs = lineErrorsMap.get(lines[i].id);
      if (lineErrs) {
        lineErrs.forEach(err => errors.push(`Línea ${i + 1}: ${err}`));
      }
    }
    if (hasArApLines) {
      if (!dueDate) errors.push('Fecha de vencimiento requerida para crear CXC/CXP');
      else if (dueDate < date) errors.push('La fecha de vencimiento debe ser igual o mayor a la fecha de emisión');
    }
    if (!totals.difference.isZero()) {
      errors.push(`El asiento no está balanceado (diferencia: ${fmtNumber(totals.difference.toNumber())})`);
    }
    return errors;
  }, [date, description, dueDate, lines, lineErrorsMap, totals.difference, hasArApLines]);

  const isValid = validationErrors.length === 0;

  const handleSubmit = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      const payload: any = {
        date,
        description: description.trim() || null,
        type_key: 'manual',
        ...(hasArApLines && { due_date: dueDate }),
        items: lines
          .filter(l => l.account_code && new Decimal(l.amount || '0').gt(0))
          .map(l => ({
            account_code: l.account_code,
            type: l.type,
            amount: new Decimal(l.amount).toDecimalPlaces(4).toNumber(),
            description: l.description.trim() || null,
            third_party_id: l.third_party_id || null,
            bank_account_id: l.bank_account_id || null,
            reference_type: l.reference_type,
            reference_id: l.reference_id || null,
            pair_id: l.pair_id || null,
            ...(hasCCModule ? {
              cost_center_id: l.cost_center_id,
              cost_center_movement_type_key: l.cost_center_movement_type_key,
            } : {}),
          })),
      };

      const response = await accountingClient.post('/journal-entries', payload);
      toast.success('Asiento contable creado exitosamente');
      if (can('journal_entries.view_detail')) {
        router.push(`/dashboard/accounting/journal-entries/${response.data.id}`);
      } else {
        router.push('/dashboard/accounting/journal-entries');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear el asiento contable';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Clase de input para filtros
  const filterInputClass = 'h-7 px-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <ProtectedRoute permission="journal_entries.create" deniedMessage="No tienes permisos para crear Asientos Contables.">
      <div className="p-6">
        {!isExpanded && (<>
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-amber-500 text-white">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Asiento Contable</h1>
              <p className="text-sm text-muted-foreground">Crea un nuevo asiento contable manual.</p>
            </div>
          </div>
        </header>

        {/* Campos principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mb-6">
          <div className="space-y-2">
            <Label>Fecha</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="Seleccionar fecha"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              type="text"
              placeholder="Descripción del asiento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {hasArApLines && (
            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Fecha de vencimiento"
              />
              {dueDate && dueDate < date && (
                <p className="text-xs text-red-500">Debe ser igual o mayor a la fecha de emisión</p>
              )}
            </div>
          )}
        </div>
        </>)}

        {/* Líneas del asiento */}
        <div className={isExpanded
          ? "fixed top-16 left-[70px] right-0 bottom-0 z-30 bg-gray-50 dark:bg-gray-950 flex flex-col p-4 gap-3"
          : "space-y-3"
        }>
          <div className="flex items-center justify-between">
            <Label>
              Líneas del asiento{' '}
              <span className="text-gray-400 font-normal">({lines.length})</span>
            </Label>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title={isExpanded ? 'Contraer líneas' : 'Expandir líneas'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Barra de filtros */}
          <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Descripción..."
              value={filterDesc}
              onChange={(e) => setFilterDesc(e.target.value)}
              className={`${filterInputClass} w-32`}
            />
            <div className="w-32">
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'DEBIT', label: 'Débito' },
                  { value: 'CREDIT', label: 'Crédito' },
                ]}
                value={filterType}
                onChange={(v) => setFilterType(v as 'ALL' | 'DEBIT' | 'CREDIT')}
                placeholder="Tipo..."
                clearable={false}
                className="h-7 text-xs [&_button]:h-7 [&_button]:text-xs [&_button]:py-0"
              />
            </div>
            <div className="w-40">
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'Todos' },
                  ...REF_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
                ]}
                value={filterRefType}
                onChange={(v) => setFilterRefType(v)}
                placeholder="Ref. Tipo..."
                clearable={false}
                className="h-7 text-xs [&_button]:h-7 [&_button]:text-xs [&_button]:py-0"
              />
            </div>
            <input
              type="text"
              placeholder="Cuenta..."
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className={`${filterInputClass} w-28`}
            />
            <input
              type="text"
              placeholder="Tercero..."
              value={filterThirdParty}
              onChange={(e) => setFilterThirdParty(e.target.value)}
              className={`${filterInputClass} w-28`}
            />
            <input
              type="text"
              placeholder="Banco..."
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className={`${filterInputClass} w-28`}
            />
            {linesWithErrorsCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterErrors(!filterErrors)}
                className={`h-7 px-2 text-xs rounded border flex items-center gap-1 transition-colors cursor-pointer ${
                  filterErrors
                    ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                    : 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:border-amber-400 dark:hover:border-amber-600'
                }`}
                title="Filtrar líneas con errores"
              >
                <AlertTriangle className="h-3 w-3" />
                {linesWithErrorsCount} con errores
              </button>
            )}
            {hasActiveFilters && (
              <>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-7 px-2 text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
                <span className="text-xs text-gray-400">
                  {filteredLines.length} de {lines.length}
                </span>
              </>
            )}
            {isExpanded && (
              <div className="flex items-center gap-3 text-xs border-l border-gray-300 dark:border-gray-600 pl-3 ml-2 whitespace-nowrap">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  D: <FormattedNumber value={totals.debits.toNumber()} type="number" />
                </span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  C: <FormattedNumber value={totals.credits.toNumber()} type="number" />
                </span>
                <span className={`font-medium ${totals.difference.isZero() ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  Dif: <FormattedNumber value={totals.difference.toNumber()} type="number" />
                </span>
                {validationErrors.length > 0 && (
                  <span className="text-amber-500" title={validationErrors.join('\n')}>
                    {validationErrors.length} error(es)
                  </span>
                )}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="ml-auto h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar línea
            </Button>
          </div>

          {/* Grid scrollable con columnas redimensionables */}
          <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${isExpanded ? 'flex-1 flex flex-col min-h-0' : ''}`}>
            <div className={`overflow-x-auto overflow-y-auto ${isExpanded ? 'flex-1' : 'max-h-[60vh]'}`}>
              {/* Header sticky */}
              <div
                className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700"
                style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: 'max-content' }}
              >
                {COLUMN_DEFS.map((col, i) => (
                  <div
                    key={col.key}
                    className="relative px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 select-none whitespace-nowrap"
                  >
                    {col.label}
                    {i < COLUMN_DEFS.length - 1 && (
                      <div
                        className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-col-resize z-20 group/handle flex items-center justify-center"
                        onMouseDown={(e) => handleResizeStart(i, e)}
                        title="Arrastrar para redimensionar"
                      >
                        <div className="w-[3px] h-full bg-gray-200 dark:bg-gray-700 group-hover/handle:bg-blue-500 group-active/handle:bg-blue-600 transition-colors" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Lines */}
              {filteredLines.map((line) => {
                const bankReq = getBankAccountRequirement(line.account_code);
                const hasLineErrors = lineErrorsMap.has(line.id);
                return (
                  <div
                    key={line.id}
                    className={`border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${hasLineErrors ? 'border-l-2 border-l-red-400 dark:border-l-red-500 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                  >
                    <div
                      style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: 'max-content' }}
                      title={hasLineErrors ? lineErrorsMap.get(line.id)!.join(' | ') : undefined}
                    >
                      <div className="px-1 py-1">
                        <RefTypeSelect
                          options={REF_TYPE_OPTIONS}
                          value={line.reference_type}
                          onChange={(v) => {
                            updateLine(line.id, { reference_type: v as RefType });
                            // Abrir modal solo si es consumidor SIN creadores compatibles en el asiento
                            if (NEEDS_DOCUMENT.includes(v as RefType)) {
                              const creators = getCompatibleCreators(v as RefType);
                              if (creators.length === 0) {
                                setTimeout(() => openDocumentModal(line.id, v as RefType), 0);
                              }
                            }
                          }}
                          lineType={line.type}
                          accountCode={line.account_code}
                          hasThirdParty={!!line.third_party_id}
                          disabled={line.is_locked}
                        />
                        {/* PREP_CREATED sub-selector: Cliente/Proveedor/Empleado */}
                        {line.reference_type.startsWith('PREP_CREATED_') && (
                          <div className="mt-1 px-1">
                            <SearchableSelect
                              options={[
                                { value: 'PREP_CREATED_CLIENT', label: 'Cliente' },
                                { value: 'PREP_CREATED_SUPPLIER', label: 'Proveedor' },
                                { value: 'PREP_CREATED_EMPLOYEE', label: 'Empleado' },
                              ]}
                              value={line.reference_type}
                              onChange={(v) => updateLine(line.id, { reference_type: v as RefType })}
                              placeholder="Tipo..."
                              clearable={false}
                              className="h-6 text-[11px] [&_button]:h-6 [&_button]:text-[11px] [&_button]:py-0"
                            />
                          </div>
                        )}
                        {/* Documento vinculado (pair_id) */}
                        {CONSUMER_TYPES.includes(line.reference_type) && line.pair_id && (
                          <div className="mt-1 flex items-center gap-1 px-1">
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate flex-1" title={line.reference_label}>
                              Vinculado: {line.reference_label}
                            </span>
                            <button
                              type="button"
                              onClick={() => clearDocumentSelection(line.id)}
                              className="p-0.5 text-gray-400 hover:text-red-500 flex-shrink-0"
                              title="Desvincular"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {/* Documento externo seleccionado */}
                        {CONSUMER_TYPES.includes(line.reference_type) && !line.pair_id && line.reference_id && (
                          <div className="mt-1 flex items-center gap-1 px-1">
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 truncate flex-1" title={line.reference_label}>
                              {line.reference_label}
                            </span>
                            <button
                              type="button"
                              onClick={() => clearDocumentSelection(line.id)}
                              className="p-0.5 text-gray-400 hover:text-red-500 flex-shrink-0"
                              title="Quitar documento"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {/* Sin documento: selector inline de creadores del asiento + buscar externo */}
                        {CONSUMER_TYPES.includes(line.reference_type) && !line.pair_id && !line.reference_id && (() => {
                          const creators = getCompatibleCreators(line.reference_type);
                          return (
                            <div className="mt-1 px-1 space-y-0.5">
                              {creators.map(creator => {
                                const otherConsumers = lines.filter(l =>
                                  l.pair_id === creator.pair_id && CONSUMER_TYPES.includes(l.reference_type)
                                );
                                const consumed = otherConsumers.reduce((s, l) => s.plus(new Decimal(l.amount || '0')), new Decimal(0));
                                const available = new Decimal(creator.amount || '0').minus(consumed);
                                if (available.lte(0)) return null;
                                return (
                                  <button
                                    key={creator.id}
                                    type="button"
                                    onClick={() => linkToCreator(line.id, creator)}
                                    className="w-full text-[11px] text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded px-1 py-0.5"
                                    title={`Vincular a línea del asiento (disponible: ${fmtNumber(available.toNumber())})`}
                                  >
                                    <Plus className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{creator.third_party_label || 'Sin tercero'} — {fmtNumber(available.toNumber())}</span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => openDocumentModal(line.id, line.reference_type)}
                                className="w-full text-[11px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 px-1"
                              >
                                <FileSearch className="h-3 w-3" />
                                Buscar externo...
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="px-1 py-1">
                        <AccountSelect
                          value={line.account_code}
                          valueLabel={line.account_label}
                          onChange={(code, account) => updateLine(line.id, {
                            account_code: code,
                            account_label: account ? `${account.code} - ${account.name}` : ''
                          })}
                          placeholder="Cuenta..."
                          showCreateButton={true}
                          usePortal
                          disabled={line.is_locked}
                          excludePrefixes={line.reference_type !== 'NORMAL' ? '1105,1110' : undefined}
                        />
                      </div>
                      <div className="px-1 py-1">
                        <ThirdPartySelect
                          value={line.third_party_id}
                          valueLabel={line.third_party_label}
                          onChange={(id, tp) => updateLine(line.id, {
                            third_party_id: id,
                            third_party_label: tp ? `${tp.identification_number} - ${tp.name}` : ''
                          })}
                          placeholder="Tercero..."
                          disabled={line.is_locked}
                          excludeRoles={['CONTACT']}
                          usePortal
                        />
                      </div>
                      <div className="px-1 py-1">
                        {bankReq ? (
                          <AsyncSearchableSelect
                            loadOptions={loadBankAccounts(bankReq)}
                            value={line.bank_account_id}
                            valueLabel={line.bank_account_label}
                            onChange={(id, opt) => updateLine(line.id, {
                              bank_account_id: id,
                              bank_account_label: opt?.label || ''
                            })}
                            placeholder={bankReq === 'cash' ? 'Caja...' : 'Banco...'}
                            searchPlaceholder="Buscar..."
                            clearable={true}
                            usePortal
                          />
                        ) : (
                          <div className="h-10 flex items-center justify-center text-gray-400 text-xs">
                            —
                          </div>
                        )}
                      </div>
                      <div className="px-1 py-1">
                        <Input
                          placeholder="Descripción"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        />
                      </div>
                      <div className="px-1 py-1 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => !line.is_locked && toggleType(line.id)}
                          disabled={line.is_locked}
                          className={`px-2 py-1 text-xs font-bold rounded whitespace-nowrap ${
                            line.is_locked ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            line.type === 'DEBIT'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {line.type === 'DEBIT' ? 'DEB' : 'CRED'}
                        </button>
                      </div>
                      <div className="px-1 py-1">
                        <NumericInput
                          value={line.amount}
                          onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                          placeholder="0"
                          allowNegative={false}
                        />
                        {(() => {
                          // Mostrar máximo: para pair_id (vinculado a creador) o para documento externo
                          if (line.pair_id && CONSUMER_TYPES.includes(line.reference_type)) {
                            const creator = lines.find(l => l.pair_id === line.pair_id && CREATOR_TYPES.includes(l.reference_type));
                            if (creator) {
                              const otherConsumers = lines.filter(l =>
                                l.id !== line.id && l.pair_id === line.pair_id && CONSUMER_TYPES.includes(l.reference_type)
                              );
                              const consumed = otherConsumers.reduce((s, l) => s.plus(new Decimal(l.amount || '0')), new Decimal(0));
                              const available = new Decimal(creator.amount || '0').minus(consumed);
                              return (
                                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                  Máx: <FormattedNumber value={available.toNumber()} type="currency" />
                                </span>
                              );
                            }
                          }
                          if (line.reference_id && line.reference_max_amount > 0) {
                            const otherTotal = lines
                              .filter(l => l.id !== line.id && l.reference_id === line.reference_id)
                              .reduce((sum, l) => sum + Number(l.amount || 0), 0);
                            const effectiveMax = line.reference_max_amount - otherTotal;
                            return (
                              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                Máx: <FormattedNumber value={effectiveMax} type="currency" />
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="px-1 py-1 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 2}
                          className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {hasCCModule && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-800/40" style={{ minWidth: 'max-content' }}>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">CC:</span>
                        <CostCenterCascadeSelect
                          ccTree={ccTree}
                          ccFlatMap={ccFlatMap}
                          value={line.cost_center_id}
                          path={line.cost_center_path}
                          onChange={(id, label, path) => {
                            updateLine(line.id, {
                              cost_center_path: path,
                              cost_center_id: id,
                              cost_center_label: label,
                            });
                          }}
                          size="sm"
                          itemWidth="fixed"
                        />
                        <div className="w-48">
                          <SearchableSelect
                            options={ccMovementTypeOptions}
                            value={line.cost_center_movement_type_key}
                            onChange={(v) => {
                              const opt = ccMovementTypeOptions.find(o => o.value === v);
                              updateLine(line.id, { cost_center_movement_type_key: v, cost_center_movement_type_label: opt?.label || '' });
                            }}
                            placeholder="Tipo movimiento..."
                            className="h-7 text-xs [&_button]:h-7 [&_button]:text-xs [&_button]:py-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty state */}
              {filteredLines.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  {hasActiveFilters ? 'No hay líneas que coincidan con los filtros' : 'No hay líneas'}
                </div>
              )}
            </div>
          </div>

          {/* Footer expandido con acciones */}
          {isExpanded && (
            <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              {validationErrors.length > 0 && (
                <div className="flex-1 flex flex-wrap gap-x-3 gap-y-1 overflow-y-auto max-h-16">
                  {validationErrors.map((err, i) => (
                    <span key={i} className="text-xs text-red-500 dark:text-red-400 whitespace-nowrap">
                      • {err}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsExpanded(false)}>
                  <Minimize2 className="h-3.5 w-3.5 mr-1" />
                  Contraer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={loading || !isValid}
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Guardar Asiento
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isExpanded && (
        <div className="mt-6 grid grid-cols-[1fr_auto_auto] gap-4 items-start">
          {/* Errores de validación */}
          <div className="min-h-[80px]">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 min-w-[280px]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Total Débitos:</span>
              <FormattedNumber value={totals.debits.toNumber()} type="number" className="font-medium text-green-600 dark:text-green-400 ml-4" />
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Total Créditos:</span>
              <FormattedNumber value={totals.credits.toNumber()} type="number" className="font-medium text-red-600 dark:text-red-400 ml-4" />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-700 dark:text-gray-300">Diferencia:</span>
                <FormattedNumber value={totals.difference.toNumber()} type="number" className={`ml-4 ${totals.difference.isZero() ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/accounting/journal-entries')}
              disabled={loading}
              className="w-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !isValid}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Asiento
            </Button>
          </div>
        </div>
        )}
      </div>

      {/* Modales de selección de documento */}
      <SelectArApDocumentModal
        open={!!docModalLineId}
        onClose={() => setDocModalLineId(null)}
        onSelect={handleDocumentSelected}
        type={docModalType}
      />
      <SelectPrepaymentModal
        open={!!prepModalLineId}
        onClose={() => setPrepModalLineId(null)}
        onSelect={handlePrepaymentSelected}
      />
    </ProtectedRoute>
  );
}
