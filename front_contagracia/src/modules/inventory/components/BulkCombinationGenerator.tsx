'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { CheckCircle2, Info, Loader2, Plus, Search, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsService } from '../services/products.service';
import type { AssignedAttribute } from '../types';

const BATCH_SIZE = 10;

interface GeneratedCombo {
  id: string;
  index: number;
  optionIds: string[];
  fingerprint: string;
  name: string;
  nameParts: string[];
  barcode: string;
}

interface BulkCombinationGeneratorProps {
  productId: string;
  parentProduct: any;
  assignedAttributes: AssignedAttribute[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const BulkCombinationGenerator = ({
  productId,
  parentProduct,
  assignedAttributes,
  open,
  onOpenChange,
  onCreated,
}: BulkCombinationGeneratorProps) => {
  // Option selection per attribute
  const [selectedPerAttr, setSelectedPerAttr] = useState<Record<string, string[]>>({});

  // Generated combinations for preview
  const [generated, setGenerated] = useState<GeneratedCombo[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalNew, setTotalNew] = useState(0);

  // Existing fingerprints
  const [existingFingerprints, setExistingFingerprints] = useState<Set<string>>(new Set());
  const [fingerprintsLoaded, setFingerprintsLoaded] = useState(false);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Toggle an option for an attribute
  const handleToggleOption = (attrId: string, optionId: string) => {
    setSelectedPerAttr(prev => {
      const current = prev[attrId] || [];
      const next = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      return { ...prev, [attrId]: next };
    });
    resetPreview();
  };

  // Select all / deselect all for an attribute
  const handleToggleAll = (attrId: string, options: { id: string }[]) => {
    setSelectedPerAttr(prev => {
      const current = prev[attrId] || [];
      const allSelected = options.every(o => current.includes(o.id));
      return { ...prev, [attrId]: allSelected ? [] : options.map(o => o.id) };
    });
    resetPreview();
  };

  const resetPreview = () => {
    setGenerated([]);
    setOffset(0);
    setHasMore(false);
    setTotalNew(0);
    setSelected({});
    setFingerprintsLoaded(false);
    setStep(1);
  };

  // Get attributes that have selected options
  const activeAttributes = assignedAttributes.filter(
    attr => (selectedPerAttr[attr.id] || []).length > 0
  );

  // Total selected options count
  const totalSelectedOptions = Object.values(selectedPerAttr).reduce((sum, ids) => sum + ids.length, 0);

  // Build option arrays for cartesian product
  const getOptionArrays = () => {
    return activeAttributes.map(attr => {
      const selectedIds = selectedPerAttr[attr.id] || [];
      return attr.options.filter(o => selectedIds.includes(o.id));
    });
  };

  // Get combination by index (base conversion)
  const getCombinationByIndex = (index: number, optionArrays: { id: string; name: string }[][]) => {
    const result: { id: string; name: string }[] = [];
    let remaining = index;
    for (let i = optionArrays.length - 1; i >= 0; i--) {
      const len = optionArrays[i].length;
      const idx = remaining % len;
      result.unshift(optionArrays[i][idx]);
      remaining = Math.floor(remaining / len);
    }
    return result;
  };

  // Generate a random barcode
  const randomBarcode = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${ts}-${rand}`;
  };

  // Generate combinations batch
  const generateBatch = useCallback(async (fromOffset: number, append: boolean) => {
    setGenerating(true);
    try {
      const optionArrays = getOptionArrays();
      if (optionArrays.length === 0) return;

      // Fetch fingerprints if not loaded
      let fps = existingFingerprints;
      if (!fingerprintsLoaded) {
        const fpData = await productsService.getCombinationFingerprints(productId);
        fps = new Set(fpData);
        setExistingFingerprints(fps);
        setFingerprintsLoaded(true);
      }

      // Total cartesian product size
      const totalCombinations = optionArrays.reduce((acc, arr) => acc * arr.length, 1);

      // Count new combinations (not existing)
      let existingCount = 0;
      for (let i = 0; i < totalCombinations; i++) {
        const opts = getCombinationByIndex(i, optionArrays);
        const fp = opts.map(o => o.id).sort().join(',');
        if (fps.has(fp)) existingCount++;
      }
      const totalNewCombos = totalCombinations - existingCount;
      setTotalNew(totalNewCombos);

      if (totalNewCombos === 0) {
        if (!append) {
          setGenerated([]);
          setSelected({});
        }
        setHasMore(false);
        setOffset(0);
        setStep(2);
        return;
      }

      // Skip to offset position among NEW combinations
      let skipped = 0;
      let scannedIndex = 0;
      while (skipped < fromOffset && scannedIndex < totalCombinations) {
        const opts = getCombinationByIndex(scannedIndex, optionArrays);
        const fp = opts.map(o => o.id).sort().join(',');
        if (!fps.has(fp)) skipped++;
        scannedIndex++;
      }

      // Generate BATCH_SIZE new combinations
      const batch: GeneratedCombo[] = [];
      let generatedCount = 0;
      while (generatedCount < BATCH_SIZE && scannedIndex < totalCombinations) {
        const opts = getCombinationByIndex(scannedIndex, optionArrays);
        const optionIds = opts.map(o => o.id);
        const fp = [...optionIds].sort().join(',');

        if (!fps.has(fp)) {
          const nameParts = opts.map(o => o.name);
          batch.push({
            id: `combo-${scannedIndex}`,
            index: scannedIndex,
            optionIds,
            fingerprint: fp,
            name: parentProduct.name,
            nameParts,
            barcode: randomBarcode(),
          });
          generatedCount++;
        }
        scannedIndex++;
      }

      if (append) {
        setGenerated(prev => [...prev, ...batch]);
        setSelected(prev => {
          const next = { ...prev };
          batch.forEach(c => { next[c.id] = true; });
          return next;
        });
      } else {
        setGenerated(batch);
        const initial: Record<string, boolean> = {};
        batch.forEach(c => { initial[c.id] = true; });
        setSelected(initial);
      }

      setOffset(fromOffset + generatedCount);
      setHasMore(fromOffset + generatedCount < totalNewCombos);
      setStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error generando combinaciones');
    } finally {
      setGenerating(false);
    }
  }, [activeAttributes, selectedPerAttr, existingFingerprints, fingerprintsLoaded, productId, parentProduct]);

  // Create selected combinations
  const handleCreate = async () => {
    const selectedCombos = generated.filter(c => selected[c.id]);
    if (selectedCombos.length === 0) {
      toast.error('Selecciona al menos una combinación');
      return;
    }

    setCreating(true);
    try {
      const result = await productsService.createCombinations(productId, {
        combinations: selectedCombos.map(c => ({
          name: c.name,
          barcode: c.barcode,
          price: parentProduct.price ?? 0,
          cost: parentProduct.cost ?? 0,
          attribute_option_ids: c.optionIds,
        })),
      });
      toast.success(`${result.created} combinación${result.created !== 1 ? 'es' : ''} creada${result.created !== 1 ? 's' : ''}`);
      onCreated();
      onOpenChange(false);
      resetPreview();
      setSelectedPerAttr({});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creando combinaciones');
    } finally {
      setCreating(false);
    }
  };

  // Toggle a single combination
  const toggleCombo = (comboId: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[comboId]) delete next[comboId];
      else next[comboId] = true;
      return next;
    });
  };

  // Select/deselect all visible
  const selectAllVisible = () => {
    const filtered = getFilteredCombinations();
    const allSelected = filtered.every(c => selected[c.id]);
    setSelected(prev => {
      const next = { ...prev };
      filtered.forEach(c => {
        if (allSelected) delete next[c.id];
        else next[c.id] = true;
      });
      return next;
    });
  };

  const getFilteredCombinations = () => {
    if (!searchTerm) return generated;
    const term = searchTerm.toLowerCase();
    return generated.filter(c =>
      c.nameParts.some(part => part.toLowerCase().includes(term)) ||
      c.name.toLowerCase().includes(term)
    );
  };

  const filteredCombinations = getFilteredCombinations();
  const selectedCount = Object.keys(selected).length;
  const hasSelections = activeAttributes.length >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Generar Combinaciones
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Selecciona las opciones que deseas combinar. Se crearán todos los cruces posibles entre ellas.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Option selection per attribute */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'}`}>1</div>
              <span className="text-sm font-semibold">Selecciona las opciones de cada atributo</span>
            </div>

            {assignedAttributes.map(attr => {
              const selectedIds = selectedPerAttr[attr.id] || [];
              const allSelected = attr.options.length > 0 && attr.options.every(o => selectedIds.includes(o.id));

              return (
                <div key={attr.id} className="border rounded-lg p-3 space-y-2 ml-8">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium text-sm">{attr.name}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleToggleAll(attr.id, attr.options)}
                    >
                      {allSelected ? 'Quitar todas' : 'Seleccionar todas'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {attr.options.map(opt => (
                      <Badge
                        key={opt.id}
                        variant={selectedIds.includes(opt.id) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs select-none transition-colors"
                        onClick={() => handleToggleOption(attr.id, opt.id)}
                      >
                        {opt.name}
                      </Badge>
                    ))}
                  </div>
                  {selectedIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">{selectedIds.length} de {attr.options.length} seleccionada{selectedIds.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
              );
            })}

            {/* Generate button */}
            {hasSelections && (
              <div className="ml-8">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => generateBatch(0, false)}
                  disabled={generating || !hasSelections}
                  className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Previsualizar combinaciones ({totalSelectedOptions} opcion{totalSelectedOptions !== 1 ? 'es' : ''} seleccionada{totalSelectedOptions !== 1 ? 's' : ''})
                </Button>
              </div>
            )}

            {!hasSelections && (
              <div className="ml-8 flex items-center gap-2 text-sm text-muted-foreground p-3 border border-dashed rounded-lg">
                <Info className="h-4 w-4 flex-shrink-0" />
                Haz clic en las opciones de arriba para comenzar. Por ejemplo, selecciona varios colores y varias tallas para generar todas las combinaciones.
              </div>
            )}
          </div>

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold bg-orange-600 text-white">2</div>
                <span className="text-sm font-semibold">Revisa y confirma</span>
              </div>

              {totalNew === 0 ? (
                <div className="ml-8 flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  Todas las combinaciones posibles ya existen. Selecciona otras opciones para generar nuevas.
                </div>
              ) : (
                <div className="ml-8 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {totalNew} combinación{totalNew !== 1 ? 'es' : ''} nueva{totalNew !== 1 ? 's' : ''} encontrada{totalNew !== 1 ? 's' : ''}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={selectAllVisible}
                    >
                      {filteredCombinations.every(c => selected[c.id]) ? 'Quitar todas' : 'Seleccionar todas'}
                    </Button>
                  </div>

                  {/* Search */}
                  {generated.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Filtrar combinaciones..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 h-8 text-sm"
                      />
                    </div>
                  )}

                  {/* Scrollable list */}
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {filteredCombinations.map(combo => (
                      <div
                        key={combo.id}
                        className={`flex items-center justify-between p-2 border rounded-lg transition-colors cursor-pointer ${
                          selected[combo.id]
                            ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30'
                            : 'hover:bg-muted/30'
                        }`}
                        onClick={() => toggleCombo(combo.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1">
                            {combo.nameParts.map((part, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{part}</Badge>
                            ))}
                          </div>
                        </div>
                        <Switch
                          checked={!!selected[combo.id]}
                          onCheckedChange={() => toggleCombo(combo.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Load more */}
                  {hasMore && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => generateBatch(offset, true)}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Cargar más ({offset} de {totalNew})
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700">
            <div className="text-sm text-muted-foreground">
              {selectedCount > 0 && (
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || selectedCount === 0}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Creando...
                  </>
                ) : selectedCount > 0 ? (
                  `Crear ${selectedCount} combinación${selectedCount !== 1 ? 'es' : ''}`
                ) : (
                  'Crear combinaciones'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
