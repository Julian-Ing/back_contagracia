/**
 * Test completo del PDF Parser con PDFs reales
 * Uso: npx ts-node test-parser-full.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { PdfParserService } from './src/modules/tax-calendar/services/pdf-parser.service';

async function testFullParser() {
  console.log('🚀 Test Completo del PDF Parser\n');

  const parser = new PdfParserService();
  const years = [2025, 2024, 2023];

  for (const year of years) {
    console.log('='.repeat(80));
    console.log(`📅 Probando calendario ${year}`);
    console.log('='.repeat(80) + '\n');

    try {
      const pdfPath = path.join(__dirname, 'pdf-calendarios', `Calendario_Tributario_${year}.pdf`);

      if (!fs.existsSync(pdfPath)) {
        console.log(`⚠️  PDF no encontrado: ${pdfPath}\n`);
        continue;
      }

      const buffer = fs.readFileSync(pdfPath);

      // Parsear PDF
      const result = await parser.parsePdf(buffer, year, `https://www.dian.gov.co/Calendarios/Calendario_Tributario_${year}.pdf`);

      // Mostrar resultados
      console.log(`✅ Tipos de obligación detectados: ${result.taxTypesDetected.length}`);
      result.taxTypesDetected.forEach(type => console.log(`   - ${type}`));

      console.log(`\n📊 Total de fechas extraídas: ${result.totalDates}`);

      if (result.parseWarnings.length > 0) {
        console.log('\n⚠️  Advertencias:');
        result.parseWarnings.forEach(w => console.log(`   - ${w}`));
      }

      if (result.parseErrors.length > 0) {
        console.log('\n❌ Errores:');
        result.parseErrors.forEach(e => console.log(`   - ${e}`));
      }

      // Mostrar primeras 10 fechas como ejemplo
      if (result.dates.length > 0) {
        console.log('\n📝 Primeras 10 fechas extraídas:');
        result.dates.slice(0, 10).forEach((date, i) => {
          console.log(`   ${i + 1}. ${date.taxObligationTypeCode} - NIT dígito ${date.nitLastDigits || 'Todos'} - ${date.dueDay}/${date.dueMonthName}/${date.year}`);
        });
      }

      // Agrupar por tipo
      const byType = result.dates.reduce((acc, date) => {
        if (!acc[date.taxObligationTypeCode]) {
          acc[date.taxObligationTypeCode] = 0;
        }
        acc[date.taxObligationTypeCode]++;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📈 Fechas por tipo de obligación:');
      Object.entries(byType)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count} fechas`);
        });

      // Validar
      const isValid = parser.validateParseResult(result);
      console.log(`\n${isValid ? '✅' : '❌'} Validación: ${isValid ? 'EXITOSA' : 'FALLIDA'}`);

    } catch (error) {
      console.error(`\n❌ Error procesando ${year}:`, error.message);
    }

    console.log('\n');
  }

  console.log('='.repeat(80));
  console.log('✅ Test completado');
  console.log('='.repeat(80));
}

testFullParser().catch(console.error);
