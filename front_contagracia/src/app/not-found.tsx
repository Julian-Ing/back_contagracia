'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAuthHydrated } from '@/modules/auth';

export default function NotFound() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userType = useAuthStore((s) => s.userType);

  useEffect(() => {
    if (!hydrated) return;

    if (isAuthenticated) {
      router.replace(userType === 'owner' ? '/admin' : '/dashboard');
    } else {
      router.replace('/');
    }
  }, [hydrated, isAuthenticated, userType, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-blue-500 rounded-full"></div>
        <p className="text-gray-500 dark:text-gray-400">Redirigiendo...</p>
      </div>
    </div>
  );
}
