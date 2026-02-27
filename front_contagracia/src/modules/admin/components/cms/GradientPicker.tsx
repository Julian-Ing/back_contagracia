'use client';

/**
 * GradientPicker - Selector de gradiente con color pickers y paleta predefinida
 * Adaptado del viejo GradientProperty.jsx
 */

import React from 'react';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';

const PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
];

const TAILWIND_TO_HEX: Record<string, string> = {
  'purple-500': '#a855f7', 'indigo-500': '#6366f1', 'pink-500': '#ec4899',
  'blue-500': '#3b82f6', 'cyan-500': '#06b6d4', 'green-500': '#22c55e',
  'red-500': '#ef4444', 'orange-500': '#f97316', 'yellow-500': '#eab308',
  'teal-500': '#14b8a6', 'emerald-500': '#10b981', 'lime-500': '#84cc16',
  'amber-500': '#f59e0b', 'fuchsia-500': '#d946ef', 'violet-500': '#8b5cf6',
  'sky-500': '#0ea5e9', 'rose-500': '#f43f5e', 'slate-500': '#64748b',
  'purple-600': '#9333ea', 'purple-400': '#c084fc', 'indigo-600': '#4f46e5',
  'blue-600': '#2563eb', 'blue-400': '#60a5fa', 'cyan-600': '#0891b2',
  'cyan-400': '#22d3ee', 'green-600': '#16a34a', 'pink-600': '#db2777',
  'red-600': '#dc2626', 'orange-600': '#ea580c', 'purple-900': '#581c87',
};

function parseGradient(value: string | undefined): { from: string; to: string } {
  if (!value) return { from: '#a855f7', to: '#6366f1' };

  const fromHex = value.match(/from-\[([#\w]+)\]/);
  const toHex = value.match(/to-\[([#\w]+)\]/);
  if (fromHex && toHex) {
    return {
      from: fromHex[1].startsWith('#') ? fromHex[1] : `#${fromHex[1]}`,
      to: toHex[1].startsWith('#') ? toHex[1] : `#${toHex[1]}`,
    };
  }

  const fromTw = value.match(/from-(\w+-\d+)/);
  const toTw = value.match(/to-(\w+-\d+)/);
  return {
    from: fromTw ? (TAILWIND_TO_HEX[fromTw[1]] || '#a855f7') : '#a855f7',
    to: toTw ? (TAILWIND_TO_HEX[toTw[1]] || '#6366f1') : '#6366f1',
  };
}

interface GradientPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function GradientPicker({ label, value, onChange, description }: GradientPickerProps) {
  const { from, to } = parseGradient(value);

  const handleChange = (type: 'from' | 'to', hex: string) => {
    const current = parseGradient(value);
    const newFrom = type === 'from' ? hex : current.from;
    const newTo = type === 'to' ? hex : current.to;
    const norm = (c: string) => (c.startsWith('#') ? c : `#${c}`);
    onChange(`from-[${norm(newFrom)}] to-[${norm(newTo)}]`);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {/* Preview */}
      <div
        className="w-full h-16 rounded-lg border-2 border-border"
        style={{ background: `linear-gradient(to right, ${from}, ${to})` }}
      />

      {/* From */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color inicial (from)</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={from}
            onChange={(e) => handleChange('from', e.target.value)}
            className="w-12 h-10 rounded border border-border cursor-pointer"
          />
          <Input
            value={from}
            onChange={(e) => handleChange('from', e.target.value)}
            placeholder="#a855f7"
            className="flex-1 font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-9 gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleChange('from', c)}
              className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: from.toLowerCase() === c.toLowerCase() ? '#000' : 'transparent',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* To */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color final (to)</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={to}
            onChange={(e) => handleChange('to', e.target.value)}
            className="w-12 h-10 rounded border border-border cursor-pointer"
          />
          <Input
            value={to}
            onChange={(e) => handleChange('to', e.target.value)}
            placeholder="#6366f1"
            className="flex-1 font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-9 gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleChange('to', c)}
              className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: to.toLowerCase() === c.toLowerCase() ? '#000' : 'transparent',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Clase Tailwind: <code className="bg-muted px-1 rounded">{value || 'from-purple-500 to-indigo-500'}</code>
      </p>
    </div>
  );
}
