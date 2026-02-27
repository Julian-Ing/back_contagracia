'use client';

/**
 * ImageUploader - Subida de imágenes al servidor local vía admin-service
 * Adaptado del viejo ImageUploader.jsx (Supabase) → usa cmsService.uploadImage
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Upload, X, Loader2, ExternalLink } from 'lucide-react';
import { cmsService } from '@/modules/admin/services/cms.service';
import { getUploadUrl } from '@/config/api.config';

interface ImageUploaderProps {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
}

export function ImageUploader({ id, label, value, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Eliminar imagen anterior si existe
      if (value) {
        try { await cmsService.deleteImage(value); } catch { /* ignore */ }
      }

      const result = await cmsService.uploadImage(file);
      onChange(result.url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      // Resetear input para permitir resubir mismo archivo
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (value) {
      try { await cmsService.deleteImage(value); } catch { /* ignore */ }
    }
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      <div className="flex gap-2">
        <Input
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... o ruta del servidor"
          className="flex-1"
        />
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={handleClear} title="Limpiar">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Subir Imagen
            </>
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => window.open(getUploadUrl(value), '_blank')}
            title="Ver imagen"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {value && (
        <div className="mt-2 border rounded-lg p-2 bg-muted/20">
          <img
            src={getUploadUrl(value)}
            alt="Preview"
            className="w-full h-auto max-h-48 object-contain rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Sube una imagen (max 5MB) o pega una URL manualmente
      </p>
    </div>
  );
}
