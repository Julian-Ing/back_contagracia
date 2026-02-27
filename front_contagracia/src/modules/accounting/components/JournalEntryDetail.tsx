'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useAuth } from '@/modules/auth';
import { CompanySettingsContext } from '@/shared/providers/CompanySettingsProvider';
import { ExportButtons } from '@/shared/components/ui/export-buttons';
import { generateJournalEntryPdf } from '@/modules/accounting/utils/generateJournalEntryPdf';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { ArrowLeft, FileText, Loader2, RotateCcw, Copy } from 'lucide-react';
import { accountingClient } from '@/shared/services/api/apiClient';
import { formatDate } from '@/shared/utils/formatDate';
import { DatePicker } from '@/shared/components/ui/date-picker';
import toast from 'react-hot-toast';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';

export interface JournalEntryDetailProps {
  entryId: string;
  mode?: 'page' | 'modal';
  open?: boolean;
  onClose?: () => void;
  onNavigateToEntry?: (id: string) => void;
}

interface JournalEntryItem {
  id: string;
  account_code: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string | null;
  third_party_id: string | null;
  bank_account_id: string | null;
  reference_type: string;
  account: { code: string; name: string };
  third_party: { id: string; name: string; identification_number: string } | null;
  bank_account: { id: string; account_name: string } | null;
}

interface JournalEntry {
  id: string;
  consecutive: string;
  date: string | null;
  description: string | null;
  type_key: string;
  reference_id: string | null;
  is_reversed: boolean;
  created_at: string;
  type: { key: string; description: string; color: string };
  items: JournalEntryItem[];
  reversal_entry: { id: string; consecutive: string } | null;
  original_entry: { id: string; consecutive: string } | null;
}

