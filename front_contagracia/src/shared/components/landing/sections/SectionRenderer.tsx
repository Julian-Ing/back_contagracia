'use client';

import type { SiteSection } from '@/modules/admin/types/cms.types';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { BenefitsSection } from './BenefitsSection';
import { PricingSection } from './PricingSection';
import { BlogSection } from './BlogSection';
import { CTASection } from './CTASection';
import { ContainerSection } from './ContainerSection';
import { FlexSection } from './FlexSection';

interface SectionRendererProps {
  section: SiteSection;
  onGetStartedClick?: () => void;
  onContactSalesClick?: () => void;
}

export function SectionRenderer({
  section,
  onGetStartedClick,
  onContactSalesClick,
}: SectionRendererProps) {
  switch (section.section_type) {
    case 'hero':
      return (
        <HeroSection
          section={section}
          onGetStartedClick={onGetStartedClick}
          onContactSalesClick={onContactSalesClick}
        />
      );
    case 'feature_grid':
      return <FeaturesSection section={section} />;
    case 'benefits':
      return <BenefitsSection section={section} />;
    case 'pricing':
      return (
        <PricingSection
          section={section}
          onGetStartedClick={onGetStartedClick}
        />
      );
    case 'blog_section':
      return <BlogSection section={section} />;
    case 'cta':
      return (
        <CTASection
          section={section}
          onGetStartedClick={onGetStartedClick}
          onContactSalesClick={onContactSalesClick}
        />
      );
    case 'container':
      return <ContainerSection section={section} />;
    case 'flex-container':
      return <FlexSection section={section} />;
    default:
      return null;
  }
}
