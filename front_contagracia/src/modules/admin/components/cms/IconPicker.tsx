'use client';

/**
 * IconPicker - Selector visual de iconos Lucide en un Dialog
 * Adaptado del viejo IconPicker.jsx
 */

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Button } from '@/shared/components/ui/button';

const ICONS_PER_PAGE = 100;

interface IconPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon: string | null;
}

export function IconPicker({ open, onClose, onSelect, currentIcon }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const allIcons = useMemo(() => {
    return Object.keys(LucideIcons)
      .filter((key) => {
        const val = (LucideIcons as Record<string, unknown>)[key];
        if (typeof val !== 'function' && typeof val !== 'object') return false;
        if (key === 'createLucideIcon' || key === 'Icon' || key.startsWith('Lucide')) return false;
        if (key[0] !== key[0].toUpperCase()) return false;
        return true;
      })
      .sort();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return allIcons;
    const q = search.toLowerCase();
    return allIcons.filter((n) => n.toLowerCase().includes(q));
  }, [allIcons, search]);

  const paginated = useMemo(() => filtered.slice(0, page * ICONS_PER_PAGE), [filtered, page]);
  const hasMore = paginated.length < filtered.length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSelect = (name: string) => {
    onSelect(name);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleccionar Icono</DialogTitle>
          <DialogDescription>
            Busca y selecciona un icono de Lucide ({allIcons.length} disponibles)
          </DialogDescription>
        </DialogHeader>

        <div className="sticky top-0 z-10 bg-background pb-4">
          <Input
            placeholder="Buscar icono... (ej: heart, arrow, check)"
            value={search}
            onChange={handleSearch}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Mostrando {paginated.length} de {filtered.length} iconos
          </p>
        </div>

        <ScrollArea className="h-[500px] w-full">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-2">
            {paginated.map((iconName) => {
              const Ico = (LucideIcons as Record<string, any>)[iconName];
              if (!Ico) return null;
              const selected = iconName === currentIcon;
              return (
                <button
                  key={iconName}
                  onClick={() => handleSelect(iconName)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-accent hover:border-primary ${selected ? 'border-primary bg-primary/10' : 'border-border'}`}
                  title={iconName}
                >
                  <Ico size={24} strokeWidth={2} />
                  <span className="text-[10px] mt-1 text-center break-all line-clamp-2">{iconName}</span>
                </button>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center py-4">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                Cargar mas ({filtered.length - paginated.length} restantes)
              </Button>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <LucideIcons.Search size={48} className="mb-4 opacity-30" />
              <p>No se encontraron iconos con &quot;{search}&quot;</p>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
