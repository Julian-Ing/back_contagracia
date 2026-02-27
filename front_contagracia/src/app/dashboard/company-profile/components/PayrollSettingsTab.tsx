'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Save, DollarSign, Shield, Clock, Calendar,
  Truck, FileText, ChevronDown, Zap, Lock, Sun, Moon,
  Hash, ToggleLeft,
} from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Badge } from '@/shared/components/ui/badge';
import toast from 'react-hot-toast';
import { companySettingsService, type CompanySettingsGrouped, type BulkUpsertItem } from '@/modules/hr/services/company-settings.service';
import { cn } from '@/shared/lib/utils';

/* ───────── Helpers ───────── */
const formatCOP = (val: string) => {
  const n = Number(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('es-CO').format(n);
};

/* ───────── Section Component ───────── */
interface SectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, description, icon: Icon, accentColor, badge, expanded, onToggle, children }: SectionProps) {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string; ring: string }> = {
    blue:    { bg: 'bg-blue-50 dark:bg-blue-950/20',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-600 dark:text-blue-400',       iconBg: 'bg-blue-500',     ring: 'ring-blue-500/20' },
    green:   { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-950/20',   border: 'border-orange-200 dark:border-orange-800',   text: 'text-orange-600 dark:text-orange-400',   iconBg: 'bg-orange-500',   ring: 'ring-orange-500/20' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-950/20',   border: 'border-purple-200 dark:border-purple-800',   text: 'text-purple-600 dark:text-purple-400',   iconBg: 'bg-purple-500',   ring: 'ring-purple-500/20' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-950/20',   border: 'border-indigo-200 dark:border-indigo-800',   text: 'text-indigo-600 dark:text-indigo-400',   iconBg: 'bg-indigo-500',   ring: 'ring-indigo-500/20' },
    teal:    { bg: 'bg-teal-50 dark:bg-teal-950/20',       border: 'border-teal-200 dark:border-teal-800',       text: 'text-teal-600 dark:text-teal-400',       iconBg: 'bg-teal-500',     ring: 'ring-teal-500/20' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-950/20',       border: 'border-rose-200 dark:border-rose-800',       text: 'text-rose-600 dark:text-rose-400',       iconBg: 'bg-rose-500',     ring: 'ring-rose-500/20' },
  };
  const c = colorMap[accentColor] || colorMap.blue;

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      expanded ? cn(c.border, 'shadow-sm ring-1', c.ring) : 'border-gray-200 dark:border-gray-700/60',
    )}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors rounded-xl',
          expanded ? cn(c.bg) : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl shadow-sm', c.iconBg)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
              {badge && (
                <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0', c.text, c.border)}>
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-200',
          expanded && 'rotate-180',
        )} />
      </button>
      {expanded && (
        <div className="p-4 pt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

/* ───────── Field Components ───────── */
function CurrencyField({ label, value, onChange, readonly = false, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readonly?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
        {readonly && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <Lock className="w-3 h-3" /> Solo lectura
          </span>
        )}
      </div>
      <div className="relative group">
        <div className={cn(
          'absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l-lg border-r',
          readonly
            ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-400'
            : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-500 dark:text-indigo-400',
        )}>
          <DollarSign className="w-3.5 h-3.5" />
        </div>
        <Input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readonly}
          className={cn(
            'pl-12 pr-3 bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-sm font-mono tabular-nums',
            readonly && 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/40',
            !readonly && 'focus:border-indigo-400 focus:ring-indigo-400/20',
          )}
        />
        {value && !readonly && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono pointer-events-none">
            {formatCOP(value)} COP
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, icon: FieldIcon, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  icon?: React.ElementType;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <div className="relative">
        {FieldIcon && (
          <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l-lg border-r bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 text-gray-400">
            <FieldIcon className="w-3.5 h-3.5" />
          </div>
        )}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-sm font-mono tabular-nums',
            'focus:border-indigo-400 focus:ring-indigo-400/20',
            FieldIcon ? 'pl-12' : 'pl-3',
            suffix ? 'pr-14' : 'pr-3',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function TimeField({ label, value, onChange, icon: FieldIcon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <div className="relative">
        {FieldIcon && (
          <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l-lg border-r bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 text-gray-400">
            <FieldIcon className="w-3.5 h-3.5" />
          </div>
        )}
        <Input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-sm font-mono',
            'focus:border-indigo-400 focus:ring-indigo-400/20',
            FieldIcon ? 'pl-12' : 'pl-3',
          )}
        />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, icon: FieldIcon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <div className="relative">
        {FieldIcon && (
          <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l-lg border-r bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 text-gray-400">
            <FieldIcon className="w-3.5 h-3.5" />
          </div>
        )}
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-sm',
            'focus:border-indigo-400 focus:ring-indigo-400/20',
            FieldIcon ? 'pl-12' : 'pl-3',
          )}
        />
      </div>
    </div>
  );
}

