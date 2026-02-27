# PERMISOS GRANULARES - HORIZONT (33 MÓDULOS)

Análisis exhaustivo de permisos por acción para cada módulo.

---

## MÓDULO 1: DASHBOARD
| # | Permiso | Descripción |
|---|---------|-------------|
| 1 | dashboard.view | Ver dashboard principal |

**Total Módulo 1: 1 permiso**

---

## MÓDULO 2: COMPANY_PROFILE
| # | Permiso | Descripción |
|---|---------|-------------|
| 2 | company.profile.view | Ver perfil de empresa |
| 3 | company.profile.edit | Editar datos generales |
| 4 | company.logo.upload | Subir logo |
| 5 | company.logo.delete | Eliminar logo |
| 6 | company.signature.upload | Subir firma digital |
| 7 | company.certificate.upload | Subir certificado DIAN |
| 8 | company.certificate.delete | Eliminar certificado |
| 9 | company.dian.configure | Configurar DIAN |
| 10 | company.email.configure | Configurar SMTP/Email |
| 11 | company.twilio.configure | Configurar Twilio/WhatsApp |
| 12 | company.epayco.configure | Configurar Epayco |
| 13 | company.wompi.configure | Configurar Wompi |
| 14 | company.bold.configure | Configurar Bold |
| 15 | company.ecommerce.configure | Configurar eCommerce |
| 16 | company.payroll.configure | Configurar nómina |
| 17 | company.pila.configure | Configurar PILA |

**Total Módulo 2: 16 permisos**

---

## MÓDULO 3: CONFIGURATIONS
| # | Permiso | Descripción |
|---|---------|-------------|
| 18 | config.view | Ver configuraciones |
| 19 | config.general.edit | Editar config general |
| 20 | config.invoicing.edit | Configurar facturación |
| 21 | config.accounting.edit | Configurar contabilidad |
| 22 | config.inventory.edit | Configurar inventario |
| 23 | config.payroll.edit | Configurar nómina |
| 24 | config.security.edit | Configurar seguridad |
| 25 | config.notifications.edit | Configurar notificaciones |
| 26 | config.integrations.manage | Gestionar integraciones |
| 27 | config.import.chart_accounts | Importar plan de cuentas |
| 28 | config.import.bank_accounts | Importar cuentas bancarias |
| 29 | config.import.terceros | Importar terceros |
| 30 | config.import.employees | Importar empleados |
| 31 | config.import.inventory | Importar inventario |
| 32 | config.import.invoices | Importar facturas |
| 33 | config.import.purchases | Importar compras |
| 34 | config.import.expenses | Importar gastos |
| 35 | config.import.journal_entries | Importar asientos |

**Total Módulo 3: 18 permisos**

---

## MÓDULO 4: USER_MANAGEMENT
| # | Permiso | Descripción |
|---|---------|-------------|
| 39 | users.view | Ver usuarios |
| 40 | users.invite | Invitar usuario |
| 41 | users.create | Crear usuario |
| 42 | users.edit | Editar usuario |
| 43 | users.delete | Eliminar usuario |
| 44 | users.activate | Activar usuario |
| 45 | users.deactivate | Desactivar usuario |
| 46 | users.role.assign | Asignar rol |
| 47 | users.modules.assign | Asignar módulos |
| 48 | users.permissions.view | Ver permisos |
| 49 | users.permissions.edit | Editar permisos |
| 50 | roles.view | Ver roles |
| 51 | roles.create | Crear rol |
| 52 | roles.edit | Editar rol |
| 53 | roles.delete | Eliminar rol |
| 54 | roles.permissions.assign | Asignar permisos a rol |

**Total Módulo 4: 16 permisos**

---

## MÓDULO 5: SALES (Ventas/Facturación)
| # | Permiso | Descripción |
|---|---------|-------------|
| 55 | sales.invoices.view | Ver facturas |
| 56 | sales.invoices.create | Crear factura |
| 57 | sales.invoices.edit | Editar factura borrador |
| 58 | sales.invoices.delete | Eliminar factura borrador |
| 59 | sales.invoices.send_dian | Enviar a DIAN |
| 60 | sales.invoices.cancel | Anular factura |
| 61 | sales.invoices.clone | Duplicar factura |
| 62 | sales.invoices.email | Enviar por email |
| 63 | sales.invoices.print | Imprimir factura |
| 64 | sales.invoices.export | Exportar facturas |
| 65 | sales.invoices.import | Importar facturas |
| 66 | sales.invoices.view_detail | Ver detalle factura |
| 67 | sales.credit_notes.view | Ver notas crédito |
| 68 | sales.credit_notes.create | Crear nota crédito |
| 69 | sales.credit_notes.send_dian | Enviar NC a DIAN |
| 70 | sales.debit_notes.view | Ver notas débito |
| 71 | sales.debit_notes.create | Crear nota débito |
| 72 | sales.debit_notes.send_dian | Enviar ND a DIAN |
| 73 | sales.recurrent.view | Ver plantillas recurrentes |
| 74 | sales.recurrent.create | Crear plantilla recurrente |
| 75 | sales.recurrent.edit | Editar plantilla recurrente |
| 76 | sales.recurrent.delete | Eliminar plantilla |
| 77 | sales.recurrent.execute | Ejecutar plantilla |
| 78 | sales.recurrent.toggle | Activar/desactivar plantilla |
| 79 | sales.resolutions.view | Ver resoluciones |
| 80 | sales.resolutions.create | Crear resolución |
| 81 | sales.resolutions.edit | Editar resolución |
| 82 | sales.resolutions.sync_dian | Sincronizar con DIAN |

