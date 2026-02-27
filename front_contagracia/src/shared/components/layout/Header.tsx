'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { Moon, Sun, Monitor, Building, Settings, LogOut, ChevronDown, Key, Eye, EyeOff, Loader2, CheckCircle, Mail, CalendarDays, GitBranch } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { changePassword, forgotPassword, verifyResetCode, resetPassword } from '@/modules/auth/services/authService';
import { useAuthImage } from '@/shared/hooks/useAuthImage';
import { useTheme } from '@/shared/providers/ThemeProvider';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type PasswordModalStep = 'change' | 'forgot_sent' | 'verify_code' | 'reset' | 'success';

export function Header() {
  const router = useRouter();
  const { user, company, logout } = useAuth();
  const { can, canAccessModule } = usePermissions();
  const { theme, setTheme: setAppTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  // Password change states
  const [passwordStep, setPasswordStep] = useState<PasswordModalStep>('change');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const { src: logoSrc } = useAuthImage(company?.logo_url);

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setAppTheme(newTheme);
    setIsThemeDropdownOpen(false);
  };

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Reset password modal state
  const resetPasswordModal = () => {
    setPasswordStep('change');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetCode('');
    setResetToken('');
    setPasswordError('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleOpenPasswordModal = () => {
    setIsDropdownOpen(false);
    resetPasswordModal();
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    resetPasswordModal();
  };

  // Cambiar contraseña con contraseña actual
  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Ingresa tu contraseña actual');
      return;
    }
    if (!newPassword) {
      setPasswordError('Ingresa la nueva contraseña');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordStep('success');
    } catch (error: any) {
      setPasswordError(error.message || 'Error al cambiar la contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Enviar código de recuperación por email
  const handleForgotPassword = async () => {
    if (!user?.email) return;

    setPasswordError('');
    setPasswordLoading(true);
    try {
      // Pasar NIT si el usuario está logueado en una empresa
      await forgotPassword({ email: user.email, nit: company?.nit });
      setPasswordStep('forgot_sent');
    } catch (error: any) {
      setPasswordError(error.message || 'Error al enviar el código');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Verificar código de recuperación
  const handleVerifyCode = async () => {
    if (!user?.email) return;

    if (!resetCode || resetCode.length !== 6) {
      setPasswordError('Ingresa el código de 6 dígitos');
      return;
    }

    setPasswordError('');
    setPasswordLoading(true);
    try {
      const response = await verifyResetCode({ email: user.email, code: resetCode });
      setResetToken(response.reset_token);
      setPasswordStep('reset');
    } catch (error: any) {
      setPasswordError(error.message || 'Código inválido o expirado');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Resetear contraseña con token
  const handleResetPassword = async () => {
    if (!newPassword) {
      setPasswordError('Ingresa la nueva contraseña');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setPasswordError('');
    setPasswordLoading(true);
    try {
      await resetPassword({ token: resetToken, new_password: newPassword });
      setPasswordStep('success');
    } catch (error: any) {
      setPasswordError(error.message || 'Error al restablecer la contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Obtener iniciales del usuario
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Icono del tema actual
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <>
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-900 z-50 flex items-center justify-between px-4 pr-16">
      {/* Logo y nombre de empresa */}
      <div className="flex items-center gap-3">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={company?.company_name || 'Logo'}
            className="h-10 max-w-[120px] object-contain rounded-lg"
          />
        ) : (
          <div className="w-10 h-10 bg-linear-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20">
            <span className="text-white font-bold text-lg">
              {company?.company_name?.charAt(0) || 'C'}
            </span>
          </div>
        )}
        <h1 className="text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wide">
          {company?.company_name || 'Contagracia'}
        </h1>
      </div>

      {/* Accesos rápidos + Acciones del header */}
      <div className="flex items-center gap-2">
        {/* Calendario Tributario */}
        {canAccessModule('tax') && can('tax_calendar.view') && (
          <button
            onClick={() => router.push('/dashboard/tax-calendar')}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Calendario Tributario"
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        )}

        {/* Evento Radian */}
        {canAccessModule('electronic_documents') && can('electronic_documents.radian.view') && (
          <button
            onClick={() => router.push('/dashboard/received-invoices')}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Evento Radian"
          >
            <GitBranch className="w-5 h-5" />
          </button>
        )}

        {/* Separador */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Notificaciones */}
        <NotificationDropdown companyId={company?.id} />

        {/* Theme toggle con dropdown */}
        <div className="relative" ref={themeDropdownRef}>
          <button
            onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ThemeIcon className="w-5 h-5" />
          </button>

          {/* Dropdown de tema */}
          {isThemeDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 overflow-hidden">
              <button
                onClick={() => changeTheme('light')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  theme === 'light'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                )}
              >
                <Sun className="w-4 h-4" />
                Claro
              </button>
              <button
                onClick={() => changeTheme('dark')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  theme === 'dark'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                )}
              >
                <Moon className="w-4 h-4" />
                Oscuro
              </button>
              <button
                onClick={() => changeTheme('system')}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  theme === 'system'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                )}
              >
                <Monitor className="w-4 h-4" />
                Sistema
              </button>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user ? getInitials(user.full_name) : 'U'}
              </span>
            </div>
            {/* Info */}
            <div className="text-left hidden sm:block">
              <p className="text-gray-900 dark:text-white text-sm font-medium leading-tight">
                {user?.full_name?.split(' ')[0] || 'Usuario'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs leading-tight">
                {user?.email || 'email@example.com'}
              </p>
            </div>
            <ChevronDown className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              isDropdownOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 overflow-hidden">
              {/* Header del dropdown */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Mi cuenta</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || 'email@example.com'}
                </p>
              </div>

              {/* Opciones */}
              <div className="py-1">
                {can('company.profile.view') && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push('/dashboard/company-profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Building className="w-4 h-4" />
                    Perfil de Empresa
                  </button>
                )}
                <button
                  onClick={handleOpenPasswordModal}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Key className="w-4 h-4" />
                  Cambiar Contraseña
                </button>
                {can('config.view') && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push('/dashboard/configurations');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configuraciones
                  </button>
                )}
              </div>

              {/* Cerrar sesión */}
              <div className="border-t border-gray-100 dark:border-slate-700 pt-1">
                <button
                  onClick={() => { setIsDropdownOpen(false); setShowLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Modal de confirmación de logout */}
    <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Cerrar Sesión</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas cerrar tu sesión?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de cambiar contraseña */}
    <Dialog open={showPasswordModal} onOpenChange={(open) => !open && handleClosePasswordModal()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            {passwordStep === 'success' ? 'Contraseña Actualizada' : 'Cambiar Contraseña'}
          </DialogTitle>
          {passwordStep !== 'success' && (
            <DialogDescription>
              {passwordStep === 'change' && 'Ingresa tu contraseña actual y la nueva contraseña'}
              {passwordStep === 'forgot_sent' && `Enviamos un código de verificación a ${user?.email}`}
              {passwordStep === 'verify_code' && 'Ingresa el código que recibiste por email'}
              {passwordStep === 'reset' && 'Ingresa tu nueva contraseña'}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Paso: Cambiar con contraseña actual */}
        {passwordStep === 'change' && (
          <div className="space-y-4 mt-2">
            {/* Contraseña actual */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contraseña Actual
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={passwordLoading}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                ¿Se te olvidó la contraseña antigua?
              </button>
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClosePasswordModal}>
                Cancelar
              </Button>
              <Button onClick={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Cambiar Contraseña
              </Button>
            </div>
          </div>
        )}

        {/* Paso: Código enviado */}
        {passwordStep === 'forgot_sent' && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-center py-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Revisa tu bandeja de entrada y tu carpeta de spam.
              El código expira en 15 minutos.
            </p>

            {/* Campo de código */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Código de Verificación
              </label>
              <Input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>

            {passwordError && (
              <p className="text-sm text-red-600 text-center">{passwordError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setPasswordStep('change')}>
                Volver
              </Button>
              <Button onClick={handleVerifyCode} disabled={passwordLoading || resetCode.length !== 6}>
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verificar Código
              </Button>
            </div>
          </div>
        )}

        {/* Paso: Reset con token */}
        {passwordStep === 'reset' && (
          <div className="space-y-4 mt-2">
            {/* Nueva contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClosePasswordModal}>
                Cancelar
              </Button>
              <Button onClick={handleResetPassword} disabled={passwordLoading}>
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Restablecer Contraseña
              </Button>
            </div>
          </div>
        )}

        {/* Paso: Éxito */}
        {passwordStep === 'success' && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Tu contraseña ha sido actualizada correctamente.
            </p>
            <div className="flex justify-center pt-2">
              <Button onClick={handleClosePasswordModal}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

export default Header;
