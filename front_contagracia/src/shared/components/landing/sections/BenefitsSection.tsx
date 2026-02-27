'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import type {
  SiteSection,
  BenefitsContent,
} from '@/modules/admin/types/cms.types';
import { getUploadUrl } from '@/config/api.config';

interface BenefitsSectionProps {
  section: SiteSection;
}

export function BenefitsSection({ section }: BenefitsSectionProps) {
  const content = (section.content as BenefitsContent) || { benefits: [] };
  const benefitsData = content.benefits || [];
  const title = section.title || '¿Por qué ContaGracia?';
  const subtitle =
    section.subtitle || 'Beneficios que marcan la diferencia';

  return (
    <section id="benefits" className="relative px-4 sm:px-6 py-20 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {content.image ? (
              <img
                className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
                alt={content.imageAlt || 'Imagen ilustrativa'}
                src={getUploadUrl(content.image || '')}
              />
            ) : (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-12 text-white aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-4">30</div>
                    <div className="text-2xl font-semibold">
                      Días de prueba gratis
                    </div>
                    <p className="text-blue-100 mt-2">
                      Sin tarjeta de crédito
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {title}
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="space-y-6">
              {benefitsData.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ x: 50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg text-slate-700 dark:text-slate-200 font-medium">
                      {benefit.text}
                    </div>
                    {benefit.schedule && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {benefit.schedule}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
