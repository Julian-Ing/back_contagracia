'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Download,
  FileText,
  Image,
  File,
  Upload,
  X,
  Archive,
  Link2,
  ArrowLeft,
  Settings,
  Building2,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Select } from '@/shared/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';

import { useAuthStore } from '@/modules/auth';
import {
  documentsService,
  documentCategoriesService,
  condominiumsService,
  mediaService,
} from '@/modules/ph';
import type { PhDocument, PhDocumentCategory, PhCondominium } from '@/modules/ph';


// ─── Constants ───

const ALLOWED_EXTENSIONS = '.pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DEFAULT_COLORS = [
  '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444',
  '#6B7280', '#EC4899', '#06B6D4', '#F97316', '#14B8A6',
];

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeIcon(mime: string | null | undefined) {
  if (!mime) return <File className="h-4 w-4" />;
  if (mime.startsWith('image/')) return <Image className="h-4 w-4 text-purple-500" />;
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
  if (mime.includes('word') || mime.includes('document')) return <FileText className="h-4 w-4 text-blue-500" />;
  if (mime.includes('sheet') || mime.includes('excel')) return <FileText className="h-4 w-4 text-green-500" />;
  return <File className="h-4 w-4" />;
}

const emptyDocForm = {
  name: '',
  description: '',
  category_id: '',
  external_url: '',
  notes: '',
};

const emptyCatForm = {
  name: '',
  description: '',
  color: '#3B82F6',
};

