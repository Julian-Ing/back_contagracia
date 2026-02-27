'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Loader2,
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  Activity,
  Eye,
  Calendar,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Clock,
  CheckCircle,
  Star,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { blogService } from '@/modules/admin/services/blog.service';
import type {
  BlogPost,
  BlogOverviewStats,
  EngagementStats,
  TagAnalyticsItem,
} from '@/modules/admin/types/blog.types';

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [overview, setOverview] = useState<BlogOverviewStats | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalyticsItem[]>([]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogService.getPosts({ limit: 50, status: 'all' });
      setPosts(res.data);
    } catch {
      toast.error('Error al cargar los posts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [ov, eng, tags] = await Promise.all([
        blogService.getAnalyticsOverview(),
        blogService.getEngagementAnalytics(),
        blogService.getTagAnalytics(),
      ]);
      setOverview(ov);
      setEngagement(eng);
      setTagAnalytics(tags);
    } catch {
      // Analytics may fail silently if no data yet
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchAnalytics();
  }, [fetchPosts, fetchAnalytics]);

  const confirmDelete = async () => {
    if (!postToDelete) return;
    try {
      await blogService.deletePost(postToDelete.id);
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      toast.success('Post eliminado correctamente');
    } catch {
      toast.error('Error al eliminar el post');
    } finally {
      setPostToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión del Blog</h1>
          <p className="text-gray-500 dark:text-gray-400">Crea, edita y elimina las entradas de tu blog.</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-gray-900 dark:text-white transition-colors"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Nuevo Post
        </Link>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-800">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Gestión de Posts
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Interacciones
          </TabsTrigger>
          <TabsTrigger value="tag-analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tags Analytics
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Entradas del Blog</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de posts: {posts.length}</p>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay posts aún. Crea el primero.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-transparent">
                      <TableHead className="text-gray-500 dark:text-gray-400">Título</TableHead>
                      <TableHead className="text-gray-500 dark:text-gray-400">Estado</TableHead>
                      <TableHead className="text-gray-500 dark:text-gray-400">Vistas</TableHead>
                      <TableHead className="text-gray-500 dark:text-gray-400">Fecha de Creación</TableHead>
                      <TableHead className="text-gray-500 dark:text-gray-400 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">{post.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              post.published_at
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }
                          >
                            {post.published_at ? 'Publicado' : 'Borrador'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.analytics?.views_count?.toLocaleString() || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">{formatDate(post.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                              <DropdownMenuItem className="text-gray-800 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-gray-900 dark:text-gray-100 cursor-pointer p-0">
                                <Link href={`/admin/blog/edit/${post.slug}`} className="flex items-center w-full px-2 py-1.5">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-300 focus:bg-red-900/30 cursor-pointer"
                                onClick={() => setPostToDelete(post)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Borrar</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm">Total de Vistas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(overview?.totalViews ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Total de Posts</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{overview?.totalPosts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Publicados</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{overview?.publishedPosts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <Edit className="h-4 w-4" />
                <span className="text-sm">Borradores</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{overview?.draftPosts ?? 0}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-6">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Total Comentarios</span>
              </div>
              <p className="text-3xl font-bold text-indigo-400">{(overview?.totalComments ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-6">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <Star className="h-4 w-4" />
                <span className="text-sm">Rating Promedio</span>
              </div>
              <p className="text-3xl font-bold text-amber-400">{overview?.avgRating?.toFixed(1) ?? '0.0'}</p>
            </div>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Interacciones del Blog</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              <div className="p-4 rounded-lg bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <ThumbsUp className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Likes</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{engagement?.likes_count ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <ThumbsDown className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Dislikes</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{engagement?.dislikes_count ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <Bookmark className="h-4 w-4 text-blue-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Bookmarks</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{engagement?.bookmarks_count ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lectura Prom.</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{engagement?.avg_reading_time_minutes ?? 0} min</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-teal-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tasa Completado</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{engagement?.completion_rate_percentage ?? 0}%</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tags Analytics Tab */}
        <TabsContent value="tag-analytics">
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Analytics por Tag</h3>
            {tagAnalytics.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">No hay datos de tags aún.</p>
            ) : (
              <div className="space-y-3">
                {tagAnalytics.map((tag, index) => (
                  <div key={tag.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          borderColor: `${tag.color}50`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      <span>{tag.post_count} posts</span>
                      <span>{tag.total_views} vistas</span>
                      <span>{tag.total_clicks} clicks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!postToDelete}
        onOpenChange={() => setPostToDelete(null)}
        title="¿Estás realmente seguro?"
        description="Esta acción es irreversible. Se borrará permanentemente el post."
        onConfirm={confirmDelete}
        confirmLabel="Sí, borrar post"
        cancelLabel="Cancelar"
        variant="destructive"
      />
    </div>
  );
}
