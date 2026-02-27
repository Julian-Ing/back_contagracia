'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { ThemeToggle } from '@/shared/components/ui/ThemeToggle';
import { Users, LogOut, LayoutDashboard, Menu, X, BookmarkCheck } from 'lucide-react';
import { cmsService } from '@/modules/admin/services/cms.service';
import type { User } from '@/shared/types';

interface NavLink {
  name: string;
  href: string;
  type: 'scroll' | 'navigate';
}

interface HeaderProps {
  user?: User | null;
  onLoginClick: () => void;
  onSignOut: () => void;
}

export function Header({ user, onLoginClick, onSignOut }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const staticLinks: NavLink[] = [
    { name: 'Funcionalidades', href: '#features', type: 'scroll' },
    { name: 'Beneficios', href: '#benefits', type: 'scroll' },
    { name: 'Blog', href: '/blog', type: 'navigate' },
  ];

  const [dynamicLinks, setDynamicLinks] = useState<NavLink[]>([]);

  useEffect(() => {
    cmsService.getPages().then((pages) => {
      const headerPages = pages
        .filter((p) => p.show_in_header && p.is_active)
        .map((p) => ({
          name: p.header_label || p.title,
          href: `/p/${p.slug.replace(/^\//, '')}`,
          type: 'navigate' as const,
        }));
      setDynamicLinks(headerPages);
    }).catch(() => { /* ignore */ });
  }, []);

  const navLinks = [...staticLinks, ...dynamicLinks];

  const handleNavClick = (link: typeof navLinks[0], e: React.MouseEvent) => {
    e.preventDefault();
    if (link.type === 'scroll') {
      if (pathname === '/') {
        const element = document.querySelector(link.href);
        element?.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push(`/${link.href}`);
      }
    } else {
      router.push(link.href);
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-40 px-4 sm:px-6 py-4 backdrop-blur-md bg-background/80 sticky top-0 border-b"
      >
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            className="flex items-center space-x-3 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => router.push('/')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Contagracia
            </span>
          </motion.div>

          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map(link => (
              <a key={link.name} href={link.href} onClick={(e) => handleNavClick(link, e)} className="text-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-2">
            <ThemeToggle />
            {user ? (
              <>
                <Button onClick={() => router.push('/favoritos')} variant="ghost">
                  <BookmarkCheck className="w-4 h-4 mr-2" />Favoritos
                </Button>
                <Button onClick={() => router.push('/dashboard')} variant="ghost">
                  <LayoutDashboard className="w-4 h-4 mr-2" />Dashboard
                </Button>
                <Button onClick={onSignOut} className="bg-destructive text-destructive-foreground">
                  <LogOut className="w-4 h-4 mr-2" />Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => router.push('/favoritos')} variant="ghost">
                  <BookmarkCheck className="w-4 h-4 mr-2" />Favoritos
                </Button>
                <Button onClick={onLoginClick} className="bg-primary text-primary-foreground">
                  <Users className="w-4 h-4 mr-2" />Iniciar Sesión
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <ThemeToggle />
            <Button onClick={() => setIsMenuOpen(true)} variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-background p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-xl font-bold">Menú</span>
                <Button onClick={() => setIsMenuOpen(false)} variant="ghost" size="icon">
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <motion.div className="flex flex-col space-y-4">
                {navLinks.map(link => (
                  <a key={link.name} href={link.href} onClick={(e) => { handleNavClick(link, e); setIsMenuOpen(false); }} className="block text-lg py-2 cursor-pointer">
                    {link.name}
                  </a>
                ))}
                <div className="pt-6 border-t">
                  {user ? (
                    <div className="space-y-4">
                      <Button onClick={() => { router.push('/dashboard'); setIsMenuOpen(false); }} variant="outline" className="w-full">
                        <LayoutDashboard className="w-4 h-4 mr-2" />Dashboard
                      </Button>
                      <Button onClick={() => { onSignOut(); setIsMenuOpen(false); }} className="w-full bg-destructive">
                        <LogOut className="w-4 h-4 mr-2" />Cerrar Sesión
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => { onLoginClick(); setIsMenuOpen(false); }} className="w-full bg-primary">
                      <Users className="w-4 h-4 mr-2" />Iniciar Sesión
                    </Button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