export function JournalEntryDetail({
  entryId,
  mode = 'page',
  open = true,
  onClose,
  onNavigateToEntry,
}: JournalEntryDetailProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const { company } = useAuth();
  const settings = useContext(CompanySettingsContext);
  const id = entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [reversalDate, setReversalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [duplicateDate, setDuplicateDate] = useState(() => new Date().toISOString().split('T')[0]);

  const canReverse = can('journal_entries.reverse');
  const canDuplicate = can('journal_entries.duplicate');

  const hasPaymentLines = useMemo(() => {
    if (!entry) return false;
    return entry.items.some(i => i.reference_type && i.reference_type !== 'NORMAL');
  }, [entry]);

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        const response = await accountingClient.get(`/journal-entries/${id}`);
        setEntry(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el asiento');
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [id]);

  const totals = useMemo(() => {
    if (!entry) return { debits: 0, credits: 0 };
    const debits = entry.items
      .filter(i => i.type === 'DEBIT')
      .reduce((sum, i) => sum + (typeof i.amount === 'string' ? parseFloat(i.amount) : i.amount), 0);
    const credits = entry.items
      .filter(i => i.type === 'CREDIT')
      .reduce((sum, i) => sum + (typeof i.amount === 'string' ? parseFloat(i.amount) : i.amount), 0);
    return { debits, credits };
  }, [entry]);

  const navigateToEntry = (newId: string) => {
    if (mode === 'modal' && onNavigateToEntry) {
      onNavigateToEntry(newId);
    } else {
      router.push(`/dashboard/accounting/journal-entries/${newId}`);
    }
  };

  const handleBack = () => {
    if (mode === 'modal' && onClose) {
      onClose();
    } else {
      router.push('/dashboard/accounting/journal-entries');
    }
  };

  const handleReverse = async () => {
    setShowReverseConfirm(false);
    setActionLoading(true);
    try {
      const response = await accountingClient.post(`/journal-entries/${id}/reverse`, { date: reversalDate });
      toast.success(`Asiento reversado. Nuevo asiento: ${response.data.consecutive}`);
      navigateToEntry(response.data.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al reversar el asiento');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setShowDuplicateConfirm(false);
    setActionLoading(true);
    try {
      const response = await accountingClient.post(`/journal-entries/${id}/duplicate`, { date: duplicateDate });
      toast.success(`Asiento duplicado: ${response.data.consecutive}`);
      navigateToEntry(response.data.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al duplicar el asiento');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!entry) return;
    setPdfLoading(true);
    try {
      await generateJournalEntryPdf({
        entry,
        companyName: company?.company_name || '',
        nit: company?.nit || '',
        logoUrl: company?.logo_url,
        displayDecimals: settings?.displayDecimals ?? 2,
      });
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // Solo mostrar reversar si es manual y no está reversado
  const showReverseButton = entry && entry.type_key === 'manual' && !entry.is_reversed && canReverse;

  const content = (
    <>
    <div className={mode === 'page' ? 'p-4' : ''}>
      <header className={`${mode === 'page' ? 'mb-4' : 'mb-3'} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {mode === 'page' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
            <div className="h-9 w-9 grid place-items-center rounded-lg bg-amber-500 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {loading ? 'Cargando...' : entry?.consecutive || 'Asiento'}
              </h1>
            </div>
          </div>

          {/* Botones de acción */}
          {entry && !loading && (
            <div className="flex gap-2">
              <ExportButtons
                onExportPdf={handleExportPdf}
                permission="journal_entries.export"
                loadingPdf={pdfLoading}
              />
              {canDuplicate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDuplicateConfirm(true)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
                  Duplicar
                </Button>
              )}
              {showReverseButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReverseConfirm(true)}
                  disabled={actionLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                  Reversar
                </Button>
              )}
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : error ? (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
          </Card>
        ) : entry ? (
          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardContent className="p-4">
              {/* Info header */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Fecha: </span>
                  {entry.date ? (
                    <span className="text-gray-900 dark:text-white">{formatDate(entry.date)}</span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 italic">Sin fecha (cierre)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">Tipo: </span>
                  <Badge
                    style={{ backgroundColor: `${entry.type.color}20`, color: entry.type.color, borderColor: entry.type.color }}
                    className="border font-normal text-xs"
                  >
                    {entry.type.description}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">Estado: </span>
                  {entry.is_reversed ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                        Reversado
                      </Badge>
                      {entry.reversal_entry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => navigateToEntry(entry.reversal_entry!.id)}
                        >
                          Ver reversión: {entry.reversal_entry.consecutive}
                        </Button>
                      )}
                    </div>
                  ) : entry.type_key === 'reversal' ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                        Reversión
                      </Badge>
                      {entry.original_entry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => navigateToEntry(entry.original_entry!.id)}
                        >
                          Ver original: {entry.original_entry.consecutive}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                      Activo
                    </Badge>
                  )}
                </div>
                {entry.description && (
                  <div className="w-full">
                    <span className="text-gray-500 dark:text-gray-400">Descripción: </span>
                    <span className="text-gray-900 dark:text-white">{entry.description}</span>
                  </div>
                )}
              </div>

              {/* Tabla de líneas */}
              <div className="overflow-x-auto -mx-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-700">
                      <TableHead className="text-gray-600 dark:text-slate-300 text-xs py-2">Cuenta</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300 text-xs py-2">Tercero</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300 text-xs py-2">Banco/Caja</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300 text-xs py-2">Descripción</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300 text-xs py-2 text-right">Débito</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300 text-xs py-2 text-right">Crédito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.items.map((item) => (
                      <TableRow key={item.id} className="border-gray-200 dark:border-slate-700">
                        <TableCell className="py-2">
                          <span className="font-mono text-xs text-gray-500">{item.account.code}</span>
                          <span className="ml-1 text-sm text-gray-900 dark:text-white">{item.account.name}</span>
                        </TableCell>
                        <TableCell className="py-2 text-sm">
                          {item.third_party ? (
                            <>
                              <span className="font-mono text-xs text-gray-500">{item.third_party.identification_number}</span>
                              <span className="ml-1 text-gray-900 dark:text-white">{item.third_party.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-gray-900 dark:text-white">
                          {item.bank_account?.account_name || <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-gray-600 dark:text-slate-300">
                          {item.description || '—'}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {item.type === 'DEBIT' ? (
                            <span className="font-mono text-sm text-green-600 dark:text-green-400">
                              <FormattedNumber value={item.amount} type="currency" />
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {item.type === 'CREDIT' ? (
                            <span className="font-mono text-sm text-red-600 dark:text-red-400">
                              <FormattedNumber value={item.amount} type="currency" />
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-medium">
                      <TableCell colSpan={4} className="py-2 text-right text-sm text-gray-700 dark:text-gray-300">
                        Totales
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="font-mono text-sm text-green-600 dark:text-green-400">
                          <FormattedNumber value={totals.debits} type="currency" />
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="font-mono text-sm text-red-600 dark:text-red-400">
                          <FormattedNumber value={totals.credits} type="currency" />
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Modal de confirmación para reversar */}
      <AlertDialog open={showReverseConfirm} onOpenChange={setShowReverseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reversar asiento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Se creará un nuevo asiento con los movimientos invertidos y el asiento actual quedará marcado como reversado.</p>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Fecha del asiento de reversión
                  </label>
                  <DatePicker
                    value={reversalDate}
                    onChange={setReversalDate}
                    placeholder="Seleccionar fecha"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReverse} className="bg-red-600 hover:bg-red-700">
              Reversar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmación para duplicar */}
      <AlertDialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar asiento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Se creará un nuevo asiento con los mismos movimientos contables y bancarios.</p>
                {hasPaymentLines && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                    Este asiento tiene líneas de CxC, CxP o anticipos. El duplicado solo copiará los movimientos contables y bancarios — no se duplicarán pagos, documentos ni movimientos de anticipos.
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Fecha del nuevo asiento
                  </label>
                  <DatePicker
                    value={duplicateDate}
                    onChange={setDuplicateDate}
                    placeholder="Seleccionar fecha"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate}>
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (mode === 'modal') {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <DialogContent className="sm:max-w-[1000px] max-h-[85vh] overflow-y-auto">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
