/**
 * AIU (Administración, Imprevistos, Utilidad)
 * Categoría y servicios paramétricos para facturación AIU (tipo operación DIAN 09)
 *
 * Estos items se crean automáticamente en cada tenant.
 * Usan consecutivos no-numéricos (CAT-AIU, AIU-*) para no interferir
 * con la numeración estándar (CAT-0001, ART-0001).
 */

export const aiuCategory = {
  id: 'aiu-category',
  consecutive: 'CAT-AIU',
  name: 'AIU',
  is_aiu: true,
};

export const aiuProducts = [
  {
    id: 'aiu-administration',
    consecutive: 'AIU-ADM',
    barcode: 'AIU-ADM',
    name: 'Administración',
    revenue_account_code: '413507',
  },
  {
    id: 'aiu-contingencies',
    consecutive: 'AIU-IMP',
    barcode: 'AIU-IMP',
    name: 'Imprevistos',
    revenue_account_code: '413508',
  },
  {
    id: 'aiu-utility',
    consecutive: 'AIU-UTI',
    barcode: 'AIU-UTI',
    name: 'Utilidad',
    revenue_account_code: '413509',
  },
];
