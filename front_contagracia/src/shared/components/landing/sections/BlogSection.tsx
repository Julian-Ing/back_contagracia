'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { ArrowRight, Loader2, Newspaper } from 'lucide-react';
import { parseTextGradient } from '@/shared/lib/gradientUtils';
import type {
  SiteSection,
  BlogSectionContent,
} from '@/modules/admin/types/cms.types';

interface BlogSectionProps {
  section: SiteSection;
}

// TODO: Reemplazar con servicio real de blog cuando exista
async function fetchLatestPosts(limit: number) {
  // Placeholder: retornar vacío hasta que el módulo de blog esté implementado
  return [];
}

function getExcerpt(content: string): string {
  if (!content) return '';
  const plainText = content
    .replace(/(\r\n|\n|\r|#|!\[.*\]\(.*\))/gm, ' ')
    .replace(/\s+/g, ' ');
  return plainText.split(' ').slice(0, 20).join(' ') + '...';
}

interface BlogPost {
  slug: string;
  title: string;
  published_at: string;
  content: string;
}

export function BlogSection({ section }: BlogSectionProps) {
  const content = (section.content as BlogSectionContent) || {};
  const title = section.title || 'Desde Nuestro Blog';
  const subtitle =
    section.subtitle ||
    'Consejos, noticias y actualizaciones para potenciar tu negocio.';
  const postsLimit = content.postsLimit || 3;
  const buttonText = content.buttonText || 'Ver todos los artículos';

  const titleGradient = parseTextGradient(content.titleGradient);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLatestPosts(postsLimit);
      setPosts(data);
      setLoading(false);
    };
    load();
  }, [postsLimit]);

  // No renderizar si no hay posts y no está cargando
  if (!loading && posts.length === 0) return null;

  return (
    <section className="relative px-4 sm:px-6 py-20 bg-slate-50 dark:bg-black/20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className={titleGradient.className} style={titleGradient.style}>
              {title}
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <motion.div
                key={post.slug}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="block group"
                >
                  <div className="relative p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 transition-all duration-300 h-full flex flex-col">
                    <div className="mb-4">
                      <p className="text-sm text-cyan-600 dark:text-cyan-400">
                        {new Date(post.published_at).toLocaleDateString(
                          'es-CO',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )}
                      </p>
                      <h3 className="text-xl font-bold mt-2 text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {post.title}
                      </h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed flex-grow">
                      {getExcerpt(post.content)}
                    </p>
                    <div className="mt-6">
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400 group-hover:underline flex items-center">
                        Leer más <ArrowRight className="w-4 h-4 ml-2" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Link href="/blog">
            <Button
              size="lg"
              variant="outline"
              className="border-cyan-500/50 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10"
            >
              <Newspaper className="w-5 h-5 mr-2" />
              {buttonText}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