**Total Módulo 5: 28 permisos**

---

## MÓDULO 6: QUOTES (Cotizaciones)
| # | Permiso | Descripción |
|---|---------|-------------|
| 83 | quotes.view | Ver cotizaciones |
| 84 | quotes.create | Crear cotización |
| 85 | quotes.edit | Editar cotización |
| 86 | quotes.delete | Eliminar cotización |
| 87 | quotes.duplicate | Duplicar cotización |
| 88 | quotes.send | Enviar cotización |
| 89 | quotes.approve | Aprobar cotización |
| 90 | quotes.reject | Rechazar cotización |
| 91 | quotes.convert_to_invoice | Convertir a factura |
| 92 | quotes.print | Imprimir cotización |
| 93 | quotes.export | Exportar cotizaciones |

**Total Módulo 6: 11 permisos**

---

## MÓDULO 7: POINT_OF_SALE (POS)
| # | Permiso | Descripción |
|---|---------|-------------|
| 94 | pos.access | Acceder al POS |
| 95 | pos.sales.create | Realizar venta |
| 96 | pos.sales.view | Ver ventas POS |
| 97 | pos.discounts.apply | Aplicar descuentos |
| 98 | pos.discounts.override | Descuento especial (mayor al límite) |
| 99 | pos.refunds.process | Procesar devolución |
| 100 | pos.void.transaction | Anular transacción |
| 101 | pos.print.receipt | Imprimir recibo |
| 102 | pos.reprint.receipt | Reimprimir recibo |
| 103 | pos.documents.view | Ver documentos POS |
| 104 | pos.documents.create | Crear documento equivalente |

**Total Módulo 7: 11 permisos**

---

## MÓDULO 8: CASH_REGISTERS (Cajas)
| # | Permiso | Descripción |
|---|---------|-------------|
| 105 | cash_registers.view | Ver cajas |
| 106 | cash_registers.create | Crear caja |
| 107 | cash_registers.edit | Editar caja |
| 108 | cash_registers.delete | Eliminar caja |
| 109 | cash_registers.activate | Activar caja |
| 110 | cash_registers.deactivate | Desactivar caja |
| 111 | cash_sessions.view | Ver sesiones |
| 112 | cash_sessions.open | Abrir caja |
| 113 | cash_sessions.close | Cerrar caja |
| 114 | cash_sessions.movements.view | Ver movimientos |
| 115 | cash_sessions.movements.create | Crear movimiento |
| 116 | cash_sessions.report | Generar reporte de cierre |

**Total Módulo 8: 12 permisos**

---

## MÓDULO 9: INVENTORY (Inventario)
| # | Permiso | Descripción |
|---|---------|-------------|
| 117 | inventory.items.view | Ver productos |
| 118 | inventory.items.create | Crear producto |
| 119 | inventory.items.edit | Editar producto |
| 120 | inventory.items.delete | Eliminar producto |
| 121 | inventory.items.import | Importar productos |
| 122 | inventory.items.export | Exportar productos |
| 123 | inventory.items.upload_image | Subir imagen |
| 124 | inventory.items.view_detail | Ver detalle producto |
| 125 | inventory.categories.view | Ver categorías |
| 126 | inventory.categories.create | Crear categoría |
| 127 | inventory.categories.edit | Editar categoría |
| 128 | inventory.categories.delete | Eliminar categoría |
| 129 | inventory.stock.view | Ver stock |
| 134 | inventory.adjustments.view | Ver ajustes |
| 135 | inventory.adjustments.create | Crear ajuste |
| 136 | inventory.adjustments.approve | Aprobar ajuste |
| 137 | inventory.attributes.view | Ver atributos |
| 138 | inventory.attributes.create | Crear atributo |
| 139 | inventory.attributes.edit | Editar atributo |
| 140 | inventory.attributes.delete | Eliminar atributo |
| 141 | inventory.attributes.import | Importar atributos |
| 142 | inventory.attribute_options.view | Ver opciones de atributo |
| 143 | inventory.attribute_options.create | Crear opción de atributo |
| 144 | inventory.attribute_options.edit | Editar opción de atributo |
| 145 | inventory.attribute_options.delete | Eliminar opción de atributo |
| 146 | inventory.attribute_options.import | Importar opciones de atributo |
| 147 | inventory.combinations.manage_attributes | Gestionar atributos de producto |
| 148 | inventory.combinations.view | Ver combinaciones de producto |
| 149 | inventory.combinations.create | Crear combinación de producto |
| 150 | inventory.combinations.edit | Editar combinación de producto |
| 151 | inventory.combinations.delete | Eliminar combinación de producto |

**Total Módulo 9: 31 permisos**

---

