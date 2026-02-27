'use client';

import { useState } from 'react';
import { AuthModal } from '@/modules/auth';
import { Header } from '@/shared/components/landing/Header';

export default function FavoritosLayout({ children }: { children: React.ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <Header
        user={null}
        onLoginClick={() => setAuthModalOpen(true)}
        onSignOut={() => {}}
      />

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="relative px-4 sm:px-6 py-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Contagracia
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Software contable especializado para MiPymes colombianas
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white mb-4 block">Producto</span>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><a href="/#features" className="hover:text-blue-600 transition-colors">Funcionalidades</a></li>
                <li><a href="/#benefits" className="hover:text-blue-600 transition-colors">Beneficios</a></li>
              </ul>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white mb-4 block">Empresa</span>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><a href="/#" className="hover:text-blue-600 transition-colors">Nosotros</a></li>
                <li><a href="/blog" className="hover:text-blue-600 transition-colors">Blog</a></li>
                <li><a href="/#" className="hover:text-blue-600 transition-colors">Contacto</a></li>
              </ul>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white mb-4 block">Legal</span>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li><a href="/terminos" className="hover:text-blue-600 transition-colors">Términos</a></li>
                <li><a href="/privacidad" className="hover:text-blue-600 transition-colors">Privacidad</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 mt-12 pt-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} Contagracia. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
