'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Check, CheckCheck, Megaphone, RefreshCw, Users, AlertCircle,
  Loader2, Volume2, VolumeX, ChevronRight, Sparkles, Shield, Wrench, MessageSquare, Landmark,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { notificationService } from '@/modules/admin/services/notification.service';
import type { CompanyNotification } from '@/modules/admin/types';
import { useRealtime } from '@/shared/providers/RealtimeProvider';
import { useAuthStore } from '@/modules/auth';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/shared/components/ui/sheet';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

interface NotificationDropdownProps {
  companyId: string | undefined;
}

// ─── Config por tipo de notificación ───

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  admin_announcement: { icon: Megaphone, color: 'bg-blue-500/10 text-blue-500', label: 'Anuncio' },
  admin_update: { icon: RefreshCw, color: 'bg-green-500/10 text-green-500', label: 'Actualización' },
  admin_improvement: { icon: Bell, color: 'bg-purple-500/10 text-purple-500', label: 'Mejora Implementada' },
  admin_support: { icon: Users, color: 'bg-orange-500/10 text-orange-500', label: 'Soporte' },
  admin_satisfaction: { icon: AlertCircle, color: 'bg-yellow-500/10 text-yellow-500', label: 'Encuesta' },
  ph_reservation_reminder: { icon: Bell, color: 'bg-indigo-500/10 text-indigo-500', label: 'Reserva PH' },
  tax_reminder_general: { icon: AlertCircle, color: 'bg-amber-500/10 text-amber-500', label: 'Tributario' },
  tax_urgent: { icon: AlertCircle, color: 'bg-red-500/10 text-red-500', label: 'Tributario Urgente' },
  tax_soon: { icon: AlertCircle, color: 'bg-yellow-500/10 text-yellow-500', label: 'Tributario' },
  tax_due_today: { icon: AlertCircle, color: 'bg-red-500/10 text-red-500', label: 'Vence Hoy' },
  tax_due_tomorrow: { icon: AlertCircle, color: 'bg-orange-500/10 text-orange-500', label: 'Vence Mañana' },
  tax_overdue: { icon: AlertCircle, color: 'bg-red-500/10 text-red-500', label: 'Vencido' },
  ph_policy_expiring: { icon: Shield, color: 'bg-amber-500/10 text-amber-500', label: 'Póliza por Vencer' },
  ph_policy_expired: { icon: Shield, color: 'bg-red-500/10 text-red-500', label: 'Póliza Vencida' },
  ph_policy_insurer_changed: { icon: Shield, color: 'bg-blue-500/10 text-blue-500', label: 'Cambio Aseguradora' },
  ph_maintenance_upcoming: { icon: Wrench, color: 'bg-amber-500/10 text-amber-500', label: 'Mantenimiento Proximo' },
  ph_maintenance_overdue: { icon: Wrench, color: 'bg-red-500/10 text-red-500', label: 'Mantenimiento Vencido' },
  ph_pqrs_created: { icon: MessageSquare, color: 'bg-blue-500/10 text-blue-500', label: 'Nueva PQRS' },
  ph_pqrs_message: { icon: MessageSquare, color: 'bg-green-500/10 text-green-500', label: 'Respuesta PQRS' },
  ph_pqrs_status_changed: { icon: MessageSquare, color: 'bg-amber-500/10 text-amber-500', label: 'Estado PQRS' },
  ph_pqrs_deleted: { icon: MessageSquare, color: 'bg-red-500/10 text-red-500', label: 'PQRS Eliminada' },
  payroll_calculated: { icon: Check, color: 'bg-green-500/10 text-green-500', label: 'Nómina Calculada' },
  payroll_calculated_with_errors: { icon: AlertCircle, color: 'bg-red-500/10 text-red-500', label: 'Nómina con Errores' },
  ph_assembly_created: { icon: Landmark, color: 'bg-indigo-500/10 text-indigo-500', label: 'Nueva Asamblea' },
  ph_assembly_status_changed: { icon: Landmark, color: 'bg-amber-500/10 text-amber-500', label: 'Estado Asamblea' },
  ph_assembly_vote_cast: { icon: Landmark, color: 'bg-green-500/10 text-green-500', label: 'Voto Registrado' },
};

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ─── Component ───

