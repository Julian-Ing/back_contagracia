'use client';

import { useState, useEffect } from 'react';
import { Search, RotateCcw, ChevronRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { formatDate } from '@/shared/utils/formatDate';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { useJournalEntries } from '../hooks/useJournalEntries';
import { journalEntriesService } from '../services/journalEntries.service';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import type { JournalEntry, JournalEntryType } from '../types/journalEntries';

interface JournalEntriesListProps {
  onViewDetail?: (entry: JournalEntry) => void;
}

const PAGE_SIZE = 20;

export function JournalEntriesList({ onViewDetail }: JournalEntriesListProps) {
  const router = useRouter();
  const [entryTypes, setEntryTypes] = useState<JournalEntryType[]>([]);

  const {
    entries,
    total,
    page,
    totalPages,
    loading,
    error,
    searchTerm: savedSearch,
    typeFilter: savedType,
    fromDate: savedFromDate,
    toDate: savedToDate,
    search,
    filterByType,
    filterByDates,
    setPage,
  } = useJournalEntries({ limit: PAGE_SIZE });

  const [searchInput, setSearchInput] = useState(savedSearch);
  const [fromDate, setFromDate] = useState(savedFromDate);
  const [toDate, setToDate] = useState(savedToDate);
  const [typeKey, setTypeKey] = useState(savedType);

  // Cargar tipos de asientos
  useEffect(() => {
    journalEntriesService.getTypes().then(setEntryTypes).catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(searchInput);
    }
  };

  const handleTypeChange = (value: string) => {
    setTypeKey(value);
    filterByType(value || undefined);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFromDate('');
    setToDate('');
    setTypeKey('');
    search('');
    filterByType(undefined);
    filterByDates(undefined, undefined);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando asientos contables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      )}

      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
                <span>Asientos Contables</span>
                <Badge variant="secondary">{total}</Badge>
              </CardTitle>
            </div>

            {/* Filtros */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por consecutivo o descripción..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="sm">
                    Buscar
                  </Button>
                </form>

                <div className="w-[220px]">
                  <SearchableSelect
                    options={entryTypes.map((t) => ({ value: t.key, label: t.description }))}
                    value={typeKey}
                    onChange={handleTypeChange}
                    placeholder="Tipo de asiento..."
                  />
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <div className="w-[180px]">
                  <DatePicker
                    value={fromDate}
                    onChange={(value) => {
                      setFromDate(value);
                      filterByDates(value || undefined, toDate || undefined);
                    }}
                    placeholder="Desde..."
                    maxDate={toDate || undefined}
                  />
                </div>
                <span className="text-gray-400">-</span>
                <div className="w-[180px]">
                  <DatePicker
                    value={toDate}
                    onChange={(value) => {
                      setToDate(value);
                      filterByDates(fromDate || undefined, value || undefined);
                    }}
                    placeholder="Hasta..."
                    minDate={fromDate || undefined}
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters} title="Limpiar filtros">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[120px]">Consecutivo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Fecha</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[130px]">Débito</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[130px]">Crédito</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center w-[100px]">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron asientos contables
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <>
                      {/* Fila principal del asiento */}
                      <TableRow
                        key={entry.id}
                        className={`border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 ${
                          entry.is_reversed ? 'opacity-60' : ''
                        }`}
                      >
                        <TableCell>
                          <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {entry.consecutive}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600 dark:text-slate-300 text-sm">
                            {formatDate(entry.date)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            style={{ backgroundColor: `${entry.type_color}20`, color: entry.type_color, borderColor: entry.type_color }}
                            className="border font-normal"
                          >
                            {entry.type_description}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-900 dark:text-white text-sm line-clamp-1">
                            {entry.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            <FormattedNumber value={entry.total_debit} type="currency" />
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            <FormattedNumber value={entry.total_credit} type="currency" />
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.is_reversed ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Reversado: {entry.reversal_entry?.consecutive}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Activo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/dashboard/accounting/journal-entries/${entry.id}`)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4 text-gray-500 hover:text-amber-600" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Fila del asiento de reversión (hijo) */}
                      {entry.is_reversed && entry.reversal_entry && (
                        <TableRow
                          key={`reversal-${entry.reversal_entry.id}`}
                          className="border-gray-200 dark:border-slate-700 bg-red-50/50 dark:bg-red-900/10"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2 pl-4">
                              <ChevronRight className="h-3 w-3 text-red-400" />
                              <span className="font-mono text-sm font-medium text-red-700 dark:text-red-400">
                                {entry.reversal_entry.consecutive}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-red-600 dark:text-red-400 text-sm">
                              {formatDate(entry.reversal_entry.date)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700 font-normal">
                              Reversión
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-red-700 dark:text-red-400 text-sm line-clamp-1">
                              {entry.reversal_entry.description || `Reversión de ${entry.consecutive}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-sm text-red-700 dark:text-red-400">
                              <FormattedNumber value={entry.reversal_entry.total_debit || 0} type="currency" />
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-sm text-red-700 dark:text-red-400">
                              <FormattedNumber value={entry.reversal_entry.total_credit || 0} type="currency" />
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Reversión
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.push(`/dashboard/accounting/journal-entries/${entry.reversal_entry!.id}`)}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4 text-red-500 hover:text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} asientos)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
