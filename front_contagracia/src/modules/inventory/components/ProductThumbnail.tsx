'use client';

import { Package } from 'lucide-react';
import { useAuthImage } from '@/shared/hooks/useAuthImage';
import { cn } from '@/shared/lib/utils';

interface ProductThumbnailProps {
  imagePath: string | null;
  size?: number;
  className?: string;
}

export const ProductThumbnail = ({ imagePath, size = 32, className }: ProductThumbnailProps) => {
  const { src, loading } = useAuthImage(imagePath);

  if (loading) {
    return (
      <div
        className={cn('rounded bg-gray-200 dark:bg-slate-700 animate-pulse shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (src) {
    return (
      <img
        src={src}
        alt="Producto"
        className={cn('rounded object-cover shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center shrink-0',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Package className="text-gray-400 dark:text-slate-500" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
};
