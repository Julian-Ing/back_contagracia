'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/shared/components/ui/searchable-select";
import { Loader2, Eye, EyeOff, Check, X, Search } from 'lucide-react';
import { login as loginService, registerCompany, sendVerificationCode, verifyCode, checkNitExists, forgotPassword, verifyResetCode, resetPassword } from '@/modules/auth/services/authService';
import type { RegisterCompanyData } from '@/modules/auth/services/authService';
import { queryRut } from '@/shared/services/api/dianClient';
import { useRouter } from 'next/navigation';
import { API_CONFIG } from '@/config/api.config';

// Función para calcular DV del NIT (algoritmo DIAN)
const factores = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
const calcularDV = (nit: string): string => {
  if (!/^\d+$/.test(nit)) return "";
  let suma = 0;
  const nitReverso = nit.split("").reverse();
  for (let i = 0; i < nitReverso.length && i < factores.length; i++) {
    suma += parseInt(nitReverso[i], 10) * factores[i];
  }
  const resto = suma % 11;
  return String(resto > 1 ? 11 - resto : resto);
};

// Componente para mostrar reglas de contraseña
function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
      <span className={ok ? 'text-green-600' : 'text-muted-foreground'}>{text}</span>
    </div>
  );
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();

  // Estados para Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginNit, setLoginNit] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Estados para Registro
  const [companyName, setCompanyName] = useState('');
  const [companySector, setCompanySector] = useState('');
  const [nit, setNit] = useState('');
  const [dv, setDv] = useState('');
  const [nitError, setNitError] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [typeOrganizationId, setTypeOrganizationId] = useState('');
  const [typeDocumentId, setTypeDocumentId] = useState('');
  const [typeRegimeId, setTypeRegimeId] = useState('');
  const [typeLiabilityId, setTypeLiabilityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Estados para opciones de catálogos
  const [typeOrganizations, setTypeOrganizations] = useState<SearchableSelectOption[]>([]);
  const [typeDocuments, setTypeDocuments] = useState<SearchableSelectOption[]>([]);
  const [typeRegimes, setTypeRegimes] = useState<SearchableSelectOption[]>([]);
  const [typeLiabilities, setTypeLiabilities] = useState<SearchableSelectOption[]>([]);
  const [departments, setDepartments] = useState<SearchableSelectOption[]>([]);
  const [municipalities, setMunicipalities] = useState<SearchableSelectOption[]>([]);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState({ percent: 0, label: '' });
  const [loadingRut, setLoadingRut] = useState(false);
  const [showPassReg, setShowPassReg] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para recuperación de contraseña
  const [forgotStep, setForgotStep] = useState<'none' | 'code_sent' | 'code_verified'>('none');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loadingReset, setLoadingReset] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);

  // Estados para verificación de email OTP
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeExpiresIn, setCodeExpiresIn] = useState(0);

  // Progreso simulado durante el registro
  useEffect(() => {
    if (!loading || activeTab !== 'register') {
      setRegistrationProgress({ percent: 0, label: '' });
      return;
    }
    const steps = [
      { percent: 5, label: 'Creando empresa...', delay: 500 },
      { percent: 15, label: 'Creando base de datos...', delay: 2000 },
      { percent: 30, label: 'Ejecutando migraciones...', delay: 4000 },
      { percent: 45, label: 'Configurando catálogos...', delay: 8000 },
      { percent: 60, label: 'Configurando catálogos...', delay: 15000 },
      { percent: 75, label: 'Configurando catálogos...', delay: 22000 },
      { percent: 85, label: 'Configurando catálogos...', delay: 30000 },
      { percent: 92, label: 'Creando usuario administrador...', delay: 35000 },
      { percent: 96, label: 'Finalizando...', delay: 38000 },
    ];
    const timers = steps.map((step) =>
      setTimeout(() => setRegistrationProgress({ percent: step.percent, label: step.label }), step.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [loading, activeTab]);

  // Validación de contraseña
  const passChecks = (s: string) => ({
    length: s.length >= 8,
    lower: /[a-z]/.test(s),
    upper: /[A-Z]/.test(s),
    digit: /\d/.test(s),
  });

  const registerPassState = passChecks(registerPassword);
  const registerAllGood = registerPassState.length && registerPassState.lower && registerPassState.upper && registerPassState.digit;

  // Fetch catálogos paramétricos del master
  const fetchCatalog = useCallback(async (table: string): Promise<SearchableSelectOption[]> => {
    try {
      const res = await fetch(`${API_CONFIG.ADMIN}/admin/catalogs/${table}`);
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json) ? json : json.data ?? [];
      return items.map((item: any) => ({ value: String(item.id), label: item.name, description: item.code }));
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchCatalog('type-organizations').then(setTypeOrganizations);
    fetchCatalog('type-document-identifications').then(setTypeDocuments);
    fetchCatalog('type-regimes').then(setTypeRegimes);
    fetchCatalog('type-liabilities').then(setTypeLiabilities);
    fetchCatalog('departments').then(setDepartments);
  }, [isOpen, fetchCatalog]);

  // Fetch municipios cuando cambia el departamento
  useEffect(() => {
    if (!departmentId) {
      setMunicipalities([]);
      setMunicipalityId('');
      return;
    }
    fetch(`${API_CONFIG.ADMIN}/admin/catalogs/municipalities/by-department/${departmentId}`)
      .then(res => res.ok ? res.json() : [])
      .then((json: any) => {
        const items = Array.isArray(json) ? json : json.data ?? [];
        setMunicipalities(items.map((item: any) => ({ value: String(item.id), label: item.name })));
        setMunicipalityId('');
      })
      .catch(() => setMunicipalities([]));
  }, [departmentId]);

  const passwordsMatch = registerPassword.length > 0
    && confirmPassword.length > 0
    && registerPassword === confirmPassword;

  const canSubmit = registerAllGood && passwordsMatch && !loading && !nitError;

  // Consulta RUT por NIT
  const handleRutQuery = async () => {
    if (!nit) {
      setError('Debes ingresar un NIT para consultar.');
      return;
    }
    setLoadingRut(true);
    setError('');
    setNitError('');

    try {
      // Primero verificar si el NIT ya está registrado
      const nitCheck = await checkNitExists(nit);
      if (nitCheck.exists) {
        setNitError('Este NIT ya está registrado en el sistema');
        setLoadingRut(false);
        return;
      }

      // Si no existe, consultar en la DIAN
      const response = await queryRut(nit);

      if (response.success && response.data) {
        const data = response.data;
        if (data.business_name) setCompanyName(data.business_name);
        if (data.email && !emailVerified) setRegisterEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.phone) setPhone(data.phone);
      } else {
        setError(response.message || 'No se encontró información para este NIT');
      }
    } catch (err: any) {
      setError(err.message || 'Error al consultar el RUT');
    } finally {
      setLoadingRut(false);
    }
  };

  // Enviar código de verificación
  const handleSendCode = async () => {
    if (!registerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail.trim())) {
      setError('Ingresa un email válido');
      return;
    }

    setLoadingCode(true);
    setError('');

    try {
      const response = await sendVerificationCode({ email: registerEmail.trim() });
      setCodeSent(true);
      setCodeExpiresIn(response.expires_in);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el código');
    } finally {
      setLoadingCode(false);
    }
  };

  // Verificar código OTP
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setLoadingCode(true);
    setError('');

    try {
      const response = await verifyCode({
        email: registerEmail.trim(),
        code: verificationCode,
      });
      setEmailVerified(true);
      setRegistrationToken(response.registration_token);
      setCodeSent(false);
    } catch (err: any) {
      setError(err.message || 'Código inválido o expirado');
    } finally {
      setLoadingCode(false);
    }
  };

  // Enviar código de recuperación de contraseña
  const handleSendResetCode = async () => {
    if (!loginEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      setError('Ingresa un email válido en el campo de Email');
      return;
    }

    setLoadingReset(true);
    setError('');

    try {
      await forgotPassword({
        email: loginEmail.trim(),
        nit: loginNit.trim() || undefined, // Si hay NIT, enviarlo
      });
      setForgotStep('code_sent');
      setSuccessMessage('Si el email existe, recibirás un código de verificación');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el código');
    } finally {
      setLoadingReset(false);
    }
  };

  // Verificar código de recuperación
  const handleVerifyResetCode = async () => {
    if (!resetCode || resetCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setLoadingReset(true);
    setError('');

    try {
      const response = await verifyResetCode({
        email: loginEmail.trim(),
        code: resetCode,
      });
      setResetToken(response.reset_token);
      setForgotStep('code_verified');
      setSuccessMessage('Código verificado. Ingresa tu nueva contraseña.');
    } catch (err: any) {
      setError(err.message || 'Código inválido o expirado');
    } finally {
      setLoadingReset(false);
    }
  };

  // Restablecer contraseña
  const handleResetPassword = async () => {
    const newPassState = passChecks(newPassword);
    const newPassAllGood = newPassState.length && newPassState.lower && newPassState.upper && newPassState.digit;

    if (!newPassAllGood) {
      setError('La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoadingReset(true);
    setError('');

    try {
      await resetPassword({
        token: resetToken,
        new_password: newPassword,
      });
      // Reset todos los estados de recuperación
      setForgotStep('none');
      setResetCode('');
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMessage('Contraseña restablecida exitosamente. Ya puedes iniciar sesión.');
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoadingReset(false);
    }
  };

  // Cancelar recuperación de contraseña
  const handleCancelReset = () => {
    setForgotStep('none');
    setResetCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError('');
    setSuccessMessage('');
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await loginService({
        nit: loginNit.trim(),
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });

      onClose();
      // Solo system_admin (usuarios master) van a /admin, todos los demás a /dashboard
      if (response.user_type === 'system_admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validaciones
    if (!emailVerified || !registrationToken) {
      setError("Debes verificar tu email primero.");
      return;
    }

    if (!registerAllGood) {
      setError("La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.");
      return;
    }

    if (!companyName.trim()) {
      setError("Debes ingresar el nombre de la empresa.");
      return;
    }

    if (!companySector.trim()) {
      setError("Debes ingresar el sector de la empresa.");
      return;
    }

    if (!nit.trim()) {
      setError("Debes ingresar el NIT.");
      return;
    }

    if (!dv && dv !== '0') {
      setError("Debes ingresar el dígito de verificación.");
      return;
    }

    if (!address.trim()) {
      setError("Debes ingresar la dirección.");
      return;
    }

    if (!phone.trim() || phone.trim().length < 7 || phone.trim().length > 15) {
      setError("Debes ingresar un número de teléfono válido (7-15 dígitos).");
      return;
    }

    if (!typeOrganizationId) {
      setError("Debes seleccionar el tipo de persona.");
      return;
    }

    if (!typeDocumentId) {
      setError("Debes seleccionar el tipo de documento.");
      return;
    }

    if (!typeRegimeId) {
      setError("Debes seleccionar el régimen tributario.");
      return;
    }

    if (!typeLiabilityId) {
      setError("Debes seleccionar la responsabilidad fiscal.");
      return;
    }

    if (!departmentId) {
      setError("Debes seleccionar el departamento.");
      return;
    }

    if (!municipalityId) {
      setError("Debes seleccionar el municipio.");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!fullName.trim()) {
      setError("Debes ingresar tu nombre completo.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registerData: RegisterCompanyData = {
        // Datos de la empresa
        company_name: companyName.trim(),
        nit: nit.trim(),
        dv: dv || undefined,
        company_email: registerEmail.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,

        // Paramétricos
        type_organization_id: typeOrganizationId || undefined,
        type_document_identification_id: typeDocumentId || undefined,
        type_regime_id: typeRegimeId || undefined,
        type_liability_id: typeLiabilityId || undefined,
        department_id: departmentId || undefined,
        municipality_id: municipalityId || undefined,

        // Datos del administrador
        admin_email: registerEmail.trim(),
        admin_password: registerPassword.trim(),
        admin_full_name: fullName.trim(),

        // Token de verificación
        registration_token: registrationToken,
      };

      await registerCompany(registerData);

      setRegistrationProgress({ percent: 100, label: '¡Registro completado!' });
      // Limpiar errores y mostrar éxito
      setError('');

      // Pre-cargar datos en el formulario de login
      setLoginEmail(registerEmail.trim());
      setLoginNit(nit.trim());
      setLoginPassword('');

      // Mostrar mensaje de éxito y cambiar al tab de login
      setSuccessMessage('¡Registro exitoso! Ingresa tu contraseña para iniciar sesión.');
      setActiveTab('login');

    } catch (err: any) {
      setError(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Bienvenido a Contagracia
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Accede a tu cuenta o crea una nueva para empezar.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSuccessMessage(''); setError(''); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <div className="grid gap-4 py-4">
                {successMessage && (
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    {successMessage}
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <Label>NIT de la Empresa <span className="text-xs text-muted-foreground font-normal">(opcional para super admin)</span></Label>
                <Input
                  type="text"
                  placeholder="Dejar vacío para super admin"
                  value={loginNit}
                  onChange={e => setLoginNit(e.target.value)}
                />

                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                />

                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    placeholder='tucontraseña123'
                    type={showPass ? "text" : "password"}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Flujo normal de login */}
                {forgotStep === 'none' && (
                  <>
                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      disabled={loadingReset || !loginEmail.trim()}
                      className="text-sm text-primary underline underline-offset-4 text-left disabled:opacity-50"
                    >
                      {loadingReset ? 'Enviando código...' : '¿Olvidaste tu contraseña?'}
                    </button>

                    <Button
                      type="submit"
                      className="w-full mt-4"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </Button>
                  </>
                )}

                {/* Paso 1: Ingresar código de verificación */}
                {forgotStep === 'code_sent' && (
                  <div className="mt-2 grid gap-3 rounded-md border p-4 bg-muted/30">
                    <div className="text-center">
                      <h4 className="font-semibold">Recuperar contraseña</h4>
                      <p className="text-sm text-muted-foreground">
                        Ingresa el código de 6 dígitos enviado a {loginEmail}
                      </p>
                    </div>

                    <div>
                      <Label>Código de verificación</Label>
                      <Input
                        type="text"
                        placeholder="123456"
                        value={resetCode}
                        onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleCancelReset}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleVerifyResetCode}
                        disabled={loadingReset || resetCode.length !== 6}
                      >
                        {loadingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loadingReset ? 'Verificando...' : 'Verificar'}
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendResetCode}
                      disabled={loadingReset}
                      className="text-sm text-primary underline underline-offset-4 text-center"
                    >
                      Reenviar código
                    </button>
                  </div>
                )}

                {/* Paso 2: Ingresar nueva contraseña */}
                {forgotStep === 'code_verified' && (
                  <div className="mt-2 grid gap-3 rounded-md border p-4 bg-muted/30">
                    <div className="text-center">
                      <h4 className="font-semibold">Nueva contraseña</h4>
                      <p className="text-sm text-muted-foreground">
                        Ingresa tu nueva contraseña
                      </p>
                    </div>

                    <div>
                      <Label>Nueva contraseña</Label>
                      <div className="relative">
                        <Input
                          type={showNewPass ? "text" : "password"}
                          placeholder="Nueva contraseña"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        >
                          {showNewPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label>Confirmar contraseña</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmNewPass ? "text" : "password"}
                          placeholder="Confirmar contraseña"
                          value={confirmNewPassword}
                          onChange={e => setConfirmNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmNewPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Reglas de contraseña */}
                    <div className="grid gap-1">
                      <RuleRow ok={passChecks(newPassword).length} text="Mínimo 8 caracteres" />
                      <RuleRow ok={passChecks(newPassword).lower} text="Al menos 1 minúscula" />
                      <RuleRow ok={passChecks(newPassword).upper} text="Al menos 1 mayúscula" />
                      <RuleRow ok={passChecks(newPassword).digit} text="Al menos 1 número" />
                      <RuleRow ok={newPassword.length > 0 && newPassword === confirmNewPassword} text="Las contraseñas coinciden" />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleCancelReset}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleResetPassword}
                        disabled={loadingReset || !newPassword || newPassword !== confirmNewPassword}
                      >
                        {loadingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loadingReset ? 'Guardando...' : 'Guardar contraseña'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </TabsContent>

          {/* REGISTRO */}
          <TabsContent value="register">
            <div className="grid gap-4 py-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* PASO 1: Verificación de Email */}
              {!emailVerified && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">Verifica tu email</h3>
                    <p className="text-sm text-muted-foreground">
                      Primero necesitamos verificar tu correo electrónico
                    </p>
                  </div>

                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="correo@empresa.com"
                      value={registerEmail}
                      onChange={e => {
                        setRegisterEmail(e.target.value);
                        setCodeSent(false);
                        setVerificationCode('');
                      }}
                      disabled={codeSent}
                      required
                    />
                  </div>

                  {!codeSent ? (
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleSendCode}
                      disabled={loadingCode || !registerEmail.trim()}
                    >
                      {loadingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loadingCode ? 'Enviando...' : 'Enviar codigo de verificacion'}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm">
                        Codigo enviado a {registerEmail}. Revisa tu bandeja de entrada.
                      </div>

                      <div>
                        <Label>Codigo de verificacion (6 digitos) *</Label>
                        <Input
                          type="text"
                          placeholder="123456"
                          value={verificationCode}
                          onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          className="text-center text-2xl tracking-widest"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setCodeSent(false);
                            setVerificationCode('');
                          }}
                        >
                          Cambiar email
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={handleVerifyCode}
                          disabled={loadingCode || verificationCode.length !== 6}
                        >
                          {loadingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {loadingCode ? 'Verificando...' : 'Verificar codigo'}
                        </Button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={loadingCode}
                        className="text-sm text-primary underline underline-offset-4 w-full text-center"
                      >
                        Reenviar codigo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: Formulario de Registro (solo si email verificado) */}
              {emailVerified && (
                <form onSubmit={handleRegister}>
                  <div className="grid gap-4">
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Email verificado: {registerEmail}
                    </div>

                    {/* NIT con búsqueda DIAN */}
                    <Label>NIT</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="900123456"
                        value={nit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setNit(value);
                          setDv(calcularDV(value));
                          setNitError('');
                        }}
                        className={nitError ? "border-destructive" : ""}
                      />
                      <Input placeholder="DV" value={dv} readOnly className="w-16" />
                      <Button
                        type="button"
                        onClick={handleRutQuery}
                        disabled={loadingRut || !nit}
                        title="Buscar datos en la DIAN"
                      >
                        {loadingRut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {nitError && (
                      <p className="text-sm text-destructive mt-1">{nitError}</p>
                    )}

                    {/* Nombre de empresa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre de la empresa *</Label>
                        <Input
                          placeholder="Tu Empresa S.A.S"
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Nombre del Administrador *</Label>
                        <Input
                          placeholder="Tu nombre completo"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Sector y Teléfono */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Sector *</Label>
                        <Input
                          placeholder="Ej: Tecnología"
                          value={companySector}
                          onChange={e => setCompanySector(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Teléfono *</Label>
                        <Input
                          placeholder="Ej: 3114872603"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          minLength={7}
                          maxLength={15}
                          required
                        />
                      </div>
                    </div>

                    {/* Tipo de Persona y Tipo de Documento */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Persona *</Label>
                        <SearchableSelect
                          options={typeOrganizations}
                          value={typeOrganizationId}
                          onChange={setTypeOrganizationId}
                          placeholder="Buscar tipo..."
                        />
                      </div>
                      <div>
                        <Label>Tipo de Documento *</Label>
                        <SearchableSelect
                          options={typeDocuments}
                          value={typeDocumentId}
                          onChange={setTypeDocumentId}
                          placeholder="Buscar documento..."
                        />
                      </div>
                    </div>

                    {/* Régimen Tributario y Responsabilidad Fiscal */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Régimen Tributario *</Label>
                        <SearchableSelect
                          options={typeRegimes}
                          value={typeRegimeId}
                          onChange={setTypeRegimeId}
                          placeholder="Buscar régimen..."
                        />
                      </div>
                      <div>
                        <Label>Responsabilidad Fiscal *</Label>
                        <SearchableSelect
                          options={typeLiabilities}
                          value={typeLiabilityId}
                          onChange={setTypeLiabilityId}
                          placeholder="Buscar responsabilidad..."
                        />
                      </div>
                    </div>

                    {/* Departamento y Municipio */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Departamento *</Label>
                        <SearchableSelect
                          options={departments}
                          value={departmentId}
                          onChange={setDepartmentId}
                          placeholder="Buscar departamento..."
                        />
                      </div>
                      <div>
                        <Label>Municipio *</Label>
                        <SearchableSelect
                          options={municipalities}
                          value={municipalityId}
                          onChange={setMunicipalityId}
                          placeholder={departmentId ? "Buscar municipio..." : "Seleccione departamento"}
                          disabled={!departmentId}
                        />
                      </div>
                    </div>

                    {/* Dirección */}
                    <div>
                      <Label>Direccion *</Label>
                      <Input
                        placeholder="Direccion de la empresa"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                      />
                    </div>

                    {/* Contraseñas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contraseña *</Label>
                        <div className="relative">
                          <Input
                            autoComplete="new-password"
                            type={showPassReg ? "text" : "password"}
                            placeholder="Ingresa tu contraseña"
                            value={registerPassword}
                            onChange={e => setRegisterPassword(e.target.value)}
                            className={!registerAllGood && registerPassword ? "border-destructive" : ""}
                            minLength={8}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassReg(!showPassReg)}
                            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                          >
                            {showPassReg ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label>Confirmar Contraseña *</Label>
                        <div className="relative">
                          <Input
                            autoComplete="new-password"
                            type={showPassConfirm ? "text" : "password"}
                            placeholder="Confirma tu contraseña"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className={confirmPassword && !passwordsMatch ? "border-destructive" : ""}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassConfirm(!showPassConfirm)}
                            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                          >
                            {showPassConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>

                        {/* Pista de coincidencia */}
                        <div className="mt-1">
                          <RuleRow
                            ok={passwordsMatch}
                            text={passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas deben coincidir"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reglas de contraseña */}
                    <div className="grid gap-1 mt-2">
                      <RuleRow ok={registerPassState.length} text="Mínimo 8 caracteres" />
                      <RuleRow ok={registerPassState.lower} text="Al menos 1 letra minúscula" />
                      <RuleRow ok={registerPassState.upper} text="Al menos 1 letra mayúscula" />
                      <RuleRow ok={registerPassState.digit} text="Al menos 1 número" />
                    </div>

                    {loading && registrationProgress.percent > 0 ? (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {registrationProgress.label}
                          </span>
                          <span>{registrationProgress.percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${registrationProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full mt-4"
                        disabled={!canSubmit}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Registrando...' : 'Crear Cuenta'}
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
