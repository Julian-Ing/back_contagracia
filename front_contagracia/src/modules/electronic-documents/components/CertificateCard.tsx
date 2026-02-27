'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/shared/hooks';
import { electronicDocsClient } from '@/shared/services/api/apiClient';

interface CertificateInfo {
  has_certificate: boolean;
  file_name?: string;
  password?: string;
  expires_at?: string;
}

export const CertificateCard = () => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [certInfo, setCertInfo] = useState<CertificateInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageCertificate = can('electronic_documents.certificate.load');

  useEffect(() => {
    loadCertificateInfo();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(p12|pfx)$/i)) {
        toast.error('Solo se aceptan archivos .p12 o .pfx');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe exceder 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !password) {
      toast.error('Selecciona archivo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      await electronicDocsClient.post('/certificate/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Certificado cargado exitosamente');
      setFile(null);
      setPassword('');
      setShowPassword(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      loadCertificateInfo();
    } catch (error: any) {
      let errorMessage = 'Error al cargar certificado';

      if (error?.response?.data) {
        const data = error.response.data;

        // Mensaje principal del backend
        if (data.message) {
          errorMessage = data.message;
        }

        // Si hay errores específicos de campos, agregarlos como hint
        if (data.errors && typeof data.errors === 'object') {
          const errors = Object.values(data.errors);

          // Si detectamos error de contraseña, agregar hint
          if (errors.some((e: any) => typeof e === 'string' && e.includes('mac verify failure'))) {
            errorMessage += ' (verifica la contraseña)';
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadCertificateInfo = async () => {
    try {
      const response = await electronicDocsClient.get('/certificate/info');
      const data = response.data;
      setCertInfo(data);

      // Prellenar contraseña si existe
      if (data.password) {
        setPassword(data.password);
      }
    } catch (error) {
      console.error('Error cargando info del certificado:', error);
    }
  };

  const getExpiryText = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencido';
    if (diffDays === 0) return 'Vence hoy';
    if (diffDays === 1) return 'Vence mañana';
    if (diffDays < 30) return `Vence en ${diffDays} días`;

    const diffMonths = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;

    if (remainingDays === 0) {
      return diffMonths === 1 ? 'Vence en 1 mes' : `Vence en ${diffMonths} meses`;
    }

    return diffMonths === 1
      ? `Vence en 1 mes y ${remainingDays} días`
      : `Vence en ${diffMonths} meses y ${remainingDays} días`;
  };

  if (!canManageCertificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificado Digital</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            No tienes permisos para gestionar certificados
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Certificado Digital</CardTitle>
          {certInfo?.has_certificate && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {certInfo?.has_certificate && certInfo.expires_at && (
          <div className="text-xs text-muted-foreground">
            {getExpiryText(certInfo.expires_at)}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cert-file" className="text-xs text-muted-foreground">Archivo .p12 / .pfx</Label>
          {certInfo?.file_name && (
            <div className="text-xs text-muted-foreground mb-1">
              Actual: {certInfo.file_name}
            </div>
          )}
          <Input
            ref={fileInputRef}
            id="cert-file"
            type="file"
            accept=".p12,.pfx"
            onChange={handleFileChange}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cert-password" className="text-xs text-muted-foreground">Contraseña</Label>
          <div className="relative">
            <Input
              id="cert-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-8 text-sm pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || !password || loading}
          size="sm"
          className="w-full h-8"
        >
          {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Cargar
        </Button>
      </CardContent>
    </Card>
  );
};
