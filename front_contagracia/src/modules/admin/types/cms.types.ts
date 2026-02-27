/**
 * Types for CMS Module
 * Tipos para el CMS (pages, sections, uploads)
 */

// ===== PAGES =====
export interface Page {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  page_type: PageType;
  layout?: string | null;
  show_in_header: boolean;
  show_in_footer: boolean;
  header_order?: number | null;
  footer_order?: number | null;
  header_label?: string | null;
  footer_label?: string | null;
  is_active: boolean;
  is_published: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  settings?: Record<string, any> | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  sections?: SiteSection[];
  _count?: { sections: number };
}

export type PageType = 'landing' | 'static' | 'blog_list' | 'legal' | 'custom';

export interface CreatePageDto {
  title: string;
  slug: string;
  description?: string;
  page_type?: PageType;
  layout?: string;
  show_in_header?: boolean;
  show_in_footer?: boolean;
  header_order?: number;
  footer_order?: number;
  header_label?: string;
  footer_label?: string;
  meta_title?: string;
  meta_description?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  settings?: Record<string, any>;
}

export interface UpdatePageDto extends Partial<CreatePageDto> {
  is_active?: boolean;
  is_published?: boolean;
}

// ===== SECTIONS =====
export interface SiteSection {
  id: string;
  section_key: string;
  section_type: SectionType;
  title?: string | null;
  subtitle?: string | null;
  content?: Record<string, any> | null;
  page_id: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type SectionType =
  | 'hero'
  | 'feature_grid'
  | 'benefits'
  | 'pricing'
  | 'blog_section'
  | 'cta'
  | 'container'
  | 'flex-container';

export interface CreateSectionDto {
  section_key: string;
  section_type: SectionType;
  title?: string;
  subtitle?: string;
  content?: Record<string, any>;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateSectionDto extends Partial<CreateSectionDto> {}

export interface ReorderSectionItem {
  id: string;
  display_order: number;
}

export interface ReorderSectionsDto {
  sections: ReorderSectionItem[];
}

// ===== SECTION CONTENT TYPES =====
export interface HeroContent {
  badge?: string;
  description?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  email?: string;
  stats?: { value: string; label: string }[];
  imageLight?: string;
  imageDark?: string;
  backgroundColorDark?: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  color: string;
}

export interface FeatureGridContent {
  features: FeatureItem[];
}

export interface BenefitItem {
  text: string;
  schedule?: string;
}

export interface BenefitsContent {
  image?: string;
  imageAlt?: string;
  benefits: BenefitItem[];
}

export interface BlogSectionContent {
  titleGradient?: string;
  postsLimit?: number;
  buttonText?: string;
}

export interface CTAContent {
  primaryButton?: { text: string; color: string };
  secondaryButton?: { text: string };
  benefits?: string;
  backgroundColor?: string;
}

export interface ContainerComponent {
  id: string;
  type: string;
  props: Record<string, any>;
}

export interface ContainerContent {
  gridRows?: number;
  gridColumns?: number;
  cellHeight?: number;
  gap?: number;
  padding?: number;
  backgroundPreset?: string;
  backgroundColor?: string;
  backgroundColorDark?: string;
  borderRadius?: number;
  showGridLines?: boolean;
  components: ContainerComponent[];
}

// ===== NAVIGATION =====
export interface NavigationItem {
  id: string;
  slug: string;
  title: string;
  header_label?: string | null;
  header_order?: number | null;
  footer_label?: string | null;
  footer_order?: number | null;
}

export interface Navigation {
  header: NavigationItem[];
  footer: NavigationItem[];
}

// ===== UPLOADS =====
export interface UploadResponse {
  url: string;
}
