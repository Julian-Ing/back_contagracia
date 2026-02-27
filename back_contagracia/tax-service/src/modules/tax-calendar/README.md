# Tax Calendar Module - Estado de Implementación

## ✅ Completado (Fases 1-3)

### Fase 1: Setup Inicial
- ✅ Estructura de carpetas creada
- ✅ Dependencias instaladas (`pdf-parse`, `axios`, `@nestjs/schedule`)
- ✅ Variables de entorno configuradas
- ✅ Módulo base `TaxCalendarModule` creado

### Fase 2: Base de Datos
- ✅ Schema Prisma agregado:
  - `TaxObligationType` (23 tipos cargados)
  - `TaxCalendarDate`
  - `TaxCalendarSyncLog`
- ✅ Cliente Prisma generado
- ✅ Schema pushed a PostgreSQL
- ✅ Seed de tipos de obligación ejecutado

### Fase 3: Parser de PDF (Estructura Base)
- ✅ Tipos TypeScript creados (`parser.types.ts`)
- ✅ `PdfParserService` implementado con estructura base:
  - ✅ `extractTextFromPdf()` - Funcional
  - ✅ `detectTaxTypes()` - Funcional con patrones básicos
  - ⚠️ `extractDates()` - **Requiere implementación completa**
  - ✅ `parsePdf()` - Estructura orquestadora lista

---

## ⚠️ Pendiente de Completar

### `extractDates()` - Implementación Crítica

**Problema:** El método actual retorna un array vacío porque requiere análisis del formato específico de los PDFs DIAN.

**Solución requerida:**

1. **Obtener PDFs reales de DIAN:**
   - Descargar calendario de 2024: `https://www.dian.gov.co/Calendarios/Calendario_Tributario_2024.pdf`
   - Descargar calendario de 2025: `https://www.dian.gov.co/Calendarios/Calendario_Tributario_2025.pdf`

2. **Analizar estructura del PDF:**
   - Identificar cómo se organizan las tablas
   - Detectar patrones de fechas por tipo de obligación
   - Identificar cómo se especifican los dígitos del NIT
   - Detectar cuotas/installments (ej: Renta GC tiene 3 cuotas)

3. **Implementar lógica de extracción:**
   ```typescript
   extractDates(text: string, year: number): ParsedDate[] {
     const dates: ParsedDate[] = [];

     // 1. Dividir el texto en secciones por tipo de obligación
     // 2. Para cada sección:
     //    - Identificar el tipo de obligación
     //    - Extraer tabla de fechas
     //    - Para cada fila de la tabla:
     //      - Extraer dígito NIT
     //      - Extraer fecha de vencimiento
     //      - Extraer período (mes, bimestre, etc.)
     //      - Crear ParsedDate object

     return dates;
   }
   ```

### Ejemplo de estructura esperada en PDF DIAN:

```
RENTA GRANDES CONTRIBUYENTES
Primera Cuota:
Último dígito NIT | Fecha de vencimiento
        0         |   9 de febrero de 2025
        1         |   10 de febrero de 2025
        ...

Segunda Cuota:
Último dígito NIT | Fecha de vencimiento
        0         |   9 de abril de 2025
        ...

IVA BIMESTRAL
Bimestre ene-feb:
Último dígito NIT | Fecha de vencimiento
        0         |   12 de marzo de 2025
        1         |   13 de marzo de 2025
        ...
```

---

## 🔧 Cómo Completar la Implementación

### Paso 1: Descargar PDFs para Testing

```bash
# Crear carpeta de test
mkdir test-pdfs

# Descargar PDFs (usar navegador o wget/curl)
# Guardar en: test-pdfs/Calendario_Tributario_2024.pdf
# Guardar en: test-pdfs/Calendario_Tributario_2025.pdf
```

### Paso 2: Crear Test de Desarrollo

Crear `src/modules/tax-calendar/services/pdf-parser.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { PdfParserService } from './pdf-parser.service';
import * as fs from 'fs';
import * as path from 'path';

describe('PdfParserService - Development Tests', () => {
  let service: PdfParserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PdfParserService],
    }).compile();

    service = module.get<PdfParserService>(PdfParserService);
  });

  it('should extract text from real DIAN PDF', async () => {
    const pdfPath = path.join(__dirname, '../../../../test-pdfs/Calendario_Tributario_2025.pdf');
    const buffer = fs.readFileSync(pdfPath);

    const text = await service.extractTextFromPdf(buffer);
    console.log('Extracted text preview:', text.substring(0, 500));

    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
  });

  it('should detect tax types', async () => {
    const pdfPath = path.join(__dirname, '../../../../test-pdfs/Calendario_Tributario_2025.pdf');
    const buffer = fs.readFileSync(pdfPath);

    const text = await service.extractTextFromPdf(buffer);
    const taxTypes = service.detectTaxTypes(text);

    console.log('Detected tax types:', taxTypes);
    expect(taxTypes.length).toBeGreaterThan(0);
  });

  it('should parse full PDF', async () => {
    const pdfPath = path.join(__dirname, '../../../../test-pdfs/Calendario_Tributario_2025.pdf');
    const buffer = fs.readFileSync(pdfPath);

    const result = await service.parsePdf(buffer, 2025);

    console.log('Parse result:', JSON.stringify(result, null, 2));
    expect(result.year).toBe(2025);
  });
});
```

### Paso 3: Ejecutar Tests y Analizar Output

```bash
npm test -- pdf-parser.service.spec.ts
```

**Analizar:**
- ¿Cómo está estructurado el texto extraído?
- ¿Qué patrones se repiten?
- ¿Cómo se diferencian los tipos de obligación?
- ¿Cómo están formateadas las fechas?

### Paso 4: Implementar `extractDates()` Basado en Análisis

Con base en el análisis, implementar la lógica específica para el formato DIAN.

---

## 📋 Próximas Fases (4-7)

### Fase 4: Servicio de Descarga DIAN
- Implementar `DianDownloaderService`
- Método para descargar PDFs desde URL DIAN
- Manejo de errores y reintentos

### Fase 5: Servicio Principal
- Implementar `TaxCalendarService` completo
- Métodos para sincronizar desde PDF/URL
- Métodos para consultar calendario por empresa

### Fase 6: Controller y DTOs
- Crear DTOs de validación
- Implementar endpoints REST
- Documentación Swagger

### Fase 7: Job de Recordatorios
- Implementar `ReminderService`
- Configurar cron job diario
- Integración con notification-service

---

## 🎯 Criterio de Éxito para Fase 3

La Fase 3 se considera **completada** cuando:

- ✅ `extractTextFromPdf()` funciona con PDFs reales
- ✅ `detectTaxTypes()` identifica correctamente al menos 10 tipos
- ✅ `extractDates()` extrae al menos 50% de las fechas correctamente
- ✅ Tests unitarios pasan con PDFs de 2024 y 2025
- ✅ No hay errores de parseo críticos

---

## 📚 Referencias

- [PDF DIAN 2025](https://www.dian.gov.co/Calendarios/Calendario_Tributario_2025.pdf)
- [Roadmap Completo](../../../../../../ROADMAP_CALENDARIO_TRIBUTARIO.md)
- [Documentación pdf-parse](https://www.npmjs.com/package/pdf-parse)

---

**Última actualización:** 2026-02-05
**Estado:** Fase 3 parcialmente completada - Requiere análisis de PDFs reales
