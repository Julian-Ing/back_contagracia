'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import Link from 'next/link';
import { blogService } from '@/modules/admin/services/blog.service';
import type { BlogTag } from '@/modules/admin/types/blog.types';

const TipTapEditor = dynamic(
  () => import('@/shared/components/editors/TipTapEditor'),
  { ssr: false, loading: () => <div className="h-[300px] rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div> },
);

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loadingPost, setLoadingPost] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postId, setPostId] = useState('');
  const [title, setTitle] = useState('');
  const [postSlug, setPostSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<BlogTag[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [post, tags] = await Promise.all([
          blogService.getPublicPost(slug),
          blogService.getTags(),
        ]);
        setPostId(post.id);
        setTitle(post.title);
        setPostSlug(post.slug);
        setExcerpt(post.excerpt || '');
        setContent(post.content || '');
        setFeaturedImage(post.featured_image || '');
        setIsPublished(!!post.published_at);
        setSelectedTagIds(post.tags?.map((t) => t.id) || []);
        setAvailableTags(tags);
      } catch {
        toast.error('Error al cargar el post');
        router.push('/admin/blog');
      } finally {
        setLoadingPost(false);
      }
    };
    loadData();
  }, [slug, router]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const res = await blogService.uploadImage(file);
    return res.url;
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await blogService.uploadImage(file);
      setFeaturedImage(res.url);
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      await blogService.updatePost(postId, {
        title: title.trim(),
        slug: postSlug.trim(),
        content,
        excerpt: excerpt.trim() || undefined,
        featured_image: featuredImage || undefined,
        published_at: isPublished ? new Date().toISOString() : null,
        tag_ids: selectedTagIds,
      });
      toast.success('Post actualizado correctamente');
      router.push('/admin/blog');
    } catch {
      toast.error('Error al actualizar el post');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/blog"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Editar Post</h1>
          <p className="text-gray-500 dark:text-gray-400">Modifica el contenido del artículo</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Post</h2>
        </div>

        <div className="p-6 bg-gray-100 dark:bg-slate-900/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title and Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-800 dark:text-gray-200">Título del artículo *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ingresa un título atractivo"
                  required
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-gray-800 dark:text-gray-200">Slug (URL) *</Label>
                <Input
                  id="slug"
                  value={postSlug}
                  onChange={(e) => setPostSlug(e.target.value)}
                  placeholder="url-amigable-del-articulo"
                  required
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 font-mono text-sm"
                />
              </div>
            </div>

            {/* Featured Image and Excerpt */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Imagen destacada</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-colors">
                  {featuredImage ? (
                    <div className="space-y-2">
                      <img src={featuredImage} alt="Preview" className="max-h-40 mx-auto rounded" />
                      <Button type="button" variant="outline" size="sm" onClick={() => setFeaturedImage('')}>
                        Eliminar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="h-10 w-10 mx-auto text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Haz clic para subir una imagen</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFeaturedImageUpload}
                        className="hidden"
                        id="featured-image-upload-edit"
                      />
                      <label htmlFor="featured-image-upload-edit" className="inline-block cursor-pointer">
                        <span className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                          {uploadingImage ? 'Subiendo...' : 'Seleccionar imagen'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt" className="text-gray-800 dark:text-gray-200">Resumen del artículo</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={4}
                  placeholder="Escribe un breve resumen que aparecerá en las cards del blog..."
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 resize-none"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Tags</Label>
              <div className="space-y-3">
                {selectedTagIds.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags seleccionados:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTagIds.map((tagId) => {
                        const tag = availableTags.find((t) => t.id === tagId);
                        return tag ? (
                          <Badge
                            key={tagId}
                            variant="outline"
                            className="cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: `${tag.color}20`, borderColor: `${tag.color}50`, color: tag.color }}
                            onClick={() => handleTagToggle(tagId)}
                          >
                            {tag.name} ×
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags disponibles:</span>
                  <div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    {availableTags.filter((tag) => !selectedTagIds.includes(tag.id)).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: `${tag.color}10`, borderColor: `${tag.color}30`, color: tag.color }}
                        onClick={() => handleTagToggle(tag.id)}
                      >
                        + {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content - TipTap Editor */}
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Contenido del artículo *</Label>
              <TipTapEditor
                content={content}
                onChange={setContent}
                placeholder="Escribe tu artículo aquí..."
                onImageUpload={handleImageUpload}
              />
            </div>

            {/* Publish Checkbox */}
            <div className="rounded-lg bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-800/30 p-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="published"
                  checked={isPublished}
                  onCheckedChange={(checked) => setIsPublished(checked as boolean)}
                />
                <div>
                  <Label htmlFor="published" className="text-gray-800 dark:text-gray-200 cursor-pointer">
                    Publicar este artículo
                  </Label>
                  <p className="text-xs text-gray-500">El artículo será visible públicamente en el blog</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={() => router.push('/admin/blog')}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || !title.trim() || !content.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
