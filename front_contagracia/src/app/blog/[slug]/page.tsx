'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Send,
  Star,
  User,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { blogService } from '@/modules/admin/services/blog.service';
import type {
  BlogPost,
  BlogComment,
  EngagementStats,
  EngagementUserState,
} from '@/modules/admin/types/blog.types';

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('blog_visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('blog_visitor_id', id);
  }
  return id;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const visitorId = typeof window !== 'undefined' ? getVisitorId() : '';

  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [userState, setUserState] = useState<EngagementUserState>({ user_reaction: null, user_bookmarked: false });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Comment form
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentRating, setCommentRating] = useState<number>(0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  // Reading tracking
  const startTime = useRef(Date.now());
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const [p, c, e] = await Promise.all([
          blogService.getPublicPost(slug),
          blogService.getPublicComments(slug),
          blogService.getEngagement(slug).catch(() => null),
        ]);
        setPost(p);
        setComments(c);
        if (e) setEngagement(e);

        // Register view
        if (visitorId) {
          blogService.registerView(slug, visitorId).catch(() => {});
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [slug, visitorId]);

  // Reading session tracking
  useEffect(() => {
    if (!post || !visitorId) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      const scrollPct = articleRef.current
        ? Math.min(100, Math.round((window.scrollY / (articleRef.current.scrollHeight - window.innerHeight)) * 100))
        : 0;
      blogService.updateReadingSession(slug, {
        visitor_id: visitorId,
        reading_time_seconds: elapsed,
        scroll_percentage: Math.max(0, scrollPct),
        completed_reading: scrollPct >= 80,
      }).catch(() => {});
    }, 30000); // every 30s
    return () => clearInterval(interval);
  }, [post, slug, visitorId]);

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!visitorId) return;
    try {
      const res = await blogService.toggleReaction(slug, type, visitorId);
      if (res.action === 'removed') {
        setUserState((s) => ({ ...s, user_reaction: null }));
      } else {
        setUserState((s) => ({ ...s, user_reaction: type }));
      }
      const e = await blogService.getEngagement(slug);
      setEngagement(e);
    } catch {
      toast.error('Error al registrar reacción');
    }
  };

  const handleBookmark = async () => {
    if (!visitorId) return;
    try {
      const res = await blogService.toggleBookmark(slug, visitorId);
      setUserState((s) => ({ ...s, user_bookmarked: res.bookmarked }));
      const e = await blogService.getEngagement(slug);
      setEngagement(e);
    } catch {
      toast.error('Error al guardar bookmark');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentEmail.trim() || !commentContent.trim()) return;
    setSubmittingComment(true);
    try {
      await blogService.createComment(slug, {
        author_name: commentName.trim(),
        author_email: commentEmail.trim(),
        content: commentContent.trim(),
        parent_id: replyTo || undefined,
        rating: replyTo ? undefined : commentRating || undefined,
      });
      toast.success('Comentario enviado');
      setCommentContent('');
      setCommentRating(0);
      setReplyTo(null);
      const c = await blogService.getPublicComments(slug);
      setComments(c);
    } catch {
      toast.error('Error al enviar comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Post no encontrado</h1>
        <Link href="/blog">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al blog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={articleRef}>
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/blog" className="inline-flex items-center gap-2 text-purple-200 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al blog
          </Link>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="border-white/30 text-white/90 bg-white/10"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-purple-200">
            {post.author && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {post.author.full_name}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(post.published_at)}
              </span>
            )}
            {post.reading_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.reading_time} min de lectura
              </span>
            )}
            {post.analytics?.views_count != null && (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.analytics.views_count} vistas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.featured_image && (
        <div className="max-w-4xl mx-auto px-4 -mt-6">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full rounded-xl shadow-lg object-cover max-h-[400px]"
          />
        </div>
      )}

      {/* Content + Engagement */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Engagement Bar */}
        <div className="flex items-center gap-3 mb-8 p-3 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            className={userState.user_reaction === 'like' ? 'text-emerald-500' : 'text-gray-500'}
            onClick={() => handleReaction('like')}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            {engagement?.likes_count ?? 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={userState.user_reaction === 'dislike' ? 'text-red-500' : 'text-gray-500'}
            onClick={() => handleReaction('dislike')}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            {engagement?.dislikes_count ?? 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={userState.user_bookmarked ? 'text-blue-500' : 'text-gray-500'}
            onClick={handleBookmark}
          >
            {userState.user_bookmarked ? <BookmarkCheck className="h-4 w-4 mr-1" /> : <Bookmark className="h-4 w-4 mr-1" />}
            {engagement?.bookmarks_count ?? 0}
          </Button>
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {comments.length} comentarios
            </span>
          </div>
        </div>

        {/* Article Content */}
        <article
          className="prose prose-lg dark:prose-invert max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />

        {/* Comments Section */}
        <div className="border-t border-gray-200 dark:border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Comentarios ({comments.length})
          </h2>

          {/* Comment Form */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 mb-8">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {replyTo ? 'Responder comentario' : 'Deja tu comentario'}
            </h3>
            {replyTo && (
              <Button variant="ghost" size="sm" className="mb-3 text-purple-500" onClick={() => setReplyTo(null)}>
                Cancelar respuesta
              </Button>
            )}
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cname" className="text-gray-700 dark:text-gray-300">Nombre *</Label>
                  <Input
                    id="cname"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Tu nombre"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cemail" className="text-gray-700 dark:text-gray-300">Email *</Label>
                  <Input
                    id="cemail"
                    type="email"
                    value={commentEmail}
                    onChange={(e) => setCommentEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Rating (only for root comments) */}
              {!replyTo && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Calificación</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCommentRating(n === commentRating ? 0 : n)}
                        className="p-1"
                      >
                        <Star
                          className={`h-5 w-5 ${n <= commentRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="ccontent" className="text-gray-700 dark:text-gray-300">Comentario *</Label>
                <Textarea
                  id="ccontent"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={4}
                  placeholder="Escribe tu comentario..."
                  required
                  className="mt-1 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingComment || !commentName.trim() || !commentEmail.trim() || !commentContent.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {submittingComment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar comentario
              </Button>
            </form>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-6">
              Aún no hay comentarios. Sé el primero en comentar.
            </p>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={(id) => setReplyTo(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply, depth = 0 }: { comment: BlogComment; onReply: (id: string) => void; depth?: number }) {
  const formatDate = (d: string) => {
    const [y, m, day] = d.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={depth > 0 ? 'ml-8 border-l-2 border-purple-200 dark:border-purple-800 pl-4' : ''}>
      <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{comment.author_name}</span>
              <span className="text-xs text-gray-500 ml-2">{formatDate(comment.created_at)}</span>
            </div>
          </div>
          {comment.rating && (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`h-3 w-3 ${n <= comment.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
              ))}
            </div>
          )}
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.content}</p>
        <button
          onClick={() => onReply(comment.id)}
          className="mt-2 text-xs text-purple-500 hover:text-purple-700 dark:hover:text-purple-300"
        >
          Responder
        </button>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
