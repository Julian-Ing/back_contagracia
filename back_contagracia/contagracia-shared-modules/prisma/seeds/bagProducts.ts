/**
 * Bolsa Plástica
 * Categoría y producto paramétrico para el cobro de bolsas plásticas (INCBP)
 *
 * Se crea automáticamente en cada tenant.
 * Usa consecutivos no-numéricos (CAT-BOLSA, BOLSA-*) para no interferir
 * con la numeración estándar (CAT-0001, ART-0001).
 */

export const bagCategory = {
  id: 'bag-category',
  consecutive: 'CAT-BOLSA',
  name: 'Bolsas Plásticas',
  is_bag: true,
};

export const bagProducts = [
  {
    id: 'bag-plastic',
    consecutive: 'BOLSA-001',
    barcode: 'BOLSA-001',
    name: 'Bolsa Plástica',
    tax_id: '7',
    revenue_account_code: '41350503',
  },
];
