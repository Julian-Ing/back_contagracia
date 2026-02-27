'use client';

import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import {
  ArrowRight,
  Star,
  TrendingUp,
  Package,
  Gift,
  Mail,
  MessageCircle,
} from 'lucide-react';
import type { SiteSection, HeroContent } from '@/modules/admin/types/cms.types';
import { getUploadUrl } from '@/config/api.config';

interface HeroSectionProps {
  section: SiteSection;
  onGetStartedClick?: () => void;
  onContactSalesClick?: () => void;
}

const defaultContent: HeroContent = {
  badge: 'Software #1 para MiPymes',
  description:
    'Software contable especializado para MiPymes con gestión inteligente de inventario. Automatiza tu contabilidad y toma el control total de tu negocio.',
  ctaPrimary: 'Comenzar',
  ctaSecondary: 'Soporte WhatsApp',
  email: 'soporte@contagracia.com',
  stats: [
    { value: '500+', label: 'Empresas Activas' },
    { value: '99.9%', label: 'Tiempo Activo' },
    { value: 'Lunes a Viernes', label: 'Soporte' },
  ],
  imageLight: '',
  imageDark: '',
  backgroundColorDark: 'bg-slate-900',
};

export function HeroSection({
  section,
  onGetStartedClick,
  onContactSalesClick,
}: HeroSectionProps) {
  const content = (section.content as HeroContent) || defaultContent;
  const title = section.title || 'Revoluciona tu Contabilidad';
  const subtitle = section.subtitle || '¡100% para pequeños emprendedores!';
  const bgColorDark = content.backgroundColorDark || 'bg-slate-900';

  const titleWords = title.split(' ');
  const titleMain = titleWords.slice(0, -1).join(' ');
  const titleHighlight = titleWords.slice(-1).join(' ');

  const hasImages = content.imageLight || content.imageDark;

  return (
    <section
      className={`relative px-4 sm:px-6 py-20 md:py-28 bg-gray-50 dark:${bgColorDark}`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8 text-center lg:text-left"
          >
            <div className="space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-700"
              >
                <Star className="w-4 h-4 text-yellow-500 mr-2" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {content.badge}
                </span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
                <span className="text-slate-900 dark:text-white">
                  {titleMain}
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {titleHighlight}
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
                {content.description}
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="inline-flex items-center gap-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700"
              >
                <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-700 dark:text-green-300">
                  {subtitle}
                </span>
              </motion.div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={onGetStartedClick}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-lg px-8 py-6"
              >
                {content.ctaPrimary}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              {content.ctaSecondary && (
                <Button
                  onClick={onContactSalesClick}
                  size="lg"
                  className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {content.ctaSecondary}
                </Button>
              )}
              {content.email && (
                <div className="flex items-center gap-2 text-lg text-slate-600 dark:text-slate-300">
                  <Mail className="w-5 h-5" />
                  <span>
                    Soporte:{' '}
                    <a
                      href={`mailto:${content.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {content.email}
                    </a>
                  </span>
                </div>
              )}
            </div>

            {content.stats && content.stats.length > 0 && (
              <div className="flex items-center justify-center lg:justify-start space-x-8 pt-4">
                {content.stats.map((stat, index) => (
                  <div key={index} className="text-center max-w-[220px]">
                    <div
                      className={`text-2xl font-bold ${index < 2 ? 'text-blue-600' : 'text-indigo-600'}`}
                    >
                      {stat.value.includes('\n') ? (
                        <div className="text-sm font-bold leading-relaxed whitespace-pre-line">
                          {stat.value}
                        </div>
                      ) : (
                        stat.value
                      )}
                    </div>
                    <div
                      className={`${stat.value.includes('\n') ? 'text-xs mt-1' : 'text-sm'} text-slate-500 dark:text-slate-400`}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {hasImages ? (
              <div className="relative z-10">
                {content.imageLight && (
                  <img
                    className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 dark:hidden"
                    alt="Dashboard en modo claro"
                    src={getUploadUrl(content.imageLight)}
                  />
                )}
                {content.imageDark && (
                  <img
                    className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 hidden dark:block"
                    alt="Dashboard en modo oscuro"
                    src={getUploadUrl(content.imageDark)}
                  />
                )}
              </div>
            ) : (
              <div className="relative z-10">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-white">
                    <div className="space-y-4">
                      <div className="h-8 w-3/4 bg-white/20 rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-white/20 rounded animate-pulse" />
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="bg-white/10 p-4 rounded-lg">
                          <div className="h-4 w-16 bg-white/20 rounded mb-2" />
                          <div className="h-8 w-24 bg-white/30 rounded" />
                        </div>
                        <div className="bg-white/10 p-4 rounded-lg">
                          <div className="h-4 w-16 bg-white/20 rounded mb-2" />
                          <div className="h-8 w-24 bg-white/30 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-6 -right-6 bg-blue-600 p-4 rounded-2xl shadow-xl"
            >
              <TrendingUp className="w-8 h-8 text-white" />
            </motion.div>

            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -bottom-6 -left-6 bg-indigo-600 p-4 rounded-2xl shadow-xl"
            >
              <Package className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
