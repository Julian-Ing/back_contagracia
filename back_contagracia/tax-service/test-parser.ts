/**
 * Script de prueba para el PDF Parser
 * Uso: npx ts-node test-parser.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import pdfParse = require('pdf-parse');

async function testParser() {
  console.log('🔍 Analizando PDF del Calendario DIAN 2025...\n');

  // Leer el PDF
  const pdfPath = path.join(__dirname, 'pdf-calendarios', 'Calendario_Tributario_2025.pdf');
  const dataBuffer = fs.readFileSync(pdfPath);

  try {
    // Extraer texto
    const data = await pdfParse(dataBuffer);

    console.log('📄 Información del PDF:');
    console.log(`   - Páginas: ${data.numpages}`);
    console.log(`   - Caracteres: ${data.text.length}`);
    console.log('\n' + '='.repeat(80) + '\n');

    // Mostrar primeras 3000 caracteres para análisis
    console.log('📝 Primeros 3000 caracteres del texto extraído:\n');
    console.log(data.text.substring(0, 3000));
    console.log('\n' + '='.repeat(80) + '\n');

    // Buscar patrones de fechas
    console.log('📅 Buscando patrones de fechas...\n');

    // Patrón común en calendarios DIAN: "9 de febrero de 2025"
    const datePattern = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi;
    const dates = data.text.match(datePattern);

    if (dates) {
      console.log(`   ✅ Encontradas ${dates.length} fechas con patrón "DD de mes de YYYY"`);
      console.log('   Ejemplos:');
      dates.slice(0, 10).forEach(date => console.log(`      - ${date}`));
    }

    // Buscar referencias a dígitos del NIT
    console.log('\n🔢 Buscando referencias a dígitos del NIT...\n');
    const nitPattern = /[uú]ltimo\s+d[ií]gito.*?[0-9]/gi;
    const nitRefs = data.text.match(nitPattern);

    if (nitRefs) {
      console.log(`   ✅ Encontradas ${nitRefs.length} referencias a dígitos del NIT`);
      console.log('   Ejemplos:');
      nitRefs.slice(0, 5).forEach(ref => console.log(`      - ${ref}`));
    }

    // Buscar tipos de impuestos
    console.log('\n💰 Buscando tipos de impuestos...\n');
    const taxTypes = [
      { name: 'Renta GC', pattern: /grandes\s+contribuyentes/gi },
      { name: 'IVA', pattern: /impuesto.*valor.*agregado/gi },
      { name: 'Retención', pattern: /retenci[oó]n.*fuente/gi },
      { name: 'RST', pattern: /r[ée]gimen\s+simple/gi },
    ];

    taxTypes.forEach(({ name, pattern }) => {
      const matches = data.text.match(pattern);
      if (matches) {
        console.log(`   ✅ ${name}: ${matches.length} menciones`);
      }
    });

    // Guardar texto completo para análisis detallado
    const outputPath = path.join(__dirname, 'pdf-text-output.txt');
    fs.writeFileSync(outputPath, data.text, 'utf8');
    console.log(`\n💾 Texto completo guardado en: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testParser();
