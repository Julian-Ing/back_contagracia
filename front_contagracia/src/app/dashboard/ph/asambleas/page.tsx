'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Square,
  XCircle,
  QrCode,
  UserCheck,
  Vote,
  Download,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Users,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Select } from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Progress } from '@/shared/components/ui/progress';
import { Textarea } from '@/shared/components/ui/textarea';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { TimePicker } from '@/shared/components/ui/time-picker';

import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useRealtime } from '@/shared/providers/RealtimeProvider';
import {
  assembliesService,
  condominiumsService,
  commonAreasService,
  unitsService,
  residentsService,
  type PhAssembly,
  type PhAssemblyAttendance,
  type PhAssemblyVote,
  type PhCondominium,
  type PhCommonArea,
  type PhUnit,
  type AttendanceStats,
  type VoteResults,
} from '@/modules/ph';

// ─── Helpers ────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  scheduled: { label: 'Programada', variant: 'secondary', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'En curso', variant: 'default', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completada', variant: 'outline', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelada', variant: 'destructive', color: 'bg-red-100 text-red-800' },
};

const TYPE_LABELS: Record<string, string> = {
  ordinary: 'Ordinaria',
  extraordinary: 'Extraordinaria',
};

const VOTE_OPTION_LABELS: Record<string, string> = {
  yes: 'Sí',
  no: 'No',
  abstain: 'Abstención',
};

// ─── Empty Forms ────────────────────────────────────────────

const emptyAssemblyForm = {
  condominium_id: '',
  title: '',
  description: '',
  assembly_date: '',
  start_time: '',
  end_time: '',
  location: '',
  assembly_type: 'ordinary',
  quorum_required: '',
  notes: '',
};

const emptyAttendanceForm = {
  tercero_id: '',
  unit_id: '',
  unit_label: '',
  resident_name: '',
  delegate_name: '',
  notes: '',
};

const emptyVoteForm = {
  title: '',
  description: '',
  vote_type: 'yes_no',
  options: ['', ''],
};

// ═════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════════

