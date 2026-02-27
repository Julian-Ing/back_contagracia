'use client';

import { useState } from 'react';
import { Search, Pencil, Mail, Phone, Building2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { useThirdParties } from '../hooks/useThirdParties';
import { ROLE_LABELS, ROLE_COLORS } from '../types';
import type { ThirdParty, ThirdPartyRole } from '../types';

// Roles para el filtro (excluye PH, CONTACT, EMPLOYEE)
const FILTER_ROLES: { value: string; label: string }[] = [
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'SUPPLIER', label: 'Proveedor' },
  { value: 'EPS', label: 'EPS' },
  { value: 'PENSION_FUND', label: 'Fondo de Pensiones' },
  { value: 'ARL', label: 'ARL' },
  { value: 'COMPENSATION_FUND', label: 'Caja de Compensación' },
  { value: 'SEVERANCE_FUND', label: 'Fondo de Cesantías' },
  { value: 'SENA', label: 'SENA' },
  { value: 'ICBF', label: 'ICBF' },
  { value: 'OTHER', label: 'Otro' },
];

interface ThirdPartiesListProps {
  canEdit: boolean;
  onEdit: (thirdParty: ThirdParty) => void;
}

const PAGE_SIZE = 20;

export function ThirdPartiesList({ canEdit, onEdit }: ThirdPartiesListProps) {
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const {
    thirdParties,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage,
    setRole,
  } = useThirdParties({ limit: PAGE_SIZE });

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);
    setRole(value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(searchInput);
    }
  };

  if (loading && thirdParties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando terceros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Table con Search integrado */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
              <span>Lista de Terceros</span>
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <div className="flex gap-2 flex-1 md:max-w-2xl items-center">
              <SearchableSelect
                options={FILTER_ROLES}
                value={roleFilter}
                onChange={handleRoleChange}
                placeholder="Todos los roles"
                searchPlaceholder="Buscar rol..."
                clearable
                className="w-52"
              />
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar nombre, NIT o correo..."
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Tercero</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Identificación</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Contacto</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipos</TableHead>
                  {canEdit && (
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {thirdParties.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 5 : 4}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron terceros
                    </TableCell>
                  </TableRow>
                ) : (
                  thirdParties.map((tp) => (
                    <TableRow
                      key={tp.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                            {tp.type_organization_id === '2' ? (
                              <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            ) : (
                              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {tp.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {tp.type_organization_id === '2' ? 'Persona Natural' : 'Persona Jurídica'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white font-mono">
                            {tp.identification_number}
                            {tp.dv && <span className="text-gray-400">-{tp.dv}</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {(tp as any).type_document_identification?.name || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {tp.email && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">{tp.email}</span>
                            </div>
                          )}
                          {tp.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400">
                              <Phone className="h-3 w-3" />
                              <span>{tp.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tp.roles && tp.roles.length > 0 ? (
                            tp.roles.slice(0, 3).map((role) => (
                              <Badge
                                key={role}
                                className={`text-xs ${ROLE_COLORS[role as ThirdPartyRole] || 'bg-gray-100 text-gray-700'}`}
                              >
                                {ROLE_LABELS[role as ThirdPartyRole] || role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">Sin roles</span>
                          )}
                          {tp.roles && tp.roles.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{tp.roles.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(tp)}
                            title="Editar tercero"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
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
            Página {page} de {totalPages} ({total} terceros)
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