## MÓDULO 10: INVENTORY_MANAGEMENT (Almacenes)
| # | Permiso | Descripción |
|---|---------|-------------|
| 152 | warehouses.view | Ver almacenes/bodegas |
| 153 | warehouses.create | Crear almacén |
| 154 | warehouses.edit | Editar almacén |
| 155 | warehouses.delete | Eliminar almacén |
| 156 | warehouses.activate | Activar almacén |
| 157 | warehouses.deactivate | Desactivar almacén |
| 158 | warehouses.stock.view | Ver stock por almacén |
| 159 | warehouses.users.assign | Asignar usuarios |
| 160 | storages.view | Ver ubicaciones |
| 161 | storages.create | Crear ubicación |
| 162 | storages.edit | Editar ubicación |
| 163 | storages.delete | Eliminar ubicación |
| 164 | transfers.view | Ver transferencias |
| 165 | transfers.create | Crear transferencia |
| 166 | transfers.approve | Aprobar transferencia |
| 167 | transfers.reject | Rechazar transferencia |
| 168 | transfers.print | Imprimir transferencia |

**Total Módulo 10: 17 permisos**

---

## MÓDULO 11: PURCHASE_ORDERS (Órdenes de Compra)
| # | Permiso | Descripción |
|---|---------|-------------|
| 164 | purchase_orders.view | Ver órdenes de compra |
| 165 | purchase_orders.create | Crear orden |
| 166 | purchase_orders.edit | Editar orden |
| 167 | purchase_orders.delete | Eliminar orden |
| 168 | purchase_orders.approve | Aprobar orden |
| 169 | purchase_orders.reject | Rechazar orden |
| 170 | purchase_orders.cancel | Cancelar orden |
| 171 | purchase_orders.send | Enviar a proveedor |
| 172 | purchase_orders.receive | Registrar recepción |
| 173 | purchase_orders.print | Imprimir orden |
| 174 | purchase_orders.export | Exportar órdenes |

**Total Módulo 11: 11 permisos**

---

## MÓDULO 12: PURCHASES (Compras)
| # | Permiso | Descripción |
|---|---------|-------------|
| 175 | purchases.view | Ver compras |
| 176 | purchases.create | Registrar compra |
| 177 | purchases.edit | Editar compra |
| 178 | purchases.delete | Eliminar compra |
| 179 | purchases.import | Importar compras |
| 180 | purchases.export | Exportar compras |
| 181 | purchases.toggle_deductible | Marcar deducible/no deducible |
| 182 | purchases.view_detail | Ver detalle compra |
| 183 | purchase_returns.view | Ver devoluciones |
| 184 | purchase_returns.create | Crear devolución |
| 185 | purchase_returns.import | Importar devoluciones |

**Total Módulo 12: 11 permisos**

---

## MÓDULO 13: EXPENSES (Gastos)
| # | Permiso | Descripción |
|---|---------|-------------|
| 186 | expenses.view | Ver gastos |
| 187 | expenses.create | Crear gasto |
| 188 | expenses.edit | Editar gasto |
| 189 | expenses.delete | Eliminar gasto |
| 190 | expenses.approve | Aprobar gasto |
| 191 | expenses.import | Importar gastos |
| 192 | expenses.export | Exportar gastos |
| 193 | expenses.toggle_deductible | Marcar deducible |
| 194 | expenses.bulk_toggle_deductible | Marcar masivo deducible |
| 195 | expenses.send_dian | Enviar documento soporte DIAN |
| 196 | expenses.view_detail | Ver detalle gasto |
| 197 | expenses.attachments.upload | Subir adjuntos |
| 198 | expenses.attachments.delete | Eliminar adjuntos |
| 199 | expense_categories.view | Ver categorías |
| 200 | expense_categories.create | Crear categoría |
| 201 | expense_categories.edit | Editar categoría |
| 202 | expense_categories.delete | Eliminar categoría |
| 203 | expenses.recurrent.view | Ver gastos recurrentes |
| 204 | expenses.recurrent.create | Crear gasto recurrente |
| 205 | expenses.recurrent.edit | Editar gasto recurrente |
| 206 | expenses.recurrent.delete | Eliminar gasto recurrente |
| 207 | expenses.recurrent.execute | Ejecutar recurrente |
| 208 | expenses.recurrent.toggle | Activar/desactivar |
| 209 | expense_returns.view | Ver devoluciones gasto |
| 210 | expense_returns.create | Crear devolución gasto |

**Total Módulo 13: 25 permisos**

---

## MÓDULO 14: THIRD_PARTIES (Terceros)
| # | Permiso | Descripción |
|---|---------|-------------|
| 211 | terceros.view | Ver terceros |
| 212 | terceros.create | Crear tercero |
| 213 | terceros.edit | Editar tercero |
| 214 | terceros.delete | Eliminar tercero |
| 215 | terceros.import | Importar terceros |
| 216 | terceros.export | Exportar terceros |
| 217 | terceros.view_detail | Ver detalle tercero |
| 218 | terceros.bank_accounts.create | Crear cuenta bancaria |
| 219 | terceros.bank_accounts.edit | Editar cuenta bancaria |
| 220 | terceros.bank_accounts.delete | Eliminar cuenta bancaria |
| 221 | terceros.portal.generate | Generar acceso portal |
| 222 | terceros.ledger.view | Ver libro de tercero |

**Total Módulo 14: 12 permisos**