export default function DocumentosPage() {
  const companyId = useAuthStore((s) => s.company?.id);

  // ─── Data ───
  const [condominiums, setCondominiums] = useState<PhCondominium[]>([]);
  const [categories, setCategories] = useState<PhDocumentCategory[]>([]);
  const [documents, setDocuments] = useState<PhDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Navigation ───
  const [selectedCondominium, setSelectedCondominium] = useState<PhCondominium | null>(null);
  const [searchCondo, setSearchCondo] = useState('');
  const [searchDoc, setSearchDoc] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // ─── Document Dialogs ───
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PhDocument | null>(null);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Category Dialog ───
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<PhDocumentCategory | null>(null);
  const [catForm, setCatForm] = useState(emptyCatForm);
  const [savingCat, setSavingCat] = useState(false);

  // ─── Drag & Drop ───
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══════════════════ FETCH ═══════════════════

  const fetchCondominiums = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await condominiumsService.getAll(companyId, { take: 100 });
      setCondominiums(Array.isArray(res) ? res : res.data ?? []);
    } catch {
      // silent
    }
  }, [companyId]);

  const fetchCategories = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await documentCategoriesService.getAll(companyId, { is_active: true });
      let data = Array.isArray(res) ? res : res.data ?? [];
      if (data.length === 0) {
        const seedRes = await documentCategoriesService.seedDefaults(companyId);
        if (seedRes.data) data = seedRes.data;
        else {
          const re = await documentCategoriesService.getAll(companyId, { is_active: true });
          data = Array.isArray(re) ? re : re.data ?? [];
        }
      }
      setCategories(data);
    } catch {
      // silent
    }
  }, [companyId]);

  const fetchDocuments = useCallback(async (condoId?: string) => {
    if (!companyId) return;
    try {
      setLoading(true);
      if (condoId) {
        const res = await documentsService.getByCondominium(companyId, condoId);
        setDocuments(Array.isArray(res) ? res : res.data ?? []);
      } else {
        const res = await documentsService.getAll(companyId, { take: 500 });
        setDocuments(Array.isArray(res) ? res : res.data ?? []);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCondominiums();
    fetchCategories();
    fetchDocuments();
  }, [fetchCondominiums, fetchCategories, fetchDocuments]);

  // Load docs for selected condominium
  useEffect(() => {
    if (selectedCondominium) {
      fetchDocuments(selectedCondominium.id);
    }
  }, [selectedCondominium, fetchDocuments]);

  // ─── Doc counts per condominium ───
  const docCountByCondo = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of documents) {
      counts[d.condominium_id] = (counts[d.condominium_id] || 0) + 1;
    }
    return counts;
  }, [documents]);

  // ─── Filtered condos ───
  const filteredCondos = useMemo(() => {
    if (!searchCondo) return condominiums;
    const q = searchCondo.toLowerCase();
    return condominiums.filter((c) =>
      c.name.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q),
    );
  }, [condominiums, searchCondo]);

  // ─── Filtered docs (in gallery) ───
  const filteredDocs = useMemo(() => {
    if (!searchDoc) return documents;
    const q = searchDoc.toLowerCase();
    return documents.filter((d) => d.name.toLowerCase().includes(q));
  }, [documents, searchDoc]);

  // ─── Docs grouped by category ───
  const docsByCategory = useMemo(() => {
    const map = new Map<string, PhDocument[]>();
    const uncategorized: PhDocument[] = [];
    for (const doc of filteredDocs) {
      if (doc.category_id) {
        const arr = map.get(doc.category_id) || [];
        arr.push(doc);
        map.set(doc.category_id, arr);
      } else {
        uncategorized.push(doc);
      }
    }
    return { map, uncategorized };
  }, [filteredDocs]);

  // ═══════════════════ FILE HANDLING ═══════════════════

  const validateFile = (file: globalThis.File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo excede 10MB');
      return false;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.split(',').includes(ext)) {
      toast.error(`Tipo de archivo no permitido: ${ext}`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: globalThis.File) => {
    if (validateFile(file)) setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const uploadToMedia = async (file: globalThis.File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', 'ph_document');
    return mediaService.upload(fd) as Promise<{
      id: string; url: string; original_name: string; size: number; mime_type: string;
    }>;
  };

  // ═══════════════════ DOCUMENT HANDLERS ═══════════════════

  const handleCreateDoc = async () => {
    if (!companyId || !selectedCondominium) return;
    try {
      setSubmitting(true);
      let fileData: Record<string, unknown> = {};
      if (selectedFile) {
        const media = await uploadToMedia(selectedFile);
        fileData = { file_url: media.url, file_name: media.original_name, file_size: media.size, mime_type: media.mime_type };
      }
      await documentsService.create(companyId, {
        condominium_id: selectedCondominium.id,
        name: docForm.name,
        category_id: docForm.category_id || undefined,
        description: docForm.description || undefined,
        external_url: docForm.external_url || undefined,
        notes: docForm.notes || undefined,
        ...fileData,
      });
      toast.success('Documento creado exitosamente');
      setIsCreateOpen(false);
      setDocForm(emptyDocForm);
      setSelectedFile(null);
      await fetchDocuments(selectedCondominium.id);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear documento');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDoc = (doc: PhDocument) => {
    setSelectedDoc(doc);
    setDocForm({
      name: doc.name,
      description: doc.description || '',
      category_id: doc.category_id || '',
      external_url: doc.external_url || '',
      notes: doc.notes || '',
    });
    setSelectedFile(null);
    setIsEditOpen(true);
  };

  const handleUpdateDoc = async () => {
    if (!companyId || !selectedDoc || !selectedCondominium) return;
    try {
      setSubmitting(true);
      let fileData: Record<string, unknown> = {};
      if (selectedFile) {
        const media = await uploadToMedia(selectedFile);
        fileData = { file_url: media.url, file_name: media.original_name, file_size: media.size, mime_type: media.mime_type };
      }
      await documentsService.update(companyId, selectedDoc.id, {
        name: docForm.name,
        category_id: docForm.category_id || undefined,
        description: docForm.description || undefined,
        external_url: docForm.external_url || undefined,
        notes: docForm.notes || undefined,
        ...fileData,
      });
      toast.success('Documento actualizado');
      setIsEditOpen(false);
      setSelectedDoc(null);
      setDocForm(emptyDocForm);
      setSelectedFile(null);
      await fetchDocuments(selectedCondominium.id);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoc = async () => {
    if (!companyId || !selectedDoc) return;
    try {
      setSubmitting(true);
      await documentsService.remove(companyId, selectedDoc.id);
      toast.success('Documento eliminado');
      setIsDeleteOpen(false);
      setSelectedDoc(null);
      if (selectedCondominium) await fetchDocuments(selectedCondominium.id);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (doc: PhDocument) => {
    if (!companyId) return;
    const newStatus = doc.status === 'active' ? 'archived' : 'active';
    try {
      await documentsService.update(companyId, doc.id, { status: newStatus });
      toast.success(newStatus === 'archived' ? 'Documento archivado' : 'Documento restaurado');
      setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, status: newStatus } : d));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado');
    }
  };

  // ═══════════════════ CATEGORY HANDLERS ═══════════════════

  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm(emptyCatForm);
  };

  const openEditCat = (cat: PhDocumentCategory) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description || '', color: cat.color || '#3B82F6' });
  };

  const handleSaveCat = async () => {
    if (!companyId) return;
    try {
      setSavingCat(true);
      if (editingCat) {
        await documentCategoriesService.update(companyId, editingCat.id, {
          name: catForm.name,
          description: catForm.description || undefined,
          color: catForm.color || undefined,
        });
        toast.success('Categoria actualizada');
      } else {
        await documentCategoriesService.create(companyId, {
          name: catForm.name,
          description: catForm.description || undefined,
          color: catForm.color || undefined,
        });
        toast.success('Categoria creada');
      }
      setEditingCat(null);
      setCatForm(emptyCatForm);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar categoria');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async (cat: PhDocumentCategory) => {
    if (!companyId) return;
    try {
      await documentCategoriesService.remove(companyId, cat.id);
      toast.success('Categoria eliminada');
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar');
    }
  };

  // ─── Toggle category collapse ───
  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // ═══════════════════ FORM FIELDS ═══════════════════

  const renderDocFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre del documento *</Label>
          <Input
            value={docForm.name}
            onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
            placeholder="Ej: Reglamento de P.H. 2026"
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={docForm.category_id}
            onChange={(v) => setDocForm({ ...docForm, category_id: v })}
            placeholder="Seleccionar categoria"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descripcion</Label>
        <Input
          value={docForm.description}
          onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
          placeholder="Descripcion breve (opcional)"
        />
      </div>

      {/* File upload zone */}
      <div className="space-y-2">
        <Label>Archivo {isEditOpen && selectedDoc?.file_url ? '(reemplazar)' : ''}</Label>
        {selectedFile ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            {getMimeIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-slate-800/30'
            }`}
          >
            <Upload className="h-6 w-6 text-gray-400 dark:text-slate-500" />
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Arrastra un archivo o <span className="text-blue-600 dark:text-blue-400 font-medium">haz clic para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">PDF, DOCX, XLSX, PNG, JPG — Max 10MB</p>
            {isEditOpen && selectedDoc?.file_url && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Ya tiene archivo: {selectedDoc.file_name || 'archivo adjunto'}</p>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Enlace externo (Google Drive, OneDrive, etc.)</Label>
        <Input
          value={docForm.external_url}
          onChange={(e) => setDocForm({ ...docForm, external_url: e.target.value })}
          placeholder="https://drive.google.com/..."
        />
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input
          value={docForm.notes}
          onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
          placeholder="Notas adicionales (opcional)"
        />
      </div>
    </div>
  );

  const isDocFormValid = docForm.name.trim();

  // ═══════════════════ DOC ROW ═══════════════════

  const renderDocRow = (doc: PhDocument) => (
    <TableRow key={doc.id} className={`border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 ${doc.status === 'archived' ? 'opacity-60' : ''}`}>
      <TableCell>
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{doc.name}</span>
          {doc.description && (
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[250px]">{doc.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {doc.file_url && (
            <span className="flex items-center gap-1" title={doc.file_name || 'Archivo'}>
              {getMimeIcon(doc.mime_type)}
            </span>
          )}
          {doc.external_url && (
            <span title="Enlace externo"><Link2 className="h-4 w-4 text-cyan-500" /></span>
          )}
          {!doc.file_url && !doc.external_url && (
            <span className="text-xs text-gray-400">Solo metadatos</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-gray-600 dark:text-slate-400">{formatFileSize(doc.file_size)}</TableCell>
      <TableCell className="text-gray-600 dark:text-slate-400">{formatDate(doc.created_at)}</TableCell>
      <TableCell>
        <Badge className={doc.status === 'active'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }>
          {doc.status === 'active' ? 'Activo' : 'Archivado'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDoc(doc)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </DropdownMenuItem>
            {doc.file_url && (
              <DropdownMenuItem onClick={async () => {
                try {
                  await mediaService.download(doc.file_url!, doc.file_name || doc.name);
                } catch {
                  toast.error('Error al descargar el archivo');
                }
              }}>
                <Download className="h-4 w-4 mr-2" /> Descargar
              </DropdownMenuItem>
            )}
            {doc.external_url && (
              <DropdownMenuItem onClick={() => window.open(doc.external_url!, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir enlace
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleToggleArchive(doc)}>
              <Archive className="h-4 w-4 mr-2" />
              {doc.status === 'active' ? 'Archivar' : 'Restaurar'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setSelectedDoc(doc); setIsDeleteOpen(true); }} className="text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  // ═══════════════════ CATEGORY GROUP ═══════════════════

  const renderCategoryGroup = (cat: PhDocumentCategory, docs: PhDocument[]) => {
    const isCollapsed = collapsedCategories.has(cat.id);
    return (
      <Card key={cat.id} className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader
          className="py-3 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
          onClick={() => toggleCategoryCollapse(cat.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCollapsed
                ? <ChevronRight className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />
              }
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || '#6B7280' }}
              />
              <span className="font-semibold text-gray-900 dark:text-white">{cat.name}</span>
              <Badge variant="secondary" className="text-xs">{docs.length}</Badge>
            </div>
          </div>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="p-0 border-t border-gray-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tamano</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Fecha</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map(renderDocRow)}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    );
  };

  // ═══════════════════ LOADING ═══════════════════

  if (loading && condominiums.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════ RENDER ═══════════════════

  return (
    <div className="p-6 space-y-6">

      {/* ═══ LANDING VIEW ═══ */}
      {!selectedCondominium && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Espacio Documental</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Selecciona una copropiedad para ver sus documentos
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsCatDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Gestionar Categorias
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchCondo}
              onChange={(e) => setSearchCondo(e.target.value)}
              placeholder="Buscar copropiedad..."
              className="pl-10"
            />
          </div>

          {/* Condo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCondos.map((condo) => (
              <Card
                key={condo.id}
                className="cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
                onClick={() => {
                  setSelectedCondominium(condo);
                  setSearchDoc('');
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{condo.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{condo.address || 'Sin direccion'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-slate-400">
                          {docCountByCondo[condo.id] || 0} documentos
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredCondos.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 dark:text-slate-400">
                {condominiums.length === 0
                  ? 'No hay copropiedades registradas'
                  : 'No se encontraron copropiedades con ese nombre'}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ GALLERY VIEW ═══ */}
      {selectedCondominium && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCondominium(null);
                  fetchDocuments();
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCondominium.name}</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {selectedCondominium.address || 'Sin direccion'} — {filteredDocs.length} documentos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsCatDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Categorias
              </Button>
              <Button onClick={() => { setDocForm(emptyDocForm); setSelectedFile(null); setIsCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Documento
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchDoc}
              onChange={(e) => setSearchDoc(e.target.value)}
              placeholder="Buscar documento..."
              className="pl-10"
            />
          </div>

          {/* Documents by category */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => {
                const catDocs = docsByCategory.map.get(cat.id) || [];
                if (catDocs.length === 0) return null;
                return renderCategoryGroup(cat, catDocs);
              })}

              {/* Uncategorized */}
              {docsByCategory.uncategorized.length > 0 && (
                renderCategoryGroup(
                  { id: '__uncategorized', company_id: '', name: 'Sin categoria', slug: '', color: '#9CA3AF', sort_order: 999, is_active: true, created_at: '', updated_at: '' },
                  docsByCategory.uncategorized,
                )
              )}

              {/* Empty state */}
              {filteredDocs.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">No hay documentos</p>
                  <p className="text-sm mt-1">Sube el primer documento para esta copropiedad</p>
                  <Button
                    className="mt-4"
                    onClick={() => { setDocForm(emptyDocForm); setSelectedFile(null); setIsCreateOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Nuevo Documento
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Create Document */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Documento</DialogTitle></DialogHeader>
          {renderDocFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateDoc} disabled={submitting || !isDocFormValid}>
              {submitting ? 'Creando...' : 'Crear Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Documento</DialogTitle></DialogHeader>
          {renderDocFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateDoc} disabled={submitting || !isDocFormValid}>
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Documento</DialogTitle></DialogHeader>
          <p className="text-gray-600 dark:text-slate-400">
            ¿Estas seguro de que deseas eliminar el documento <strong>{selectedDoc?.name}</strong>?
          </p>
          {selectedDoc?.file_url && (
            <p className="text-sm text-amber-600 dark:text-amber-400">El archivo adjunto tambien sera eliminado.</p>
          )}
          <p className="text-sm text-gray-500 dark:text-slate-500">Esta accion no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteDoc} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CATEGORIES MANAGEMENT ═══ */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Categorias de Documentos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category list */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700">
                    <TableHead className="text-gray-600 dark:text-slate-300">Color</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">Descripcion</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300 text-center">Documentos</TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id} className="border-gray-200 dark:border-slate-700">
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-600"
                          style={{ backgroundColor: cat.color || '#6B7280' }}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">{cat.name}</TableCell>
                      <TableCell className="text-gray-500 dark:text-slate-400 text-sm">{cat.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{cat._count?.documents ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditCat(cat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCat(cat)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500 dark:text-slate-400">
                        No hay categorias. Crea la primera.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Add/Edit form */}
            <Card className="bg-gray-50 dark:bg-slate-800/30 border-gray-200 dark:border-slate-700">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  {editingCat ? `Editar: ${editingCat.name}` : 'Nueva Categoria'}
                </h4>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre *</Label>
                    <Input
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      placeholder="Ej: Acta de reunion"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descripcion</Label>
                    <Input
                      value={catForm.description}
                      onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                      placeholder="Opcional"
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <div className="flex gap-1">
                        {DEFAULT_COLORS.slice(0, 5).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCatForm({ ...catForm, color: c })}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${catForm.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  {editingCat && (
                    <Button variant="ghost" size="sm" onClick={() => { setEditingCat(null); setCatForm(emptyCatForm); }}>
                      Cancelar
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSaveCat} disabled={savingCat || !catForm.name.trim()}>
                    {savingCat ? 'Guardando...' : editingCat ? 'Actualizar' : 'Crear Categoria'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