export function NotificationDropdown({ companyId }: NotificationDropdownProps) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CompanyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'progress' | 'all' | 'unread'>('all');
  const prevUnreadCount = useRef<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { subscribe, isConnected } = useRealtime();

  // Initialize audio + sound pref on mount
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.5;
    const stored = localStorage.getItem('notification_sound_enabled');
    if (stored !== null) setSoundEnabled(stored === 'true');
  }, []);

  const playNotificationSound = useCallback((newCount: number) => {
    if (!soundEnabled) return;
    if (prevUnreadCount.current >= 0 && newCount > prevUnreadCount.current) {
      audioRef.current?.play().catch(() => {});
    }
    prevUnreadCount.current = newCount;
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('notification_sound_enabled', String(next));
    if (next) audioRef.current?.play().catch(() => {});
  };

  // ─── Data fetching ───

  const fetchUnreadCount = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await notificationService.getUnreadCount(companyId, userId);
      playNotificationSound(res.unread_count);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error('[NotificationDropdown] fetchUnreadCount error:', err);
    }
  }, [companyId, userId, playNotificationSound]);

  const fetchNotifications = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await notificationService.getCompanyNotifications(companyId, 1, 20, userId);
      setNotifications(res.data);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error('[NotificationDropdown] fetchNotifications error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, userId]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Realtime subscriptions
  useEffect(() => {
    const unsub1 = subscribe('notifications:received', (data) => {
      // Ignorar si la notificación excluye a este usuario
      if (userId && data.notification?.exclude_user_id === userId) return;

      setUnreadCount((prev) => prev + 1);
      if (data.notification) {
        setNotifications((prev) => [{
          id: data.notification.id,
          company_id: companyId || '',
          source: data.notification.source || 'system',
          type: data.notification.type,
          title: data.notification.title,
          message: data.notification.message,
          action_url: data.notification.action_url,
          is_read: false,
          read_at: undefined,
          created_at: data.timestamp || new Date().toISOString(),
        } as CompanyNotification, ...prev]);
      }
      if (soundEnabled) audioRef.current?.play().catch(() => {});
    });

    const unsub2 = subscribe('notifications:read', (data) => {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (data.notificationId) {
        setNotifications((prev) =>
          prev.map((n) => n.id === data.notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n),
        );
      }
    });

    const unsub3 = subscribe('notifications:all_read', () => {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribe, soundEnabled]);

  // Fetch when sheet opens
  useEffect(() => {
    if (isOpen && tab !== 'progress') fetchNotifications();
  }, [isOpen, tab, fetchNotifications]);

  // ─── Actions ───

  const handleMarkAsRead = async (notificationId: string) => {
    if (!companyId) return;
    try {
      await notificationService.markAsRead(companyId, notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!companyId) return;
    try {
      await notificationService.markAllAsRead(companyId, userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const handleNotificationClick = async (notification: CompanyNotification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.action_url && notification.action_url !== '#') {
      setIsOpen(false);
      router.push(notification.action_url);
    }
  };

  // ─── Derived ───

  const displayedNotifications = tab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  // ─── Render helpers ───

  const getIcon = (type: string) => {
    const config = TYPE_CONFIG[type] || { icon: Bell, color: 'bg-gray-500/10 text-gray-500' };
    const Icon = config.icon;
    return (
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', config.color)}>
        <Icon className="h-5 w-5" />
      </div>
    );
  };

  const renderProgressTab = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="font-medium text-gray-500 dark:text-gray-400">Sin tareas en progreso</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
        Las tareas en segundo plano aparecerán aquí
      </p>
    </div>
  );

  const renderNotificationsTab = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      );
    }

    if (displayedNotifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="font-medium text-gray-500 dark:text-gray-400">Sin notificaciones</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {tab === 'unread' ? 'No tienes notificaciones sin leer' : 'Las notificaciones aparecerán aquí'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2 p-1">
        {displayedNotifications.map((notification) => {
          const config = TYPE_CONFIG[notification.type] || { label: notification.type };
          return (
            <div
              key={notification.id}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-slate-700/50 group',
                !notification.is_read
                  ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-800/30'
                  : 'border border-transparent hover:border-gray-200 dark:hover:border-slate-700',
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex gap-3">
                {getIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-normal px-1.5 py-0">
                      {config.label || notification.type}
                    </Badge>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <p className="font-medium text-sm leading-tight text-gray-900 dark:text-gray-100">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {timeAgo(notification.created_at)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Sheet panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <SheetTitle className="text-lg">Notificaciones</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500')} />
                    <span className="text-xs">{isConnected ? 'Conectado' : 'Desconectado'}</span>
                  </SheetDescription>
                </div>
              </div>
              <button
                onClick={toggleSound}
                className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-green-500" />
                ) : (
                  <VolumeX className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                )}
              </button>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <div className="px-4 pt-4">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setTab('progress')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all',
                  tab === 'progress'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                <Loader2 className="h-4 w-4" />
                En Progreso
              </button>
              <button
                onClick={() => setTab('all')}
                className={cn(
                  'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all',
                  tab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                Todas
              </button>
              <button
                onClick={() => setTab('unread')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all',
                  tab === 'unread'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                No leídas
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>

          {/* Mark all as read */}
          {tab !== 'progress' && unreadCount > 0 && (
            <div className="px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs w-full justify-start"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como leídas
              </Button>
            </div>
          )}

          {/* Separator */}
          <div className="border-b border-gray-200 dark:border-slate-700" />

          {/* Content */}
          <ScrollArea className="flex-1 px-3">
            {tab === 'progress' ? renderProgressTab() : renderNotificationsTab()}
          </ScrollArea>

          {/* Footer */}
          {tab !== 'progress' && notifications.length > 0 && (
            <>
              <div className="border-t border-gray-200 dark:border-slate-700" />
              <div className="p-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/dashboard/notifications');
                  }}
                >
                  Ver todas las notificaciones
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