---

## MÓDULO 15: AR_AP (Cuentas por Cobrar/Pagar)
| # | Permiso | Descripción |
|---|---------|-------------|
| 223 | ar.view | Ver cuentas por cobrar |
| 224 | ar.aging.view | Ver antigüedad CxC |
| 225 | ar.payments.register | Registrar cobro |
| 226 | ar.payments.view | Ver pagos recibidos |
| 227 | ar.export | Exportar CxC |
| 228 | ap.view | Ver cuentas por pagar |
| 229 | ap.aging.view | Ver antigüedad CxP |
| 230 | ap.payments.register | Registrar pago |
| 231 | ap.payments.view | Ver pagos realizados |
| 232 | ap.export | Exportar CxP |
| 233 | prepayments.view | Ver anticipos |
| 234 | prepayments.create | Crear anticipo |
| 235 | prepayments.edit | Editar anticipo |
| 236 | prepayments.apply | Aplicar anticipo |
| 237 | prepayments.cancel | Anular anticipo |
| 238 | prepayments.refund | Reembolsar anticipo |
| 239 | cash_receipts.view | Ver recibos de caja |
| 240 | cash_receipts.create | Crear recibo de caja |
| 241 | cash_receipts.edit | Editar recibo de caja |
| 242 | cash_receipts.void | Anular recibo de caja |
| 243 | cash_receipts.print | Imprimir recibo de caja |
| 244 | payment_vouchers.view | Ver comprobantes de egreso |
| 245 | payment_vouchers.create | Crear comprobante de egreso |
| 246 | payment_vouchers.edit | Editar comprobante de egreso |
| 247 | payment_vouchers.void | Anular comprobante de egreso |
| 248 | payment_vouchers.print | Imprimir comprobante de egreso |
| 249 | cartera.reports.view | Ver reportes cartera |
| 250 | cartera.settings.edit | Configurar cartera |

**Total Módulo 15: 27 permisos**

---

## MÓDULO 16: ACCOUNTING (Contabilidad)
| # | Permiso | Descripción |
|---|---------|-------------|
| 245 | accounting.view | Acceder a contabilidad |
| 246 | journal_entries.view | Ver asientos |
| 247 | journal_entries.create | Crear asiento |
| 248 | journal_entries.edit | Editar asiento |
| 249 | journal_entries.delete | Eliminar asiento |
| 250 | journal_entries.approve | Aprobar asiento |
| 251 | journal_entries.reverse | Reversar asiento |
| 252 | journal_entries.import | Importar asientos |
| 253 | journal_entries.export | Exportar asientos |
| 254 | journal_entries.view_detail | Ver detalle asiento |
| 255 | journal_entries.attachments.upload | Subir adjuntos |
| 256 | journal_entries.attachments.delete | Eliminar adjuntos |
| 257 | journal_entries.recurrent.view | Ver asientos recurrentes |
| 258 | journal_entries.recurrent.create | Crear recurrente |
| 259 | journal_entries.recurrent.edit | Editar recurrente |
| 260 | journal_entries.recurrent.delete | Eliminar recurrente |
| 261 | journal_entries.recurrent.execute | Ejecutar recurrente |
| 262 | journal_entries.recurrent.toggle | Activar/desactivar |
| 263 | chart_of_accounts.view | Ver plan de cuentas |
| 264 | chart_of_accounts.create | Crear cuenta |
| 265 | chart_of_accounts.edit | Editar cuenta |
| 266 | chart_of_accounts.delete | Eliminar cuenta |
| 267 | chart_of_accounts.import | Importar PUC |
| 268 | chart_of_accounts.export | Exportar PUC |
| 269 | account_mapping.view | Ver mapeo contable |
| 270 | account_mapping.configure | Configurar mapeo |
| 271 | account_mapping.auto_detect | Auto-detectar mapeo |
| 272 | general_ledger.view | Ver libro mayor |
| 273 | general_ledger.export | Exportar libro mayor |
| 274 | auxiliary_books.view | Ver libros auxiliares |

**Total Módulo 16: 30 permisos**

---

## MÓDULO 17: BANKING (Bancos)
| # | Permiso | Descripción |
|---|---------|-------------|
| 275 | bank_accounts.view | Ver cuentas bancarias |
| 276 | bank_accounts.create | Crear cuenta bancaria |
| 277 | bank_accounts.edit | Editar cuenta bancaria |
| 278 | bank_accounts.delete | Eliminar cuenta bancaria |
| 279 | bank_accounts.activate | Activar cuenta |
| 280 | bank_accounts.deactivate | Desactivar cuenta |
| 281 | bank_accounts.import | Importar cuentas |
| 282 | bank_transactions.view | Ver movimientos |
| 283 | bank_transactions.import | Importar extractos |
| 284 | bank_transactions.classify | Clasificar movimientos |
| 285 | bank_reconciliation.view | Ver conciliaciones |
| 286 | bank_reconciliation.create | Crear conciliación |
| 287 | bank_reconciliation.edit | Editar conciliación |
| 288 | bank_reconciliation.approve | Aprobar conciliación |
| 289 | bank_reconciliation.void | Anular conciliación |
| 290 | bank_reconciliation.adjustments.create | Crear ajuste |
| 291 | bank_reconciliation.adjustments.edit | Editar ajuste |
| 292 | bank_reconciliation.adjustments.delete | Eliminar ajuste |

