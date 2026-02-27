'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Search, Calendar, Clock, Eye, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { blogService } from '@/modules/admin/services/blog.service';
import type { BlogPost, BlogTag, BlogPostQueryParams } from '@/modules/admin/types/blog.types';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: BlogPostQueryParams & { tag_ids?: string } = {
        page,
        limit: 6,
        search: search || undefined,
      };
      if (selectedTagIds.length > 0) {
        params.tag_ids = selectedTagIds.join(',');
      }
      const res = await blogService.getPublicPosts(params);
      setPosts(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedTagIds]);

  useEffect(() => {
    blogService.getPublicTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div>
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog de Contagracia</h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
            Artículos, tutoriales y novedades sobre contabilidad, facturación electrónica y gestión empresarial.
          </p>
          <form onSubmit={handleSearch} className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artículos..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-200 focus:bg-white/20"
            />
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Tag Filters */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className={`cursor-pointer transition-all ${
                  selectedTagIds.includes(tag.id)
                    ? 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-slate-950'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id) ? `${tag.color}30` : `${tag.color}10`,
                  borderColor: `${tag.color}50`,
                  color: tag.color,
                }}
                onClick={() => {
                  toggleTag(tag.id);
                  blogService.trackTagClick(tag.id).catch(() => {});
                }}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag.name}
                {tag._count?.post_tags ? ` (${tag._count.post_tags})` : ''}
              </Badge>
            ))}
          </div>
        )}

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No se encontraron artículos.</p>
            {(search || selectedTagIds.length > 0) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setSearch(''); setSelectedTagIds([]); setPage(1); }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 transition-all"
                >
                  {post.featured_image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs"
                            style={{ backgroundColor: `${tag.color}10`, borderColor: `${tag.color}30`, color: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{post.excerpt}</p>
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
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
