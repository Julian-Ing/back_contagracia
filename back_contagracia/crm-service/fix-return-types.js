const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'src', 'modules');
let filesProcessed = 0;
let methodsFixed = 0;

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.controller.ts') || file.endsWith('.service.ts')) {
      callback(filePath);
    }
  });
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Match async methods without return type annotations
    // Pattern: async methodName(...) { or async methodName(...):
    // We want to add : Promise<any> before the {
    content = content.replace(
      /async\s+(\w+)\s*\(([^)]*)\)\s*(?!:)/g,
      (match, methodName, params) => {
        // Check if there's already a return type or if next char is {
        const idx = match.lastIndexOf(')');
        const afterParen = match.substring(idx + 1).trim();
        if (afterParen.startsWith(':')) {
          // Already has return type
          return match;
        }
        return `async ${methodName}(${params}): Promise<any>`;
      }
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      methodsFixed += countMatches(originalContent, /async\s+\w+\s*\([^)]*\)\s*(?!:)/g);
      console.log(`✓ Fixed: ${filePath}`);
    } else {
      console.log(`- Skipped (no changes needed): ${filePath}`);
    }
    filesProcessed++;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function countMatches(str, regex) {
  const matches = str.match(regex);
  return matches ? matches.length : 0;
}

walkDir(sourceDir, fixFile);
console.log(`\nProcessed: ${filesProcessed} files`);
console.log(`Methods fixed: ${methodsFixed}`);