**Total Módulo 17: 18 permisos**

---

## MÓDULO 18: FIXED_ASSETS (Activos Fijos)
| # | Permiso | Descripción |
|---|---------|-------------|
| 293 | fixed_assets.view | Ver activos fijos |
| 294 | fixed_assets.create | Crear activo |
| 295 | fixed_assets.edit | Editar activo |
| 296 | fixed_assets.delete | Eliminar activo |
| 297 | fixed_assets.view_detail | Ver detalle activo |
| 298 | fixed_assets.upload_image | Subir imagen |
| 299 | fixed_assets.depreciation.calculate | Calcular depreciación |
| 300 | fixed_assets.depreciation.run | Ejecutar depreciación |
| 301 | fixed_assets.sell | Registrar venta |
| 302 | fixed_assets.dispose | Dar de baja |
| 303 | fixed_assets.adjust | Crear ajuste |
| 304 | fixed_assets.history.view | Ver historial |
| 305 | fixed_assets.export | Exportar activos |

**Total Módulo 18: 13 permisos**

---

## MÓDULO 19: COST_CENTERS (Centros de Costos)
| # | Permiso | Descripción |
|---|---------|-------------|
| 306 | cost_centers.view | Ver centros de costos |
| 307 | cost_centers.create | Crear centro |
| 308 | cost_centers.edit | Editar centro |
| 309 | cost_centers.delete | Eliminar centro |
| 310 | cost_centers.view_detail | Ver detalle centro |
| 311 | cost_centers.predictions.create | Crear predicción/presupuesto |
| 312 | cost_centers.predictions.edit | Editar predicción |
| 313 | cost_centers.predictions.delete | Eliminar predicción |
| 314 | cost_centers.comparison.view | Ver real vs presupuesto |
| 315 | cost_centers.reports.view | Ver reportes |
| 316 | cost_centers.export | Exportar datos |

**Total Módulo 19: 11 permisos**

---

## MÓDULO 20: TAX (Impuestos)
| # | Permiso | Descripción |
|---|---------|-------------|
| 317 | tax.view | Ver configuración tributaria |
| 318 | tax.configure | Configurar impuestos |
| 319 | tax.rates.view | Ver tasas |
| 320 | tax.rates.create | Crear tasa |
| 321 | tax.rates.edit | Editar tasa |
| 322 | tax.rates.delete | Eliminar tasa |
| 323 | withholdings.view | Ver retenciones |
| 324 | withholdings.create | Crear retención |
| 325 | withholdings.export | Exportar retenciones |
| 326 | tax_calendar.view | Ver calendario tributario |
| 327 | tax_calendar.sync | Sincronizar calendario |
| 328 | tax_payments.view | Ver pagos de impuestos |
| 329 | tax_payments.create | Registrar pago impuesto |
| 330 | tax_reports.view | Ver reportes tributarios |
| 331 | tax_reports.generate | Generar reportes |

**Total Módulo 20: 15 permisos**

---

## MÓDULO 21: CLOSING (Cierre Contable)
| # | Permiso | Descripción |
|---|---------|-------------|
| 332 | closing.view | Ver cierres |
| 333 | closing.periods.view | Ver períodos |
| 334 | closing.periods.close | Cerrar período |
| 335 | closing.periods.reopen | Reabrir período |
| 336 | closing.year.close | Cierre anual |
| 337 | closing.entries.generate | Generar asientos cierre |
| 338 | closing.entries.view | Ver asientos de cierre |

**Total Módulo 21: 7 permisos**

---

## MÓDULO 22: EXOGENOUS (Información Exógena)
| # | Permiso | Descripción |
|---|---------|-------------|
| 339 | exogenous.view | Ver información exógena |
| 340 | exogenous.generate | Generar archivos |
| 341 | exogenous.validate | Validar información |
| 342 | exogenous.download | Descargar archivos |
| 343 | exogenous.concepts.view | Ver conceptos |
| 344 | exogenous.concepts.configure | Configurar conceptos |
| 345 | exogenous.history.view | Ver historial |

**Total Módulo 22: 7 permisos**

---

## MÓDULO 23: RADIAN (Facturas Recibidas Electrónicas)
| # | Permiso | Descripción |
|---|---------|-------------|
| 346 | radian.view | Ver facturas recibidas |
| 347 | radian.import | Importar de DIAN |
| 348 | radian.accept | Aceptar factura |
| 349 | radian.reject | Rechazar factura |
| 350 | radian.events.send | Enviar eventos RADIAN |
| 351 | radian.events.view | Ver eventos |
| 352 | radian.delete | Eliminar registro |
| 353 | radian.export | Exportar facturas recibidas |

**Total Módulo 23: 8 permisos**

---