function SwitchField({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700/50">
          <ToggleLeft className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
          {description && <p className="text-[10px] text-gray-400">{description}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ───────── Stats Cards ───────── */
function StatsBar({ smlv, auxTransporte }: { smlv: string; auxTransporte: string }) {
  const stats = [
    { label: 'SMLV 2025', value: formatCOP(smlv), prefix: '$', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
    { label: 'Aux. Transporte', value: formatCOP(auxTransporte), prefix: '$', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={cn('p-3.5 rounded-xl border', s.bg, s.border)}>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
          <p className={cn('text-lg font-bold font-mono tabular-nums', s.color)}>
            {s.prefix}{s.value} <span className="text-xs font-normal text-gray-400">COP</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/* ───────── Main Component ───────── */
export function PayrollSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettingsGrouped>({});
  const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    legal_params: true,
    social_security: false,
    overtime: false,
    work_schedule: false,
    work_hours: false,
    transportation: false,
    payroll_numbering: false,
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await companySettingsService.getAll();
      setSettings(data);

      const local: Record<string, Record<string, string>> = {};
      for (const [category, keys] of Object.entries(data)) {
        local[category] = {};
        for (const [key, info] of Object.entries(keys)) {
          local[category][key] = info.raw_value;
        }
      }
      setLocalValues(local);
    } catch {
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateLocal = (category: string, key: string, value: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const getLocal = (category: string, key: string): string => {
    return localValues[category]?.[key] ?? '';
  };

  const isReadonly = (category: string, key: string): boolean => {
    return settings[category]?.[key]?.is_readonly ?? false;
  };

  const changedCount = useMemo(() => {
    let count = 0;
    for (const [category, keys] of Object.entries(localValues)) {
      for (const [key, value] of Object.entries(keys)) {
        const original = settings[category]?.[key]?.raw_value;
        if (original !== undefined && original !== value) {
          count++;
        }
      }
    }
    return count;
  }, [localValues, settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const items: BulkUpsertItem[] = [];
      for (const [category, keys] of Object.entries(localValues)) {
        for (const [key, value] of Object.entries(keys)) {
          items.push({ category, key, value });
        }
      }
      await companySettingsService.bulkUpsert(items);
      toast.success('Configuraciones guardadas correctamente');
      fetchSettings();
    } catch {
      toast.error('Error al guardar configuraciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        <p className="text-xs text-gray-400">Cargando configuraci&oacute;n...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats resumen */}
      <StatsBar
        smlv={getLocal('legal_params', 'smlv')}
        auxTransporte={getLocal('legal_params', 'transportation_allowance')}
      />

      {/* Secciones */}
      <div className="space-y-2.5">
        {/* Parámetros Legales */}
        <Section
          title="Parámetros Legales"
          description="Salario mínimo y auxilio de transporte vigentes"
          icon={DollarSign}
          accentColor="blue"
          badge="Base Legal"
          expanded={expandedSections.legal_params}
          onToggle={() => toggleSection('legal_params')}
        >
          <CurrencyField
            label="Salario Mínimo (SMLV)"
            value={getLocal('legal_params', 'smlv')}
            onChange={(v) => updateLocal('legal_params', 'smlv', v)}
            hint="Salario mínimo legal mensual vigente"
          />
          <CurrencyField
            label="Auxilio de Transporte"
            value={getLocal('legal_params', 'transportation_allowance')}
            onChange={(v) => updateLocal('legal_params', 'transportation_allowance', v)}
            hint="Aplica a salarios hasta 2 SMLV"
          />
        </Section>

        {/* Seguridad Social */}
        <Section
          title="Seguridad Social"
          description="Fondo de Solidaridad Pensional y exoneración de aportes"
          icon={Shield}
          accentColor="green"
          expanded={expandedSections.social_security}
          onToggle={() => toggleSection('social_security')}
        >
          <NumberField
            label="Umbral FSP"
            value={getLocal('social_security', 'fsp_threshold_smmlv')}
            onChange={(v) => updateLocal('social_security', 'fsp_threshold_smmlv', v)}
            suffix="SMMLV"
            hint="Salarios >= este umbral aportan al FSP"
          />
          <NumberField
            label="Umbral Exoneración"
            value={getLocal('social_security', 'exoneration_threshold_smmlv')}
            onChange={(v) => updateLocal('social_security', 'exoneration_threshold_smmlv', v)}
            suffix="SMMLV"
            hint="Ley 1607/2012 - Exoneración SENA, ICBF, Salud"
          />
          <SwitchField
            label="Exoneración Habilitada"
            description="Aplica exoneración de aportes parafiscales"
            checked={getLocal('social_security', 'exoneration_enabled') === 'true'}
            onChange={(checked) => updateLocal('social_security', 'exoneration_enabled', String(checked))}
          />
        </Section>

        {/* Horas Extra */}
        <Section
          title="Horas Extra"
          description="Límites máximos permitidos de horas extra"
          icon={Zap}
          accentColor="orange"
          expanded={expandedSections.overtime}
          onToggle={() => toggleSection('overtime')}
        >
          <NumberField
            label="Máximo Diario"
            value={getLocal('overtime', 'max_overtime_daily')}
            onChange={(v) => updateLocal('overtime', 'max_overtime_daily', v)}
            suffix="horas"
            icon={Clock}
            hint="Límite de horas extra por día"
          />
          <NumberField
            label="Máximo Semanal"
            value={getLocal('overtime', 'max_overtime_weekly')}
            onChange={(v) => updateLocal('overtime', 'max_overtime_weekly', v)}
            suffix="horas"
            icon={Clock}
            hint="Límite de horas extra por semana"
          />
        </Section>

        {/* Jornada Laboral */}
        <Section
          title="Jornada Laboral"
          description="Configuración de horas, días y semana laboral"
          icon={Calendar}
          accentColor="purple"
          expanded={expandedSections.work_schedule}
          onToggle={() => toggleSection('work_schedule')}
        >
          <NumberField
            label="Horas por Día"
            value={getLocal('work_schedule', 'work_hours_per_day')}
            onChange={(v) => updateLocal('work_schedule', 'work_hours_per_day', v)}
            suffix="hrs"
            icon={Clock}
          />
          <NumberField
            label="Días por Mes"
            value={getLocal('work_schedule', 'work_days_per_month')}
            onChange={(v) => updateLocal('work_schedule', 'work_days_per_month', v)}
            suffix="días"
            icon={Calendar}
          />
          <NumberField
            label="Inicio de Semana"
            value={getLocal('work_schedule', 'week_start')}
            onChange={(v) => updateLocal('work_schedule', 'week_start', v)}
            hint="1 = Lunes, 7 = Domingo"
          />
          <NumberField
            label="Fin de Semana"
            value={getLocal('work_schedule', 'week_end')}
            onChange={(v) => updateLocal('work_schedule', 'week_end', v)}
            hint="5 = Viernes, 6 = Sábado"
          />
        </Section>

        {/* Horarios */}
        <Section
          title="Horarios"
          description="Definición de jornada diurna, nocturna y límites legales"
          icon={Clock}
          accentColor="indigo"
          expanded={expandedSections.work_hours}
          onToggle={() => toggleSection('work_hours')}
        >
          <TimeField
            label="Inicio Jornada Diurna"
            value={getLocal('work_hours', 'day_start')}
            onChange={(v) => updateLocal('work_hours', 'day_start', v)}
            icon={Sun}
          />
          <TimeField
            label="Fin Jornada Diurna"
            value={getLocal('work_hours', 'day_end')}
            onChange={(v) => updateLocal('work_hours', 'day_end', v)}
            icon={Sun}
          />
          <TimeField
            label="Inicio Jornada Nocturna"
            value={getLocal('work_hours', 'night_start')}
            onChange={(v) => updateLocal('work_hours', 'night_start', v)}
            icon={Moon}
          />
          <TimeField
            label="Fin Jornada Nocturna"
            value={getLocal('work_hours', 'night_end')}
            onChange={(v) => updateLocal('work_hours', 'night_end', v)}
            icon={Moon}
          />
          <NumberField
            label="Máx. Horas Diarias"
            value={getLocal('work_hours', 'max_daily_hours_legal')}
            onChange={(v) => updateLocal('work_hours', 'max_daily_hours_legal', v)}
            suffix="hrs"
            hint="Límite legal Art. 161 CST"
          />
          <NumberField
            label="Máx. Horas Semanales"
            value={getLocal('work_hours', 'max_weekly_hours_legal')}
            onChange={(v) => updateLocal('work_hours', 'max_weekly_hours_legal', v)}
            suffix="hrs"
            hint="Jornada máxima semanal (Ley 2101/2021)"
          />
          <NumberField
            label="Edad Mínima Nocturno"
            value={getLocal('work_hours', 'min_age_night_work')}
            onChange={(v) => updateLocal('work_hours', 'min_age_night_work', v)}
            suffix="años"
            hint="Edad mínima para trabajo en jornada nocturna"
          />
        </Section>

        {/* Transporte */}
        <Section
          title="Transporte"
          description="Reglas de aplicación del auxilio de transporte"
          icon={Truck}
          accentColor="teal"
          expanded={expandedSections.transportation}
          onToggle={() => toggleSection('transportation')}
        >
          <SwitchField
            label="Aplicar Automáticamente"
            description="Agrega auxilio a empleados que cumplan el umbral"
            checked={getLocal('transportation', 'auto_apply') === 'true'}
            onChange={(checked) => updateLocal('transportation', 'auto_apply', String(checked))}
          />
          <CurrencyField
            label="Límite Salarial"
            value={getLocal('transportation', 'salary_limit')}
            onChange={(v) => updateLocal('transportation', 'salary_limit', v)}
            hint="Salarios hasta este valor reciben auxilio"
          />
        </Section>

        {/* Numeración */}
        <Section
          title="Numeración de Nómina"
          description="Prefijo y consecutivo para documentos de nómina"
          icon={FileText}
          accentColor="rose"
          expanded={expandedSections.payroll_numbering}
          onToggle={() => toggleSection('payroll_numbering')}
        >
          <TextField
            label="Prefijo"
            value={getLocal('payroll_numbering', 'prefix')}
            onChange={(v) => updateLocal('payroll_numbering', 'prefix', v)}
            placeholder="NOM"
            icon={FileText}
          />
          <NumberField
            label="Consecutivo Inicial"
            value={getLocal('payroll_numbering', 'consecutive_start')}
            onChange={(v) => updateLocal('payroll_numbering', 'consecutive_start', v)}
            icon={Hash}
            hint="Número desde el cual inicia la numeración"
          />
        </Section>
      </div>

      {/* Botón Guardar */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <div className="text-xs text-gray-400">
          {changedCount > 0 ? (
            <span className="text-amber-500 font-medium">
              {changedCount} {changedCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
            </span>
          ) : (
            <span>Sin cambios pendientes</span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'px-6 transition-all',
            changedCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20'
              : 'bg-indigo-600 hover:bg-indigo-700',
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
