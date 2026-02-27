'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { publicFormsService } from '@/modules/crm/services/crm.service';
import { cn } from '@/shared/lib/utils';

interface FormField {
  id: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  position: number;
  options?: {
    label?: string;
    placeholder?: string;
    choices?: string[];
  } | string[];
}

interface PublicForm {
  id: string;
  name: string;
  slug: string;
  description?: string;
  redirect_url?: string;
  thank_you_message?: string;
  fields: FormField[];
}

export default function EmbedFormPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PublicForm | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchForm() {
      try {
        setLoading(true);
        setError(null);
        const data = await publicFormsService.getForm(companyId, slug);
        setForm(data);

        // Initialize form data
        const initialData: Record<string, string | boolean> = {};
        (data.fields || []).forEach((field: FormField) => {
          initialData[field.field_name] = field.field_type === 'checkbox' ? false : '';
        });
        setFormData(initialData);
      } catch (err) {
        console.error('Error fetching form:', err);
        setError('El formulario no existe o no está disponible.');
      } finally {
        setLoading(false);
      }
    }

    if (companyId && slug) {
      fetchForm();
    }
  }, [companyId, slug]);

  function getFieldLabel(field: FormField): string {
    if (field.options && typeof field.options === 'object' && !Array.isArray(field.options)) {
      return field.options.label || field.field_name;
    }
    return field.field_name;
  }

  function getFieldPlaceholder(field: FormField): string {
    if (field.options && typeof field.options === 'object' && !Array.isArray(field.options)) {
      return field.options.placeholder || '';
    }
    return '';
  }

  function getFieldChoices(field: FormField): string[] {
    if (field.options && typeof field.options === 'object' && !Array.isArray(field.options)) {
      return field.options.choices || [];
    }
    if (Array.isArray(field.options)) {
      return field.options;
    }
    return [];
  }

  function handleChange(fieldName: string, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    (form?.fields || []).forEach((field) => {
      const value = formData[field.field_name];

      if (field.is_required) {
        if (field.field_type === 'checkbox') {
          if (!value) {
            errors[field.field_name] = `${getFieldLabel(field)} es requerido`;
          }
        } else if (!value || (typeof value === 'string' && !value.trim())) {
          errors[field.field_name] = `${getFieldLabel(field)} es requerido`;
        }
      }

      if (field.field_type === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.field_name] = 'Email inválido';
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await publicFormsService.submit(companyId, slug, formData);

      setSubmitted(true);

      // Redirect if URL provided (use top window for iframe)
      if (result.redirect_url) {
        setTimeout(() => {
          try {
            // Try to redirect the parent window (works if same origin or allowed)
            if (window.top) {
              window.top.location.href = result.redirect_url;
            } else {
              window.location.href = result.redirect_url;
            }
          } catch {
            // If cross-origin restriction, redirect within iframe
            window.location.href = result.redirect_url;
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Hubo un problema al enviar el formulario. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(field: FormField) {
    const label = getFieldLabel(field);
    const placeholder = getFieldPlaceholder(field);
    const fieldError = fieldErrors[field.field_name];

    switch (field.field_type) {
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name} className="text-gray-700 dark:text-gray-300">
              {label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.field_name}
              value={(formData[field.field_name] as string) || ''}
              onChange={(e) => handleChange(field.field_name, e.target.value)}
              placeholder={placeholder}
              rows={3}
              className={cn(
                'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600',
                fieldError && 'border-red-500'
              )}
            />
            {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
          </div>
        );

      case 'select':
        const choices = getFieldChoices(field);
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name} className="text-gray-700 dark:text-gray-300">
              {label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              options={choices.map((opt) => ({ value: opt, label: opt }))}
              value={(formData[field.field_name] as string) || ''}
              onChange={(value) => handleChange(field.field_name, value)}
              placeholder={placeholder || 'Selecciona una opción'}
            />
            {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-3">
            <Checkbox
              id={field.field_name}
              checked={(formData[field.field_name] as boolean) || false}
              onCheckedChange={(checked) => handleChange(field.field_name, !!checked)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor={field.field_name}
                className="text-sm font-normal cursor-pointer text-gray-700 dark:text-gray-300"
              >
                {label}
                {field.is_required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
            </div>
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name} className="text-gray-700 dark:text-gray-300">
              {label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type={field.field_type === 'tel' ? 'tel' : field.field_type === 'email' ? 'email' : field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
              value={(formData[field.field_name] as string) || ''}
              onChange={(e) => handleChange(field.field_name, e.target.value)}
              placeholder={placeholder}
              className={cn(
                'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600',
                fieldError && 'border-red-500'
              )}
            />
            {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
          </div>
        );
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !form) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Formulario no disponible
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 p-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            ¡Gracias!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {form?.thank_you_message || 'Hemos recibido tu información. Te contactaremos pronto.'}
          </p>
          {form?.redirect_url && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Redirigiendo...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Form state - compact for embed
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900 p-4 sm:p-6 overflow-auto">
      <div className="w-full max-w-xl my-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{form?.name}</h1>
          {form?.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(form?.fields || [])
            .sort((a, b) => a.position - b.position)
            .map((field) => renderField(field))}

          {error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
