'use client';

import { useState, useRef, useEffect } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Check, Pipette } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: { value: string; label: string }[];
  label?: string;
}

const DEFAULT_PRESETS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#8B5CF6', label: 'Violeta' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#EF4444', label: 'Rojo' },
  { value: '#F97316', label: 'Naranja' },
  { value: '#EAB308', label: 'Amarillo' },
  { value: '#22C55E', label: 'Verde' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#0EA5E9', label: 'Celeste' },
  { value: '#10B981', label: 'Esmeralda' },
  { value: '#84CC16', label: 'Lima' },
  { value: '#F43F5E', label: 'Coral' },
  { value: '#A855F7', label: 'Purpura' },
  { value: '#6B7280', label: 'Gris' },
];

export function ColorPicker({ value, onChange, presets = DEFAULT_PRESETS, label }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{label}</label>}

      {/* Current color preview + trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors w-full"
        >
          <div
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">{value}</span>
          <Pipette className="h-4 w-4 ml-auto text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </button>
      </div>

      {/* Dropdown picker */}
      {showPicker && (
        <div className="absolute z-50 mt-2 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-[280px] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Gradient picker */}
          <div className="color-picker-wrapper">
            <HexColorPicker color={value} onChange={onChange} style={{ width: '100%' }} />
          </div>

          {/* Hex input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">HEX</span>
            <div className="flex-1 relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">#</span>
              <HexColorInput
                color={value}
                onChange={onChange}
                prefixed={false}
                className="w-full pl-6 pr-3 py-1.5 text-sm font-mono rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 uppercase"
              />
            </div>
            <div
              className="w-8 h-8 rounded-md border border-gray-200 dark:border-gray-600 flex-shrink-0"
              style={{ backgroundColor: value }}
            />
          </div>

          {/* Preset swatches */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Colores rápidos</p>
            <div className="grid grid-cols-8 gap-1.5">
              {presets.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => onChange(c.value)}
                  className="w-7 h-7 rounded-md border transition-all hover:scale-110 flex items-center justify-center"
                  style={{
                    backgroundColor: c.value,
                    borderColor: value.toLowerCase() === c.value.toLowerCase() ? 'white' : 'transparent',
                    boxShadow: value.toLowerCase() === c.value.toLowerCase() ? `0 0 0 2px ${c.value}` : 'none',
                  }}
                >
                  {value.toLowerCase() === c.value.toLowerCase() && (
                    <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global styles for react-colorful */}
      <style jsx global>{`
        .color-picker-wrapper .react-colorful {
          height: 160px;
          border-radius: 8px;
        }
        .color-picker-wrapper .react-colorful__saturation {
          border-radius: 8px 8px 0 0;
        }
        .color-picker-wrapper .react-colorful__hue {
          height: 14px;
          border-radius: 0 0 8px 8px;
        }
        .color-picker-wrapper .react-colorful__saturation-pointer,
        .color-picker-wrapper .react-colorful__hue-pointer {
          width: 18px;
          height: 18px;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
