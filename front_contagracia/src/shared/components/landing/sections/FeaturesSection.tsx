'use client';

import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { parseGradient } from '@/shared/lib/gradientUtils';
import type {
  SiteSection,
  FeatureGridContent,
} from '@/modules/admin/types/cms.types';

interface FeaturesSectionProps {
  section: SiteSection;
}

export function FeaturesSection({ section }: FeaturesSectionProps) {
  const { features = [] } = (section.content as FeatureGridContent) || {};
  const title = section.title || 'Funcionalidades Poderosas';
  const subtitle =
    section.subtitle ||
    'Todo lo que necesitas para gestionar tu MiPyme de manera eficiente y profesional';

  return (
    <section
      id="features"
      className="relative px-4 sm:px-6 py-20 bg-white dark:bg-black/20"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {title}
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent =
              (LucideIcons as any)[feature.icon] || LucideIcons.Package;

            const { className: iconClassName, style: iconStyle } =
              parseGradient(
                feature.color,
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300',
              );

            return (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative"
              >
                <div className="relative p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 h-full">
                  <div className={iconClassName} style={iconStyle}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
