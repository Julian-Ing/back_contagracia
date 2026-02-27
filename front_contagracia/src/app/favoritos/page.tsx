'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Loader2,
  BookmarkX,
  Bookmark,
  Calendar,
  Clock,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { blogService } from '@/modules/admin/services/blog.service';
import type { BlogPost } from '@/modules/admin/types/blog.types';

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('blog_visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('blog_visitor_id', id);
  }
  return id;
}

const formatDate = (dateString: string) => {
  const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function FavoritosPage() {
  const [posts, setPosts] = useState<(BlogPost & { bookmarked_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    setLoading(true);
    try {
      const data = await blogService.getBookmarkedPosts(visitorId);
      setPosts(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemoveBookmark = async (slug: string) => {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    setRemovingSlug(slug);
    try {
      await blogService.toggleBookmark(slug, visitorId);
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
      toast.success('Eliminado de favoritos');
    } catch {
      toast.error('Error al eliminar de favoritos');
    } finally {
      setRemovingSlug(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Mis Favoritos</h1>
          <p className="text-lg text-amber-100 max-w-2xl mx-auto">
            Los artículos que has guardado para leer después.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : posts.length === 0 ? (
          /* Estado vacío */
          <div className="text-center py-20">
            <Bookmark className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No tienes posts guardados
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Explora nuestro blog y guarda los artículos que te interesen haciendo
              click en el icono de bookmark.
            </p>
            <Link href="/blog">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                Explorar Blog
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          /* Grid de posts */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-lg hover:shadow-amber-500/10 transition-all"
              >
                <Link href={`/blog/${post.slug}`}>
                  {post.featured_image ? (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                      <Bookmark className="h-10 w-10 text-amber-300 dark:text-amber-700" />
                    </div>
                  )}
                </Link>

                <div className="p-5">
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs"
                          style={{
                            backgroundColor: `${tag.color}10`,
                            borderColor: `${tag.color}30`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                  </Link>

                  {post.excerpt && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.published_at)}
                      </span>
                    )}
                    {post.reading_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.reading_time} min
                      </span>
                    )}
                    {post.analytics?.views_count != null && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.analytics.views_count}
                      </span>
                    )}
                  </div>

                  {/* Fecha de guardado + botón quitar */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    {post.bookmarked_at && (
                      <span className="text-xs text-gray-400">
                        Guardado el {formatDate(post.bookmarked_at)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto"
                      disabled={removingSlug === post.slug}
                      onClick={() => handleRemoveBookmark(post.slug)}
                    >
                      {removingSlug === post.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <BookmarkX className="h-4 w-4 mr-1" />
                          Quitar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
