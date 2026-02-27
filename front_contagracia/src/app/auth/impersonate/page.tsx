'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ImpersonatePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Validando acceso...');
  const [companyName, setCompanyName] = useState('');
  const processed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (processed.current) return;
    processed.current = true;

    const raw = localStorage.getItem('pending_impersonation');

    console.log('[Impersonate] raw from localStorage:', raw ? `${raw.substring(0, 100)}...` : 'null');

    if (!raw) {
      setStatus('error');
      setMessage('No se encontraron datos de acceso.');
      return;
    }

    localStorage.removeItem('pending_impersonation');

    try {
      const data = JSON.parse(raw);

      console.log('[Impersonate] parsed keys:', Object.keys(data));
      console.log('[Impersonate] has access_token:', !!data.access_token);
      console.log('[Impersonate] has user:', !!data.user);
      console.log('[Impersonate] has company:', !!data.company);

      if (!data.access_token || !data.user || !data.company) {
        setStatus('error');
        setMessage('Datos de acceso incompletos.');
        return;
      }

      const cName = data.company.company_name || data.company.name;
      setCompanyName(cName);

      // Store impersonation session flag
      localStorage.setItem(
        'impersonation_session',
        JSON.stringify({
          isImpersonating: true,
          company_id: data.company.id,
          company_name: cName,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        })
      );

      // Set auth data in zustand store
      useAuthStore.getState().setAuthData({
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
        } as any,
        token: data.access_token,
        refreshToken: data.refresh_token || '',
        userType: data.user_type || 'owner',
        role: data.role || 'admin',
        company: data.company as any,
        subscription: data.subscription || undefined,
        permissions: data.permissions || undefined,
      });

      setStatus('success');
      setMessage(`Acceso exitoso a ${data.company.name}. Redirigiendo...`);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('[Impersonate] error:', err);
      setStatus('error');
      setMessage('Error al procesar los datos de acceso.');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">{message}</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">{message}</h2>
            {companyName && (
              <p className="text-gray-500">Ingresando como {companyName}</p>
            )}
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">{message}</h2>
            <p className="text-gray-500">
              Verifica que el enlace sea correcto o solicita uno nuevo.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