## MÓDULO 24: CORE_HR (Gestión de Empleados)
| # | Permiso | Descripción |
|---|---------|-------------|
| 354 | employees.view | Ver empleados |
| 355 | employees.create | Crear empleado |
| 356 | employees.edit | Editar empleado |
| 357 | employees.delete | Eliminar empleado |
| 358 | employees.view_detail | Ver detalle empleado |
| 359 | employees.import | Importar empleados |
| 360 | employees.export | Exportar empleados |
| 361 | employees.activate | Activar empleado |
| 362 | employees.deactivate | Desactivar empleado |
| 363 | employees.terminate | Retirar empleado |
| 364 | employees.invite | Invitar al sistema |
| 365 | employees.portal.generate | Generar acceso portal |
| 366 | employees.contracts.view | Ver contratos |
| 367 | employees.contracts.create | Crear contrato |
| 368 | employees.contracts.edit | Editar contrato |
| 369 | employees.contracts.renew | Renovar contrato |
| 370 | employees.salary.view | Ver salario |
| 371 | employees.salary.edit | Editar salario |

**Total Módulo 24: 18 permisos**

---

## MÓDULO 25: TIME_ATTENDANCE (Control de Tiempo)
| # | Permiso | Descripción |
|---|---------|-------------|
| 372 | attendance.view | Ver asistencia |
| 373 | attendance.register_checkin | Marcar entrada |
| 374 | attendance.register_checkout | Marcar salida |
| 375 | attendance.edit | Editar registro |
| 376 | attendance.approve | Aprobar asistencia |
| 377 | attendance.reports.view | Ver reportes |
| 378 | attendance.export | Exportar asistencia |
| 379 | overtime.view | Ver horas extras |
| 380 | overtime.create | Registrar horas extras |
| 381 | overtime.edit | Editar horas extras |
| 382 | overtime.delete | Eliminar horas extras |
| 383 | overtime.approve | Aprobar horas extras |
| 384 | overtime.reject | Rechazar horas extras |

**Total Módulo 25: 13 permisos**

---

## MÓDULO 26: LEAVES_VACATIONS (Vacaciones y Ausencias)
| # | Permiso | Descripción |
|---|---------|-------------|
| 385 | leaves.view | Ver ausencias |
| 386 | leaves.request | Solicitar ausencia |
| 387 | leaves.create | Crear ausencia (admin) |
| 388 | leaves.edit | Editar ausencia |
| 389 | leaves.delete | Eliminar ausencia |
| 390 | leaves.approve | Aprobar ausencia |
| 391 | leaves.reject | Rechazar ausencia |
| 392 | leaves.manage_all | Gestionar todas las ausencias |
| 393 | vacations.view | Ver vacaciones |
| 394 | vacations.balance.view | Ver saldo vacaciones |
| 395 | vacations.calculate | Calcular vacaciones |
| 396 | leaves.export | Exportar ausencias |

**Total Módulo 26: 12 permisos**

---

## MÓDULO 27: HR_PAYROLL (Nómina)
| # | Permiso | Descripción |
|---|---------|-------------|
| 397 | payroll.view | Ver nómina |
| 398 | payroll.configure | Configurar nómina |
| 399 | payroll_settlements.view | Ver liquidaciones |
| 400 | payroll_settlements.create | Crear liquidación |
| 401 | payroll_settlements.edit | Editar liquidación |
| 402 | payroll_settlements.delete | Eliminar liquidación |
| 403 | payroll_settlements.calculate | Calcular liquidación |
| 404 | payroll_settlements.approve | Aprobar liquidación |
| 405 | payroll_settlements.contabilize | Contabilizar liquidación |
| 406 | payroll_settlements.void | Anular liquidación |
| 407 | payroll_novelties.view | Ver novedades |
| 408 | payroll_novelties.create | Crear novedad |
| 409 | payroll_novelties.edit | Editar novedad |
| 410 | payroll_novelties.delete | Eliminar novedad |
| 411 | payroll_novelties.approve | Aprobar novedades |
| 412 | payroll_concepts.view | Ver conceptos |
| 413 | payroll_concepts.create | Crear concepto |
| 414 | payroll_concepts.edit | Editar concepto |
| 415 | payroll_concepts.delete | Eliminar concepto |
| 416 | payroll_concepts.initialize | Inicializar conceptos DIAN |
| 417 | payroll_uvt.view | Ver tramos UVT retención en la fuente |
| 418 | payroll_uvt.create | Crear tramo UVT |
| 419 | payroll_uvt.edit | Editar tramo UVT |
| 420 | payroll_uvt.delete | Eliminar tramo UVT |
| 421 | payroll_uvt.replicate | Replicar tramos UVT de un año a otro |
| 422 | payslips.view | Ver desprendibles |
| 423 | payslips.download | Descargar desprendible |
| 424 | payslips.send_email | Enviar por email |
| 425 | payslips.bulk_send | Envío masivo |
| 426 | payroll_dian.send | Enviar nómina DIAN |
| 427 | payroll_dian.view | Ver estado DIAN |
| 428 | pila.generate | Generar PILA |
| 429 | pila.download | Descargar PILA |
| 430 | pila.send | Enviar PILA |
| 431 | pila.history.view | Ver historial PILA |
| 432 | severance.view | Ver liquidaciones definitivas |
| 433 | severance.create | Crear liquidación definitiva |
| 434 | severance.approve | Aprobar liquidación definitiva |

**Total Módulo 27: 38 permisos**

---