export default function AsambleasPage() {
  const companyId = useAuthStore((s) => s.company?.id);
  const { can } = usePermissions();
  const { subscribe } = useRealtime();
  const canManageAssemblies = can('ph.assemblies.create');
  const canManageAttendance = can('ph.assemblies.manage_attendance');
  const canManageVotes = can('ph.assemblies.manage_votes');
  const canExport = can('ph.assemblies.export');

  // ─── Resident data ─────────────────────────────────────────
  const [myUnits, setMyUnits] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId || canManageAssemblies) return; // Solo para residentes
    residentsService.getMyUnits(companyId)
      .then((data) => setMyUnits(Array.isArray(data) ? data : []))
      .catch(() => setMyUnits([]));
  }, [companyId, canManageAssemblies]);

  const myTerceroId = useMemo(() => myUnits[0]?.tercero_id || null, [myUnits]);
  const myTerceroName = useMemo(() => {
    const t = myUnits[0]?.tercero;
    return t ? t.name : null;
  }, [myUnits]);
  const myCondominiumIds = useMemo(
    () => new Set(myUnits.map((r: any) => r.unit?.condominium_id).filter(Boolean)),
    [myUnits],
  );
  const myIsOwner = useMemo(
    () => myUnits.some((r: any) => r.resident_type === 'owner'),
    [myUnits],
  );

  // ─── Data States ──────────────────────────────────────────
  const [assemblies, setAssemblies] = useState<PhAssembly[]>([]);
  const [condominiums, setCondominiums] = useState<PhCondominium[]>([]);
  const [commonAreas, setCommonAreas] = useState<PhCommonArea[]>([]);
  const [units, setUnits] = useState<PhUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ─── Navigation / Selection ───────────────────────────────
  const [selectedAssembly, setSelectedAssembly] = useState<PhAssembly | null>(null);
  const [activeTab, setActiveTab] = useState('asistencia');

  // ─── Filters ──────────────────────────────────────────────
  const [filterCondo, setFilterCondo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchText, setSearchText] = useState('');

  // ─── Assembly CRUD Dialogs ────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PhAssembly | null>(null);
  const [form, setForm] = useState(emptyAssemblyForm);

  // ─── QR Dialog ────────────────────────────────────────────
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrData, setQrData] = useState<{ qr_data_url: string; qr_code: string; title: string } | null>(null);

  // ─── Attendance ───────────────────────────────────────────
  const [attendances, setAttendances] = useState<PhAssemblyAttendance[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [attForm, setAttForm] = useState(emptyAttendanceForm);
  const [condoResidents, setCondoResidents] = useState<any[]>([]); // residentes de la copropiedad
  const [loadingCondoResidents, setLoadingCondoResidents] = useState(false);

  // ─── Votes ────────────────────────────────────────────────
  const [votes, setVotes] = useState<PhAssemblyVote[]>([]);
  const [isVoteCreateOpen, setIsVoteCreateOpen] = useState(false);
  const [voteForm, setVoteForm] = useState(emptyVoteForm);
  const [expandedVotes, setExpandedVotes] = useState<Set<string>>(new Set());
  const [voteResults, setVoteResults] = useState<Record<string, VoteResults>>({});
  const [myVotes, setMyVotes] = useState<Record<string, string>>({}); // voteId → selectedOption
  const [castingVote, setCastingVote] = useState<string | null>(null);

  // ─── Data Fetching ────────────────────────────────────────

  const fetchAssemblies = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await assembliesService.getAll(companyId, { take: 200 });
      setAssemblies(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cargar asambleas');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchCondominiums = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await condominiumsService.getAll(companyId, { take: 200 });
      setCondominiums(Array.isArray(res) ? res : res.data ?? []);
    } catch { /* silent */ }
  }, [companyId]);

  const fetchCommonAreas = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await commonAreasService.getAll(companyId, { take: 500 });
      setCommonAreas(Array.isArray(res) ? res : res.data ?? []);
    } catch { /* silent */ }
  }, [companyId]);

  const fetchUnits = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await unitsService.getAll(companyId, { take: 500 });
      setUnits(Array.isArray(res) ? res : res.data ?? []);
    } catch { /* silent */ }
  }, [companyId]);

  const fetchAssemblyDetail = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      const detail = await assembliesService.getOne(companyId, id);
      setSelectedAssembly(detail);
      setAttendances(detail.attendances || []);
      setVotes(detail.votes || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cargar detalle');
    }
  }, [companyId]);

  const fetchAttendanceStats = useCallback(async (assemblyId: string) => {
    if (!companyId) return;
    try {
      const stats = await assembliesService.getAttendanceStats(companyId, assemblyId);
      setAttendanceStats(stats);
    } catch { /* silent */ }
  }, [companyId]);

  const fetchCondoResidents = useCallback(async (condominiumId: string) => {
    if (!companyId || !condominiumId) return;
    try {
      setLoadingCondoResidents(true);
      const res = await residentsService.getAll(companyId, { condominium_id: condominiumId, take: 500, is_active: true });
      setCondoResidents(Array.isArray(res) ? res : res.data ?? []);
    } catch { setCondoResidents([]); }
    finally { setLoadingCondoResidents(false); }
  }, [companyId]);

  useEffect(() => {
    fetchAssemblies();
    fetchCondominiums();
    fetchCommonAreas();
    fetchUnits();
  }, [fetchAssemblies, fetchCondominiums, fetchCommonAreas, fetchUnits]);

  useEffect(() => {
    if (selectedAssembly) {
      fetchAttendanceStats(selectedAssembly.id);
    }
  }, [selectedAssembly, fetchAttendanceStats]);

  // ─── Real-time: auto-refresh on assembly notifications ────
  useEffect(() => {
    const unsub = subscribe('notifications:received', (data: any) => {
      const type = data?.notification?.type;
      if (type === 'ph_assembly_created' || type === 'ph_assembly_status_changed') {
        fetchAssemblies();
        if (selectedAssembly) {
          fetchAssemblyDetail(selectedAssembly.id);
        }
      }
      // Refresh vote results in real-time when someone votes
      if (type === 'ph_assembly_vote_cast' && selectedAssembly) {
        fetchAssemblyDetail(selectedAssembly.id);
      }
    });
    return () => unsub();
  }, [subscribe, fetchAssemblies, fetchAssemblyDetail, selectedAssembly]);

  // ─── Filtered Data ────────────────────────────────────────

  const filteredAssemblies = useMemo(() => {
    let result = assemblies;
    // Residente: solo asambleas de sus copropiedades
    if (!canManageAssemblies && myCondominiumIds.size > 0) {
      result = result.filter(a => myCondominiumIds.has(a.condominium_id));
    }
    if (filterCondo && filterCondo !== 'all') result = result.filter(a => a.condominium_id === filterCondo);
    if (filterStatus && filterStatus !== 'all') result = result.filter(a => a.status === filterStatus);
    if (filterType && filterType !== 'all') result = result.filter(a => a.assembly_type === filterType);
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(q));
    }
    return result;
  }, [assemblies, filterCondo, filterStatus, filterType, searchText, canManageAssemblies, myCondominiumIds]);

  const summary = useMemo(() => {
    const counts = { total: assemblies.length, scheduled: 0, in_progress: 0, completed: 0 };
    for (const a of assemblies) {
      if (a.status === 'scheduled') counts.scheduled++;
      else if (a.status === 'in_progress') counts.in_progress++;
      else if (a.status === 'completed') counts.completed++;
    }
    return counts;
  }, [assemblies]);

  // Agrupar residentes de la copropiedad por persona (tercero_id)
  const groupedCondoResidents = useMemo(() => {
    const map = new Map<string, { terceroId: string; name: string; isOwner: boolean; units: { id: string; label: string; residentId: string }[] }>();
    for (const r of condoResidents) {
      const tid = r.tercero_id;
      if (!tid) continue;
      if (!map.has(tid)) {
        const name = r.tercero?.name || r.resident_name || 'Sin nombre';
        map.set(tid, { terceroId: tid, name, isOwner: false, units: [] });
      }
      const group = map.get(tid)!;
      if (r.resident_type === 'owner') group.isOwner = true;
      group.units.push({
        id: r.unit_id,
        label: r.unit?.unit_number || r.unit_label || 'Sin unidad',
        residentId: r.id,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [condoResidents]);

  // Unidades del residente seleccionado en el form de asistencia
  const selectedResidentUnits = useMemo(() => {
    if (!attForm.tercero_id) return [];
    return groupedCondoResidents.find(g => g.terceroId === attForm.tercero_id)?.units || [];
  }, [attForm.tercero_id, groupedCondoResidents]);

  // Check if current resident has attendance (for gating vote)
  const myHasAttendance = useMemo(() => {
    if (!myTerceroId) return false;
    return attendances.some(a => a.tercero_id === myTerceroId);
  }, [attendances, myTerceroId]);

  // ─── Assembly CRUD Handlers ───────────────────────────────

  const handleCreate = async () => {
    if (!companyId) return;
    try {
      setSubmitting(true);
      await assembliesService.create(companyId, {
        ...form,
        quorum_required: form.quorum_required ? parseFloat(form.quorum_required.replace(',', '.')) : undefined,
      });
      toast.success('Asamblea creada');
      setIsCreateOpen(false);
      setForm(emptyAssemblyForm);
      await fetchAssemblies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!companyId || !selectedAssembly) return;
    try {
      setSubmitting(true);
      await assembliesService.update(companyId, selectedAssembly.id, {
        ...form,
        quorum_required: form.quorum_required ? parseFloat(form.quorum_required.replace(',', '.')) : undefined,
      });
      toast.success('Asamblea actualizada');
      setIsEditOpen(false);
      setForm(emptyAssemblyForm);
      await fetchAssemblies();
      if (selectedAssembly) await fetchAssemblyDetail(selectedAssembly.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId || !deleteTarget) return;
    try {
      setSubmitting(true);
      await assembliesService.remove(companyId, deleteTarget.id);
      toast.success('Asamblea eliminada');
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      // Si estábamos viendo el detalle de la asamblea eliminada, volver al listado
      if (selectedAssembly?.id === deleteTarget.id) {
        setSelectedAssembly(null);
      }
      await fetchAssemblies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!companyId || !selectedAssembly) return;
    try {
      const updated = await assembliesService.changeStatus(companyId, selectedAssembly.id, newStatus);
      toast.success(`Estado cambiado a ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setSelectedAssembly(updated);
      await fetchAssemblies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const openEdit = (assembly: PhAssembly) => {
    setSelectedAssembly(assembly);
    setForm({
      condominium_id: assembly.condominium_id,
      title: assembly.title,
      description: assembly.description || '',
      assembly_date: assembly.assembly_date ? assembly.assembly_date.split('T')[0] : '',
      start_time: assembly.start_time,
      end_time: assembly.end_time || '',
      location: assembly.location || '',
      assembly_type: assembly.assembly_type,
      quorum_required: assembly.quorum_required?.toString() || '',
      notes: assembly.notes || '',
    });
    setIsEditOpen(true);
  };

  const openDelete = (assembly: PhAssembly) => {
    setDeleteTarget(assembly);
    setIsDeleteOpen(true);
  };

  // ─── QR Handler ───────────────────────────────────────────

  const handleShowQr = async () => {
    if (!companyId || !selectedAssembly) return;
    try {
      const data = await assembliesService.getQrCode(companyId, selectedAssembly.id);
      setQrData(data);
      setIsQrOpen(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al generar QR');
    }
  };

  // ─── Attendance Handlers ──────────────────────────────────

  const handleRegisterAttendance = async () => {
    if (!companyId || !selectedAssembly) return;
    try {
      setSubmitting(true);
      await assembliesService.registerAttendance(companyId, selectedAssembly.id, attForm);
      toast.success('Asistencia registrada');
      setIsAttendanceOpen(false);
      setAttForm(emptyAttendanceForm);
      await fetchAssemblyDetail(selectedAssembly.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al registrar asistencia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAttendance = async (attId: string) => {
    if (!companyId || !selectedAssembly) return;
    try {
      await assembliesService.removeAttendance(companyId, selectedAssembly.id, attId);
      toast.success('Asistencia eliminada');
      await fetchAssemblyDetail(selectedAssembly.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error');
    }
  };

  const handleExportAttendance = async () => {
    if (!companyId || !selectedAssembly) return;
    try {
      const blob = await assembliesService.exportAttendanceExcel(companyId, selectedAssembly.id);
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `asistencia_${selectedAssembly.title.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Excel descargado');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al exportar');
    }
  };

  // ─── Vote Handlers ────────────────────────────────────────

  const handleCreateVote = async () => {
    if (!companyId || !selectedAssembly) return;
    try {
      setSubmitting(true);
      const payload: Record<string, unknown> = {
        title: voteForm.title,
        description: voteForm.description || undefined,
        vote_type: voteForm.vote_type,
      };
      if (voteForm.vote_type === 'multiple_choice') {
        payload.options = voteForm.options.filter(o => o.trim());
      }
      await assembliesService.createVote(companyId, selectedAssembly.id, payload);
      toast.success('Votación creada');
      setIsVoteCreateOpen(false);
      setVoteForm(emptyVoteForm);
      await fetchAssemblyDetail(selectedAssembly.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear votación');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVoteExpand = async (voteId: string) => {
    const newSet = new Set(expandedVotes);
    if (newSet.has(voteId)) {
      newSet.delete(voteId);
    } else {
      newSet.add(voteId);
      // Fetch results
      if (!voteResults[voteId] && companyId) {
        try {
          const results = await assembliesService.getVoteResults(companyId, voteId);
          setVoteResults(prev => ({ ...prev, [voteId]: results }));
        } catch { /* silent */ }
      }
    }
    setExpandedVotes(newSet);
  };

  const handleExportVotes = async () => {
    if (!companyId || !selectedAssembly) return;
    try {
      const blob = await assembliesService.exportVotesExcel(companyId, selectedAssembly.id);
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `votaciones_${selectedAssembly.title.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Excel descargado');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al exportar');
    }
  };

  // ─── Resident: auto-fetch results to detect prior votes ──
  useEffect(() => {
    if (!companyId || !myTerceroId || canManageVotes) return;
    if (!selectedAssembly || selectedAssembly.status !== 'in_progress') return;
    if (votes.length === 0) return;

    const fetchMyVotes = async () => {
      const found: Record<string, string> = {};
      for (const v of votes) {
        if (myVotes[v.id]) continue; // ya sabemos
        try {
          const results = await assembliesService.getVoteResults(companyId, v.id);
          setVoteResults(prev => ({ ...prev, [v.id]: results }));
          const myResult = results.vote?.results?.find(
            (r: any) => r.tercero_id === myTerceroId,
          );
          if (myResult) found[v.id] = myResult.selected_option;
        } catch { /* silent */ }
      }
      if (Object.keys(found).length > 0) {
        setMyVotes(prev => ({ ...prev, ...found }));
      }
    };
    fetchMyVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votes, companyId, myTerceroId, canManageVotes, selectedAssembly?.status]);

  // ─── Resident: cast vote handler ──────────────────────────
  const handleCastVote = async (voteId: string, selectedOption: string) => {
    if (!companyId || !myTerceroId || !selectedAssembly) return;
    try {
      setCastingVote(voteId);
      // Pick the unit matching the assembly's copropiedad
      const votingUnit = myUnits.find(
        (r: any) => r.unit?.condominium_id === selectedAssembly.condominium_id,
      ) || myUnits[0];
      await assembliesService.castVote(companyId, voteId, {
        selected_option: selectedOption,
        tercero_id: myTerceroId,
        unit_id: votingUnit?.unit_id,
        resident_name: myTerceroName,
        unit_label: votingUnit?.unit?.unit_number,
      });
      toast.success('Voto registrado exitosamente');
      setMyVotes(prev => ({ ...prev, [voteId]: selectedOption }));
      // Refresh detail to update vote count
      await fetchAssemblyDetail(selectedAssembly.id);
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('ya votó')) {
        toast.error('Ya emitiste tu voto en este tema');
        setMyVotes(prev => ({ ...prev, [voteId]: '?' }));
      } else {
        toast.error(msg || 'Error al votar');
      }
    } finally {
      setCastingVote(null);
    }
  };

  // ─── Form Validation ─────────────────────────────────────

  const isAssemblyFormValid = form.condominium_id && form.title && form.assembly_date && form.start_time;
  const isAttFormValid = attForm.tercero_id && attForm.unit_id;
  const isVoteFormValid = voteForm.title && (
    voteForm.vote_type === 'yes_no' ||
    (voteForm.vote_type === 'multiple_choice' && voteForm.options.filter(o => o.trim()).length >= 2)
  );

  // ─── Loading ──────────────────────────────────────────────

  if (loading && assemblies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═════════════════════════════════════════════════════════

  if (selectedAssembly) {
    const st = STATUS_CONFIG[selectedAssembly.status] || STATUS_CONFIG.scheduled;

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedAssembly(null); setVoteResults({}); setExpandedVotes(new Set()); setMyVotes({}); }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedAssembly.title}</h1>
              <p className="text-muted-foreground text-sm">
                {selectedAssembly.condominium?.name} &middot; {TYPE_LABELS[selectedAssembly.assembly_type] || selectedAssembly.assembly_type}
              </p>
            </div>
            <Badge className={st.color}>{st.label}</Badge>
          </div>
          {canManageAssemblies && (
            <div className="flex items-center gap-2">
              {selectedAssembly.status === 'scheduled' && (
                <Button size="sm" onClick={() => handleChangeStatus('in_progress')}>
                  <Play className="h-4 w-4 mr-1" /> Iniciar
                </Button>
              )}
              {selectedAssembly.status === 'in_progress' && (
                <Button size="sm" onClick={() => handleChangeStatus('completed')}>
                  <Square className="h-4 w-4 mr-1" /> Finalizar
                </Button>
              )}
              {(selectedAssembly.status === 'scheduled' || selectedAssembly.status === 'in_progress') && (
                <Button size="sm" variant="destructive" onClick={() => handleChangeStatus('cancelled')}>
                  <XCircle className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              )}
              {selectedAssembly.status === 'cancelled' && (
                <Button size="sm" variant="outline" onClick={() => handleChangeStatus('scheduled')}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reprogramar
                </Button>
              )}
              {selectedAssembly.status === 'completed' && (
                <Button size="sm" variant="outline" onClick={() => handleChangeStatus('in_progress')}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reabrir
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => openEdit(selectedAssembly)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" /> Fecha
              </div>
              <p className="font-medium">{formatDate(selectedAssembly.assembly_date)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" /> Horario
              </div>
              <p className="font-medium">
                {selectedAssembly.start_time}{selectedAssembly.end_time ? ` - ${selectedAssembly.end_time}` : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" /> Lugar
              </div>
              <p className="font-medium">{selectedAssembly.location || 'No especificado'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" /> Quórum
              </div>
              {attendanceStats ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-lg">{attendanceStats.quorum_percent}%</span>
                    <span className="text-xs text-muted-foreground">
                      {attendanceStats.owner_attendees ?? 0} de {attendanceStats.total_owners ?? attendanceStats.total_units} propietarios
                    </span>
                  </div>
                  <Progress value={Math.min(attendanceStats.quorum_percent, 100)} className="h-2" />
                  {attendanceStats.quorum_required ? (
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-muted-foreground">
                        Requerido: {attendanceStats.quorum_required}%
                        {attendanceStats.quorum_reached
                          ? <span className="text-green-600 ml-1 font-medium">Alcanzado</span>
                          : <span className="text-amber-600 ml-1 font-medium">No alcanzado</span>
                        }
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-1">
                    {attendanceStats.use_coefficients ? (
                      <p className="text-xs text-muted-foreground">
                        Coef. presentes: {attendanceStats.present_coefficient}% de {attendanceStats.total_coefficient}% total
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sin coeficientes (conteo simple)
                      </p>
                    )}
                  </div>
                  {attendanceStats.total_attendees > (attendanceStats.owner_attendees ?? 0) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      + {attendanceStats.total_attendees - (attendanceStats.owner_attendees ?? 0)} arrendatario(s) presente(s)
                    </p>
                  )}
                </div>
              ) : (
                <p className="font-medium">-</p>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedAssembly.description && (
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">{selectedAssembly.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="asistencia">
              <UserCheck className="h-4 w-4 mr-1" /> Asistencia ({attendances.length})
            </TabsTrigger>
            <TabsTrigger value="votaciones">
              <Vote className="h-4 w-4 mr-1" /> Votaciones ({votes.length})
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab Asistencia ─── */}
          <TabsContent value="asistencia" className="space-y-4">
            {canManageAttendance && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => { setAttForm(emptyAttendanceForm); if (selectedAssembly) fetchCondoResidents(selectedAssembly.condominium_id); setIsAttendanceOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Registrar Asistencia
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShowQr}>
                    <QrCode className="h-4 w-4 mr-1" /> Mostrar QR
                  </Button>
                </div>
                {attendances.length > 0 && canExport && (
                  <Button size="sm" variant="outline" onClick={handleExportAttendance}>
                    <Download className="h-4 w-4 mr-1" /> Exportar Excel
                  </Button>
                )}
              </div>
            )}

            {attendances.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay asistentes registrados
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Residente</TableHead>
                        <TableHead>Delegado</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Hora</TableHead>
                        {canManageAttendance && <TableHead className="w-[50px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((att, idx) => (
                        <TableRow key={att.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{att.unit_label || '-'}</TableCell>
                          <TableCell>{att.resident_name || '-'}</TableCell>
                          <TableCell>{att.delegate_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={att.method === 'qr' ? 'default' : 'secondary'}>
                              {att.method === 'qr' ? 'QR' : 'Manual'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(att.checked_in_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          {canManageAttendance && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 h-8 w-8 p-0"
                                onClick={() => handleRemoveAttendance(att.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── Tab Votaciones ─── */}
          <TabsContent value="votaciones" className="space-y-4">
            <div className="flex items-center justify-between">
              {canManageVotes && (
                <Button size="sm" onClick={() => { setVoteForm(emptyVoteForm); setIsVoteCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Nueva Votación
                </Button>
              )}
              {votes.length > 0 && canExport && (
                <Button size="sm" variant="outline" onClick={handleExportVotes}>
                  <Download className="h-4 w-4 mr-1" /> Exportar Excel
                </Button>
              )}
            </div>

            {votes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay temas de votación
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {votes.map((vote) => {
                  const isExpanded = expandedVotes.has(vote.id);
                  const results = voteResults[vote.id];

                  return (
                    <Card key={vote.id}>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-2 cursor-pointer flex-1"
                            onClick={() => toggleVoteExpand(vote.id)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div>
                              <p className="font-medium">{vote.title}</p>
                              {vote.description && (
                                <p className="text-xs text-muted-foreground">{vote.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {vote._count?.results || 0} votos
                            </Badge>
                          </div>
                        </div>

                        {/* Resident tenant: cannot vote */}
                        {!canManageVotes && selectedAssembly?.status === 'in_progress' && myTerceroId && !myIsOwner && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="h-4 w-4" />
                              <span>Solo los propietarios pueden votar en las asambleas.</span>
                            </div>
                          </div>
                        )}

                        {/* Resident owner: must have attendance to vote */}
                        {!canManageVotes && selectedAssembly?.status === 'in_progress' && myTerceroId && myIsOwner && !myVotes[vote.id] && !myHasAttendance && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              <span>Debes registrar tu asistencia antes de poder votar.</span>
                            </div>
                          </div>
                        )}

                        {/* Resident owner: voting UI (only if assembly in_progress, is owner, and has attendance) */}
                        {!canManageVotes && selectedAssembly?.status === 'in_progress' && myTerceroId && myIsOwner && !myVotes[vote.id] && myHasAttendance && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-3">Emitir tu voto:</p>
                            {vote.vote_type === 'yes_no' ? (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleCastVote(vote.id, 'yes')} disabled={!!castingVote}>
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> Sí
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleCastVote(vote.id, 'no')} disabled={!!castingVote}>
                                  <XCircle className="h-4 w-4 mr-1" /> No
                                </Button>
                                <Button size="sm" variant="outline" className="text-gray-600" onClick={() => handleCastVote(vote.id, 'abstain')} disabled={!!castingVote}>
                                  Abstención
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  try { return JSON.parse(vote.options || '[]') as string[]; } catch { return []; }
                                })().map((option) => (
                                  <Button key={option} size="sm" variant="outline" onClick={() => handleCastVote(vote.id, option)} disabled={!!castingVote}>
                                    {option}
                                  </Button>
                                ))}
                                <Button size="sm" variant="outline" className="text-gray-600" onClick={() => handleCastVote(vote.id, 'abstain')} disabled={!!castingVote}>
                                  Abstención
                                </Button>
                              </div>
                            )}
                            {castingVote === vote.id && (
                              <p className="text-xs text-muted-foreground mt-2">Registrando voto...</p>
                            )}
                          </div>
                        )}

                        {/* Resident: already voted indicator */}
                        {!canManageVotes && myVotes[vote.id] && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                Ya emitiste tu voto
                                {myVotes[vote.id] !== '?' && (
                                  <>: <strong>{VOTE_OPTION_LABELS[myVotes[vote.id]] || myVotes[vote.id]}</strong></>
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Expanded: Results */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t">
                            {!results ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                              </div>
                            ) : results.total_votes === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-2">Sin votos aún</p>
                            ) : (
                              <div className="space-y-3">
                                {Object.entries(results.summary).map(([option, count]) => {
                                  const pct = Math.round((count / results.total_votes) * 100);
                                  return (
                                    <div key={option}>
                                      <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="font-medium">
                                          {VOTE_OPTION_LABELS[option] || option}
                                        </span>
                                        <span>{count} ({pct}%)</span>
                                      </div>
                                      <Progress value={pct} className="h-3" />
                                    </div>
                                  );
                                })}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Total votos: {results.total_votes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ─── Dialogs for detail view ─── */}

        {/* QR Dialog */}
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Código QR - {qrData?.title}</DialogTitle>
            </DialogHeader>
            {qrData && (
              <div className="flex flex-col items-center gap-4 py-4">
                <img src={qrData.qr_data_url} alt="QR Code" className="w-64 h-64" />
                <p className="text-sm text-muted-foreground text-center">
                  Los residentes pueden escanear este código desde la APP para registrar su asistencia
                </p>
                <p className="text-xs font-mono text-muted-foreground">{qrData.qr_code}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Register Attendance Dialog */}
        <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Asistencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Residente *</Label>
                {loadingCondoResidents ? (
                  <p className="text-sm text-muted-foreground py-2">Cargando residentes...</p>
                ) : (
                  <Select
                    value={attForm.tercero_id}
                    onChange={(tid) => {
                      const person = groupedCondoResidents.find(g => g.terceroId === tid);
                      const firstUnit = person?.units[0];
                      setAttForm({
                        ...attForm,
                        tercero_id: tid,
                        resident_name: person?.name || '',
                        unit_id: person?.units.length === 1 ? firstUnit!.id : '',
                        unit_label: person?.units.length === 1 ? firstUnit!.label : '',
                      });
                    }}
                    placeholder="Seleccionar residente"
                    options={groupedCondoResidents.map(g => ({
                      value: g.terceroId,
                      label: `${g.name} (${g.isOwner ? 'Propietario' : 'Arrendatario'} - ${g.units.length} ${g.units.length === 1 ? 'unidad' : 'unidades'})`,
                    }))}
                  />
                )}
              </div>
              {attForm.tercero_id && selectedResidentUnits.length > 1 && (
                <div>
                  <Label>Unidad *</Label>
                  <Select
                    value={attForm.unit_id}
                    onChange={(uid) => {
                      const unit = selectedResidentUnits.find(u => u.id === uid);
                      setAttForm({ ...attForm, unit_id: uid, unit_label: unit?.label || '' });
                    }}
                    placeholder="Seleccionar unidad"
                    options={selectedResidentUnits.map(u => ({
                      value: u.id,
                      label: u.label,
                    }))}
                  />
                </div>
              )}
              {attForm.tercero_id && selectedResidentUnits.length === 1 && (
                <div>
                  <Label>Unidad</Label>
                  <Input value={selectedResidentUnits[0].label} disabled />
                </div>
              )}
              <div>
                <Label>Delegado/Apoderado (opcional)</Label>
                <Input
                  placeholder="Nombre del delegado"
                  value={attForm.delegate_name}
                  onChange={(e) => setAttForm({ ...attForm, delegate_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Observaciones"
                  value={attForm.notes}
                  onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAttendanceOpen(false)}>Cancelar</Button>
              <Button onClick={handleRegisterAttendance} disabled={submitting || !isAttFormValid}>
                {submitting ? 'Registrando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Vote Dialog */}
        <Dialog open={isVoteCreateOpen} onOpenChange={setIsVoteCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Votación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título del tema *</Label>
                <Input
                  placeholder="Ej: Aprobación del presupuesto 2026"
                  value={voteForm.title}
                  onChange={(e) => setVoteForm({ ...voteForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea
                  placeholder="Detalles del tema a votar"
                  value={voteForm.description}
                  onChange={(e) => setVoteForm({ ...voteForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo de votación</Label>
                <Select
                  value={voteForm.vote_type}
                  onChange={(val) => setVoteForm({ ...voteForm, vote_type: val })}
                  options={[
                    { value: 'yes_no', label: 'Sí / No / Abstención' },
                    { value: 'multiple_choice', label: 'Opción múltiple' },
                  ]}
                />
              </div>
              {voteForm.vote_type === 'multiple_choice' && (
                <div className="space-y-2">
                  <Label>Opciones</Label>
                  {voteForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Opción ${idx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...voteForm.options];
                          newOpts[idx] = e.target.value;
                          setVoteForm({ ...voteForm, options: newOpts });
                        }}
                      />
                      {voteForm.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 h-8 w-8 p-0"
                          onClick={() => {
                            const newOpts = voteForm.options.filter((_, i) => i !== idx);
                            setVoteForm({ ...voteForm, options: newOpts });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVoteForm({ ...voteForm, options: [...voteForm.options, ''] })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar opción
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVoteCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateVote} disabled={submitting || !isVoteFormValid}>
                {submitting ? 'Creando...' : 'Crear Votación'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Assembly Dialog (reused) */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Asamblea</DialogTitle>
            </DialogHeader>
            <AssemblyFormFields
              form={form}
              setForm={setForm}
              condominiums={condominiums}
              commonAreas={commonAreas}
              units={units}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdate} disabled={submitting || !isAssemblyFormValid}>
                {submitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // LIST VIEW
  // ═════════════════════════════════════════════════════════

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asambleas</h1>
          <p className="text-muted-foreground text-sm">
            {canManageAssemblies ? 'Gestión de asambleas, asistencia QR y votaciones' : 'Consulta asambleas y participa en votaciones'}
          </p>
        </div>
        {canManageAssemblies && (
          <Button onClick={() => { setForm(emptyAssemblyForm); setIsCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Asamblea
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Programadas</p>
            <p className="text-2xl font-bold text-blue-600">{summary.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">En curso</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.in_progress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Completadas</p>
            <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            className="pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select
          value={filterCondo}
          onChange={setFilterCondo}
          placeholder="Copropiedad"
          className="w-[200px]"
          options={[
            { value: 'all', label: 'Todas' },
            ...(canManageAssemblies
              ? condominiums
              : condominiums.filter(c => myCondominiumIds.has(c.id))
            ).map(c => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="Estado"
          className="w-[160px]"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'scheduled', label: 'Programada' },
            { value: 'in_progress', label: 'En curso' },
            { value: 'completed', label: 'Completada' },
            { value: 'cancelled', label: 'Cancelada' },
          ]}
        />
        <Select
          value={filterType}
          onChange={setFilterType}
          placeholder="Tipo"
          className="w-[160px]"
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'ordinary', label: 'Ordinaria' },
            { value: 'extraordinary', label: 'Extraordinaria' },
          ]}
        />
      </div>

      {/* Table */}
      {filteredAssemblies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {assemblies.length === 0
              ? (canManageAssemblies ? 'No hay asambleas registradas. Crea la primera.' : 'No hay asambleas registradas para tu copropiedad.')
              : 'No se encontraron asambleas con los filtros seleccionados.'
            }
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Copropiedad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Asistentes</TableHead>
                  <TableHead className="text-center">Votaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  {canManageAssemblies && <TableHead className="w-[50px] text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssemblies.map((assembly) => {
                  const s = STATUS_CONFIG[assembly.status] || STATUS_CONFIG.scheduled;
                  return (
                    <TableRow
                      key={assembly.id}
                      className="cursor-pointer"
                      onClick={() => fetchAssemblyDetail(assembly.id)}
                    >
                      <TableCell className="font-medium">{assembly.title}</TableCell>
                      <TableCell>{assembly.condominium?.name || '-'}</TableCell>
                      <TableCell>{formatDate(assembly.assembly_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TYPE_LABELS[assembly.assembly_type] || assembly.assembly_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{assembly._count?.attendances || 0}</TableCell>
                      <TableCell className="text-center">{assembly._count?.votes || 0}</TableCell>
                      <TableCell>
                        <Badge className={s.color}>{s.label}</Badge>
                      </TableCell>
                      {canManageAssemblies && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); fetchAssemblyDetail(assembly.id); }}>
                                <Eye className="h-4 w-4 mr-2" /> Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(assembly); }}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); openDelete(assembly); }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── List View Dialogs ─── */}

      {/* Create Assembly Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Asamblea</DialogTitle>
          </DialogHeader>
          <AssemblyFormFields
            form={form}
            setForm={setForm}
            condominiums={condominiums}
            commonAreas={commonAreas}
            units={units}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting || !isAssemblyFormValid}>
              {submitting ? 'Creando...' : 'Crear Asamblea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assembly Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Asamblea</DialogTitle>
          </DialogHeader>
          <AssemblyFormFields
            form={form}
            setForm={setForm}
            condominiums={condominiums}
            commonAreas={commonAreas}
            units={units}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={submitting || !isAssemblyFormValid}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Asamblea</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar <strong>{deleteTarget?.title}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SHARED FORM COMPONENT
// ═════════════════════════════════════════════════════════════

function AssemblyFormFields({
  form,
  setForm,
  condominiums,
  commonAreas,
  units,
}: {
  form: typeof emptyAssemblyForm;
  setForm: (f: typeof emptyAssemblyForm) => void;
  condominiums: PhCondominium[];
  commonAreas: PhCommonArea[];
  units: PhUnit[];
}) {
  // Filtrar áreas y unidades por la copropiedad seleccionada
  const locationOptions = useMemo(() => {
    const opts: { value: string; label: string; disabled?: boolean; disabledLabel?: string }[] = [];
    const filteredAreas = form.condominium_id
      ? commonAreas.filter(a => a.condominium_id === form.condominium_id)
      : commonAreas;
    const filteredUnits = form.condominium_id
      ? units.filter(u => u.condominium_id === form.condominium_id)
      : units;

    if (filteredAreas.length > 0) {
      opts.push({ value: '__header_areas__', label: '── Zonas Comunes ──', disabled: true });
      for (const a of filteredAreas) {
        opts.push({ value: a.name, label: a.name });
      }
    }
    if (filteredUnits.length > 0) {
      opts.push({ value: '__header_units__', label: '── Unidades ──', disabled: true });
      for (const u of filteredUnits) {
        const label = `Unidad ${u.unit_number}`;
        opts.push({ value: label, label });
      }
    }
    return opts;
  }, [form.condominium_id, commonAreas, units]);

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <Label>Copropiedad *</Label>
        <Select
          value={form.condominium_id}
          onChange={(val) => setForm({ ...form, condominium_id: val, location: '' })}
          placeholder="Seleccionar copropiedad"
          searchable
          options={condominiums.map(c => ({ value: c.id, label: c.name }))}
        />
      </div>
      <div>
        <Label>Título *</Label>
        <Input
          placeholder="Ej: Asamblea Ordinaria 2026"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea
          placeholder="Descripción de la asamblea"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha *</Label>
          <DatePicker
            value={form.assembly_date}
            onChange={(v) => setForm({ ...form, assembly_date: v })}
            placeholder="Seleccionar fecha"
            usePortal
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select
            value={form.assembly_type}
            onChange={(val) => setForm({ ...form, assembly_type: val })}
            options={[
              { value: 'ordinary', label: 'Ordinaria' },
              { value: 'extraordinary', label: 'Extraordinaria' },
            ]}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Hora inicio *</Label>
          <TimePicker
            value={form.start_time}
            onChange={(v) => setForm({ ...form, start_time: v })}
            placeholder="Hora inicio"
            usePortal
          />
        </div>
        <div>
          <Label>Hora fin</Label>
          <TimePicker
            value={form.end_time}
            onChange={(v) => setForm({ ...form, end_time: v })}
            placeholder="Hora fin"
            clearable
            usePortal
          />
        </div>
      </div>
      <div>
        <Label>Lugar</Label>
        <Select
          value={form.location}
          onChange={(val) => setForm({ ...form, location: val })}
          placeholder="Seleccionar zona común o unidad"
          searchable
          options={locationOptions}
        />
      </div>
      <div>
        <Label>Quórum requerido (%)</Label>
        <Input
          placeholder="Ej: 51 o 38,5"
          value={form.quorum_required}
          onChange={(e) => {
            // Permitir números, punto y coma
            const raw = e.target.value.replace(/[^0-9.,]/g, '');
            setForm({ ...form, quorum_required: raw });
          }}
        />
      </div>
      <div>
        <Label>Notas</Label>
        <Textarea
          placeholder="Notas adicionales"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
