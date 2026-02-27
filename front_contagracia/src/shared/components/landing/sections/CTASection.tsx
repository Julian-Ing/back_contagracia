'use client';

import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { parseGradient } from '@/shared/lib/gradientUtils';
import type { SiteSection, CTAContent } from '@/modules/admin/types/cms.types';

interface CTASectionProps {
  section: SiteSection;
  onGetStartedClick?: () => void;
  onContactSalesClick?: () => void;
}

export function CTASection({
  section,
  onGetStartedClick,
  onContactSalesClick,
}: CTASectionProps) {
  const content = (section.content as CTAContent) || {};
  const title = section.title || '¿Listo para transformar tu negocio?';
  const subtitle =
    section.subtitle ||
    'Únete a cientos de MiPymes que ya confían en ContaGracia';
  const primaryButton = content.primaryButton || {
    text: 'Prueba Gratuita 7 Días',
    color: 'from-purple-600 to-pink-600',
  };
  const secondaryButton = content.secondaryButton || {
    text: 'Solicitar Demo',
  };
  const benefits =
    content.benefits ||
    'Sin compromiso \u2022 Configuración en 5 minutos \u2022 Soporte incluido';
  const backgroundColor =
    content.backgroundColor || 'from-purple-900/50 to-pink-900/50';

  // Background
  const bg = parseGradient(backgroundColor, 'relative px-4 sm:px-6 py-20');
  const bgClassName = bg.isCustom
    ? bg.className
    : `${bg.className.replace('bg-gradient-to-r', '')} dark:bg-gradient-to-r dark:${backgroundColor} bg-gray-100`;
  const bgStyle = bg.style;

  // Primary button
  const btn = parseGradient(primaryButton.color, 'text-white border-0 text-lg px-8 py-6');
  const btnClassName = btn.isCustom
    ? btn.className
    : `${btn.className} hover:opacity-90`;

  return (
    <section
      className={bg.isCustom ? bg.className : `relative px-4 sm:px-6 py-20 dark:bg-gradient-to-r ${backgroundColor} bg-gray-100`}
      style={bgStyle}
    >
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-4xl lg:text-5xl font-bold">
            <span className="dark:bg-gradient-to-r from-white to-purple-200 bg-clip-text dark:text-transparent text-slate-800">
              {title}
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-white/80 max-w-2xl mx-auto">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onGetStartedClick}
              size="lg"
              className={btnClassName}
              style={btn.style}
            >
              {primaryButton.text}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={onContactSalesClick}
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6"
            >
              {secondaryButton.text}
            </Button>
          </div>

          <p className="text-sm text-slate-500 dark:text-white/70">
            {benefits}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