## MÓDULO 28: HR_EXPENSES (Gastos de Empleados)
| # | Permiso | Descripción |
|---|---------|-------------|
| 430 | hr_expenses.view | Ver gastos empleados |
| 431 | hr_expenses.request | Solicitar anticipo |
| 432 | hr_expenses.create | Crear gasto (admin) |
| 433 | hr_expenses.edit | Editar gasto |
| 434 | hr_expenses.delete | Eliminar gasto |
| 435 | hr_expenses.approve | Aprobar gasto |
| 436 | hr_expenses.reject | Rechazar gasto |
| 437 | hr_expenses.reimburse | Procesar reembolso |
| 438 | hr_expenses.export | Exportar gastos |

**Total Módulo 28: 9 permisos**

---

## MÓDULO 29: HR_PERFORMANCE (Evaluaciones)
| # | Permiso | Descripción |
|---|---------|-------------|
| 439 | performance.view | Ver evaluaciones |
| 440 | performance.create | Crear evaluación |
| 441 | performance.edit | Editar evaluación |
| 442 | performance.delete | Eliminar evaluación |
| 443 | performance.complete | Completar evaluación |
| 444 | performance.approve | Aprobar evaluación |
| 445 | performance.auto_generate | Generar automáticamente |
| 446 | goals.view | Ver objetivos |
| 447 | goals.create | Crear objetivo |
| 448 | goals.edit | Editar objetivo |
| 449 | goals.delete | Eliminar objetivo |
| 450 | observations.view | Ver observaciones |
| 451 | observations.create | Crear observación |
| 452 | observations.edit | Editar observación |
| 453 | observations.delete | Eliminar observación |
| 454 | observations.send_report | Enviar reporte |
| 455 | observations.export | Exportar observaciones |

**Total Módulo 29: 17 permisos**

---

## MÓDULO 30: CRM
| # | Permiso | Descripción |
|---|---------|-------------|
| 456 | crm.view | Acceder al CRM |
| 457 | crm.dashboard.view | Ver dashboard CRM |
| 458 | crm.leads.view | Ver leads |
| 459 | crm.leads.create | Crear lead |
| 460 | crm.leads.edit | Editar lead |
| 461 | crm.leads.delete | Eliminar lead |
| 462 | crm.leads.assign | Asignar lead |
| 463 | crm.leads.bulk_assign | Asignación masiva |
| 464 | crm.leads.import | Importar leads |
| 465 | crm.leads.export | Exportar leads |
| 466 | crm.leads.convert | Convertir lead |
| 467 | crm.leads.timeline.view | Ver timeline |
| 468 | crm.contacts.view | Ver contactos |
| 469 | crm.contacts.create | Crear contacto |
| 470 | crm.contacts.edit | Editar contacto |
| 471 | crm.contacts.delete | Eliminar contacto |
| 472 | crm.contacts.segment | Segmentar contacto |
| 473 | crm.contacts.whatsapp_chat | Abrir chat WhatsApp |
| 474 | crm.contacts.send_template | Enviar plantilla |
| 475 | crm.tags.view | Ver tags de contactos |
| 476 | crm.tags.create | Crear tag |
| 477 | crm.tags.edit | Editar tag |
| 478 | crm.tags.delete | Eliminar tag |
| 479 | crm.segmentation.configure | Configurar segmentación |
| 480 | crm.opportunities.view | Ver oportunidades |
| 481 | crm.opportunities.create | Crear oportunidad |
| 482 | crm.opportunities.edit | Editar oportunidad |
| 483 | crm.opportunities.delete | Eliminar oportunidad |
| 484 | crm.opportunities.change_stage | Cambiar etapa |
| 485 | crm.opportunities.bulk_change_stage | Cambio masivo etapa |
| 486 | crm.opportunities.mark_lost | Marcar como perdida |
| 487 | crm.opportunities.create_quote | Crear cotización |
| 488 | crm.opportunities.view_quotes | Ver cotizaciones |
| 489 | crm.activities.view | Ver actividades |
| 490 | crm.activities.create | Crear actividad |
| 491 | crm.activities.edit | Editar actividad |
| 492 | crm.activities.delete | Eliminar actividad |
| 493 | crm.activities.complete | Completar actividad |
| 494 | crm.activities.cancel | Cancelar actividad |
| 495 | crm.campaigns.view | Ver campañas |
| 496 | crm.campaigns.create | Crear campaña |
| 497 | crm.campaigns.edit | Editar campaña |
| 498 | crm.campaigns.delete | Eliminar campaña |
| 499 | crm.campaigns.configure_hours | Configurar horarios |
| 500 | crm.campaigns.view_report | Ver reporte campaña |
| 501 | crm.forms.view | Ver formularios |
| 502 | crm.forms.create | Crear formulario |
| 503 | crm.forms.edit | Editar formulario |
| 504 | crm.forms.delete | Eliminar formulario |
| 505 | crm.forms.toggle | Activar/desactivar |
| 506 | crm.forms.view_submissions | Ver envíos |
| 507 | crm.forms.embed | Obtener código embed |
| 508 | crm.automations.view | Ver automatizaciones |
| 509 | crm.automations.create | Crear automatización |
| 510 | crm.automations.edit | Editar automatización |
| 511 | crm.automations.delete | Eliminar automatización |
| 512 | crm.automations.toggle | Activar/desactivar |
| 513 | crm.automations.test | Probar automatización |
| 514 | crm.whatsapp.view | Ver WhatsApp |
| 515 | crm.whatsapp.send_message | Enviar mensaje |
| 516 | crm.whatsapp.send_template | Enviar plantilla |
| 517 | crm.whatsapp_templates.view | Ver plantillas WA |
| 518 | crm.whatsapp_templates.create | Crear plantilla WA |
| 519 | crm.whatsapp_templates.edit | Editar plantilla WA |
| 520 | crm.whatsapp_templates.delete | Eliminar plantilla WA |
| 521 | crm.whatsapp_templates.preview | Previsualizar plantilla |
| 522 | crm.whatsapp_templates.submit_approval | Enviar a aprobación |
| 523 | crm.email_marketing.view | Ver email marketing |
| 524 | crm.email_marketing.create | Crear campaña email |
| 525 | crm.email_marketing.edit | Editar campaña email |
| 526 | crm.email_marketing.delete | Eliminar campaña email |
| 527 | crm.email_marketing.send | Enviar campaña |
| 528 | crm.email_marketing.view_stats | Ver estadísticas |
| 529 | crm.team.view | Ver equipo |
| 530 | crm.team.manage | Gestionar equipo |
| 531 | crm.settings.stages.manage | Gestionar etapas |
| 532 | crm.reports.view | Ver reportes CRM |
| 533 | crm.reports.performance | Ver rendimiento |

