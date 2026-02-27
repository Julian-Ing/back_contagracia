/**
 * Utilidad para parsear colores/gradientes del CMS.
 * Soporta tanto clases Tailwind (from-purple-500 to-indigo-500)
 * como HEX custom (from-[#ff0000] to-[#0000ff]).
 */

interface GradientResult {
  className: string;
  style: React.CSSProperties;
  isCustom: boolean;
}

export function parseGradient(
  color: string | undefined,
  baseClassName: string = '',
): GradientResult {
  if (!color) {
    return { className: baseClassName, style: {}, isCustom: false };
  }

  const isCustom = color.includes('[#') || color.includes('[');

  if (!isCustom) {
    return {
      className: `${baseClassName} bg-gradient-to-r ${color}`,
      style: {},
      isCustom: false,
    };
  }

  const isSolid = color.startsWith('bg-[');
  if (isSolid) {
    const hexMatch = color.match(/#[\w]+/);
    return {
      className: baseClassName,
      style: hexMatch ? { background: hexMatch[0] } : {},
      isCustom: true,
    };
  }

  const matches = color.match(/from-\[([#\w]+)\]\s*to-\[([#\w]+)\]/);
  if (matches) {
    const fromColor = matches[1].startsWith('#') ? matches[1] : `#${matches[1]}`;
    const toColor = matches[2].startsWith('#') ? matches[2] : `#${matches[2]}`;
    return {
      className: baseClassName,
      style: { backgroundImage: `linear-gradient(to right, ${fromColor}, ${toColor})` },
      isCustom: true,
    };
  }

  return { className: baseClassName, style: {}, isCustom: true };
}

export function parseTextGradient(gradient: string | undefined): {
  className: string;
  style: React.CSSProperties;
} {
  if (!gradient) {
    return {
      className: 'bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent',
      style: {},
    };
  }

  const isCustom = gradient.includes('[#');

  if (!isCustom) {
    return {
      className: `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`,
      style: {},
    };
  }

  const matches = gradient.match(/from-\[([#\w]+)\]\s*to-\[([#\w]+)\]/);
  if (matches) {
    return {
      className: '',
      style: {
        backgroundImage: `linear-gradient(to right, ${matches[1]}, ${matches[2]})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      },
    };
  }

  return {
    className: 'bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent',
    style: {},
  };
}
