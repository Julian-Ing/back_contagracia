'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { ProductThumbnail } from './ProductThumbnail';

interface ProductInfoTabProps {
  product: any;
  showAccounting: boolean;
}

const COSTING_LABELS: Record<string, string> = {
  AVERAGE: 'Promedio ponderado',
  LAST_PURCHASE: 'Última compra',
};

const InfoItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">{label}</p>
    <p className="text-sm text-gray-900 dark:text-white truncate">{children}</p>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 col-span-full pt-3 first:pt-0 border-t border-gray-100 dark:border-slate-700/50 first:border-0">
    {children}
  </h3>
);

const AccountItem = ({ label, account }: { label: string; account: { code: string; name: string } | null }) => (
  <div className="col-span-full min-w-0">
    <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">{label}</p>
    {account ? (
      <p className="text-sm text-gray-900 dark:text-white font-mono truncate">{account.code} — {account.name}</p>
    ) : (
      <p className="text-sm text-gray-400 italic">No asignada</p>
    )}
  </div>
);

export const ProductInfoTab = ({ product, showAccounting }: ProductInfoTabProps) => {
  const isService = product.is_service;

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
          {/* General */}
          <SectionTitle>General</SectionTitle>
          {product.image_path && (
            <div className="row-span-3 flex items-start justify-center">
              <ProductThumbnail imagePath={product.image_path} size={80} className="rounded-lg" />
            </div>
          )}
          <InfoItem label="Código">{product.consecutive}</InfoItem>
          {product.barcode && <InfoItem label="Código de barras">{product.barcode}</InfoItem>}
          <InfoItem label="Tipo">
            <Badge className={`text-xs ${isService
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              {isService ? 'Servicio' : 'Producto'}
            </Badge>
          </InfoItem>
          {product.mode === 'COMBINATION' && (
            <InfoItem label="Modo"><Badge variant="outline" className="text-xs">Combinación</Badge></InfoItem>
          )}
          {!isService && (
            <InfoItem label="Método de costeo">{COSTING_LABELS[product.costing_type] || product.costing_type || '-'}</InfoItem>
          )}
          {product.description && (
            <div className="col-span-full">
              <InfoItem label="Descripción">{product.description}</InfoItem>
            </div>
          )}

          {/* Clasificación */}
          <SectionTitle>Clasificación</SectionTitle>
          <InfoItem label="Categoría">{product.category?.name || <span className="text-gray-400 italic">Sin categoría</span>}</InfoItem>
          <InfoItem label="Unidad">
            {product.unit
              ? `${product.unit.name}${product.unit.symbol ? ` (${product.unit.symbol})` : ''}`
              : <span className="text-gray-400 italic">Sin unidad</span>
            }
          </InfoItem>
          <InfoItem label="Impuesto">
            {product.tax ? `${product.tax.name} (${product.tax.rate}%)` : <span className="text-gray-400 italic">Sin impuesto</span>}
          </InfoItem>
          <InfoItem label="Impuesto incluido">{product.tax_included ? 'Sí' : 'No'}</InfoItem>

          {/* Precios */}
          <SectionTitle>Precios{!isService ? ' e inventario' : ''}</SectionTitle>
          <InfoItem label="Precio de venta"><FormattedNumber value={product.price} type="currency" /></InfoItem>
          {!isService && (
            <InfoItem label="Costo"><FormattedNumber value={product.cost} type="currency" /></InfoItem>
          )}
          {!isService && product.price > 0 && product.cost > 0 && (
            <InfoItem label="Margen">
              <span className={product.price > product.cost ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                <FormattedNumber value={(product.price - product.cost) / product.price} type="percent" />
              </span>
            </InfoItem>
          )}
          {!isService && (
            <InfoItem label="Stock actual"><span className="font-semibold"><FormattedNumber value={product.stock ?? 0} /></span></InfoItem>
          )}

          {/* Contabilidad */}
          {showAccounting && (
            <>
              <SectionTitle>Contabilidad</SectionTitle>
              <AccountItem label="Cuenta de ingresos" account={product.revenue_account} />
              {!isService && (
                <>
                  <AccountItem label="Cuenta de inventario" account={product.asset_account} />
                  <AccountItem label="Cuenta de costo" account={product.cogs_account} />
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