**Total Módulo 30: 78 permisos**

---

## MÓDULO 31: COMMUNICATION_TEMPLATES
| # | Permiso | Descripción |
|---|---------|-------------|
| 534 | templates.email.view | Ver plantillas email |
| 535 | templates.email.create | Crear plantilla email |
| 536 | templates.email.edit | Editar plantilla email |
| 537 | templates.email.delete | Eliminar plantilla email |
| 538 | templates.email.preview | Previsualizar email |
| 539 | templates.whatsapp.view | Ver plantillas WhatsApp |
| 540 | templates.whatsapp.create | Crear plantilla WA |
| 541 | templates.whatsapp.edit | Editar plantilla WA |
| 542 | templates.whatsapp.delete | Eliminar plantilla WA |
| 543 | templates.whatsapp.preview | Previsualizar WA |

**Total Módulo 31: 10 permisos**

---

## MÓDULO 32: REPORTS
| # | Permiso | Descripción |
|---|---------|-------------|
| 544 | reports.view | Ver reportes |
| 545 | reports.financial.view | Ver reportes financieros |
| 546 | reports.income_statement.view | Ver estado de resultados |
| 547 | reports.balance_sheet.view | Ver balance general |
| 548 | reports.trial_balance.view | Ver balance de prueba |
| 549 | reports.equity_changes.view | Ver cambios patrimonio |
| 550 | reports.cash_flow.view | Ver flujo de caja |
| 551 | reports.sales.view | Ver reportes ventas |
| 552 | reports.purchases.view | Ver reportes compras |
| 553 | reports.inventory.view | Ver reportes inventario |
| 554 | reports.hr.view | Ver reportes RRHH |
| 555 | reports.retentions.suppliers.view | Ver retenciones proveedores |
| 556 | reports.retentions.employees.view | Ver retenciones empleados |
| 557 | reports.export | Exportar reportes |
| 558 | reports.custom.create | Crear reporte personalizado |
| 559 | reports.custom.edit | Editar reporte personalizado |
| 560 | reports.custom.delete | Eliminar reporte personalizado |
| 561 | reports.custom.execute | Ejecutar reporte |
| 562 | audit_log.view | Ver log auditoría |
| 563 | audit_log.export | Exportar auditoría |

**Total Módulo 32: 20 permisos**

---

# RESUMEN FINAL

| # | Módulo | Permisos |
|---|--------|----------|
| 1 | dashboard | 1 |
| 2 | company_profile | 16 |
| 3 | configurations | 18 |
| 4 | user_management | 16 |
| 5 | sales | 28 |
| 6 | quotes | 11 |
| 7 | point_of_sale | 11 |
| 8 | cash_registers | 12 |
| 9 | inventory | 31 |
| 10 | inventory_management | 17 |
| 11 | purchase_orders | 11 |
| 12 | purchases | 11 |
| 13 | expenses | 25 |
| 14 | third_parties | 12 |
| 15 | ar_ap | 22 |
| 16 | accounting | 30 |
| 17 | banking | 18 |
| 18 | fixed_assets | 13 |
| 19 | cost_centers | 11 |
| 20 | tax | 15 |
| 21 | closing | 7 |
| 22 | exogenous | 7 |
| 23 | radian | 8 |
| 24 | core_hr | 18 |
| 25 | time_attendance | 13 |
| 26 | leaves_vacations | 12 |
| 27 | hr_payroll | 33 |
| 28 | hr_expenses | 9 |
| 29 | hr_performance | 17 |
| 30 | crm | 78 |
| 31 | communication_templates | 10 |
| 32 | reports | 20 |

---

## **TOTAL GENERAL: 561 PERMISOS GRANULARES**

---

*Generado automáticamente basándose en el análisis exhaustivo del proyecto Horizont*
