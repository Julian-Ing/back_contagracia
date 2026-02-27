/**
 * Utilidades para resolución de props responsive del Page Builder.
 *
 * Modelo: desktop-first con overrides.
 * Las props base (raíz) son desktop. `_responsive.tablet` y `_responsive.mobile`
 * contienen solo las propiedades que cambian en ese breakpoint.
 */

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export const BREAKPOINTS = {
  tablet: 1024,
  mobile: 768,
} as const;

export const MEDIA_QUERIES = {
  tablet: `(max-width: ${BREAKPOINTS.tablet}px)`,
  mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
} as const;

interface ResponsiveData {
  _responsive?: {
    tablet?: Record<string, unknown>;
    mobile?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

/**
 * Resuelve las props de un componente para un viewport dado.
 * Desktop retorna las props base (sin _responsive).
 * Tablet/mobile mergea los overrides sobre las props base.
 */
export function resolveProps(
  props: Record<string, unknown>,
  viewport: ViewportMode,
): Record<string, unknown> {
  const { _responsive, ...base } = props as ResponsiveData;
  if (viewport === 'desktop' || !_responsive) {
    return base;
  }
  const overrides = _responsive[viewport] || {};
  return { ...base, ...overrides };
}

/**
 * Resuelve el content de una sección para un viewport dado.
 */
export function resolveContent(
  content: Record<string, unknown>,
  viewport: ViewportMode,
): Record<string, unknown> {
  const { _responsive, ...base } = content as ResponsiveData;
  if (viewport === 'desktop' || !_responsive) {
    return base;
  }
  const overrides = _responsive[viewport] || {};
  return { ...base, ...overrides };
}

/**
 * Escribe una propiedad en el nivel correcto según el viewport.
 * Desktop: escribe directo en props raíz.
 * Tablet/mobile: escribe en _responsive[viewport].
 */
export function setResponsiveProp(
  props: Record<string, unknown>,
  viewport: ViewportMode,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const newProps = { ...props };

  if (viewport === 'desktop') {
    newProps[key] = value;
  } else {
    const responsive = { ...((newProps._responsive as ResponsiveData['_responsive']) || {}) };
    responsive[viewport] = { ...(responsive[viewport] || {}), [key]: value };
    newProps._responsive = responsive;
  }

  return newProps;
}

/**
 * Escribe una propiedad de content de sección en el nivel correcto según el viewport.
 */
export function setResponsiveContent(
  content: Record<string, unknown>,
  viewport: ViewportMode,
  key: string,
  value: unknown,
): Record<string, unknown> {
  return setResponsiveProp(content, viewport, key, value);
}

/**
 * Elimina un override de una propiedad para un viewport dado.
 * El componente heredará el valor de desktop.
 */
export function clearResponsiveOverride(
  props: Record<string, unknown>,
  viewport: ViewportMode,
  key: string,
): Record<string, unknown> {
  if (viewport === 'desktop') return props;

  const newProps = { ...props };
  const responsive = { ...((newProps._responsive as ResponsiveData['_responsive']) || {}) };
  if (responsive[viewport]) {
    const viewportOverrides = { ...responsive[viewport] };
    delete viewportOverrides[key];
    if (Object.keys(viewportOverrides).length === 0) {
      delete responsive[viewport];
    } else {
      responsive[viewport] = viewportOverrides;
    }
  }
  if (Object.keys(responsive).length === 0) {
    delete newProps._responsive;
  } else {
    newProps._responsive = responsive;
  }
  return newProps;
}

/**
 * Verifica si una propiedad tiene override en un viewport dado.
 */
export function hasResponsiveOverride(
  props: Record<string, unknown>,
  viewport: ViewportMode,
  key: string,
): boolean {
  if (viewport === 'desktop') return false;
  const responsive = (props._responsive as ResponsiveData['_responsive']) || {};
  return responsive[viewport] ? key in responsive[viewport]! : false;
}

/**
 * Copia todas las props responsive de desktop a un viewport dado.
 * Útil para "inicializar" los overrides de tablet/mobile con los valores actuales de desktop.
 */
export function copyDesktopToViewport(
  props: Record<string, unknown>,
  viewport: ViewportMode,
  responsiveKeys: string[],
): Record<string, unknown> {
  if (viewport === 'desktop') return props;

  const newProps = { ...props };
  const responsive = { ...((newProps._responsive as ResponsiveData['_responsive']) || {}) };
  const overrides: Record<string, unknown> = { ...(responsive[viewport] || {}) };

  for (const key of responsiveKeys) {
    if (key in props && key !== '_responsive') {
      overrides[key] = props[key];
    }
  }

  responsive[viewport] = overrides;
  newProps._responsive = responsive;
  return newProps;
}
