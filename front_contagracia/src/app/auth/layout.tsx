import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Autenticación - Contagracia',
  description: 'Inicia sesión o registra tu empresa en Contagracia',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logo o header */}
      <header className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Contagracia</h1>
        </div>
      </header>

      {/* Contenido */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          © 2026 Contagracia. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
