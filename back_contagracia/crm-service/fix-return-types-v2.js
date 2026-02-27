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
    
    // Split by lines to process more carefully
    let lines = content.split('\n');
    let modified = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains async method definition
      // Pattern: async methodName(anything) {  or  async methodName(anything)
      // But NOT if it already has : or if it's inside a decorator
      if (line.match(/^\s*async\s+\w+\s*\(/) && !line.includes(':') && !line.includes('@')) {
        // Check if closing paren is on same line
        const parenCount = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        
        if (parenCount === 0) {
          // Complete signature is on this line
          // Find the closing paren
          const lastParen = line.lastIndexOf(')');
          if (lastParen !== -1) {
            const afterParen = line.substring(lastParen + 1).trim();
            // Only add if not already has return type or not about to open brace
            if (!afterParen.startsWith(':') && (afterParen === '{' || afterParen === '' || afterParen.startsWith('{') || !afterParen)) {
              const newLine = line.substring(0, lastParen + 1) + ': Promise<any>' + line.substring(lastParen + 1);
              lines[i] = newLine;
              modified = true;
              methodsFixed++;
            }
          }
        } else if (parenCount > 0) {
          // Multi-line method signature - find closing paren on subsequent lines
          let searchIndex = i + 1;
          let foundClosing = false;
          
          while (searchIndex < lines.length && searchIndex < i + 20) {
            const nextLine = lines[searchIndex];
            if (nextLine.includes(')')) {
              const closingParenIndex = nextLine.lastIndexOf(')');
              const afterParen = nextLine.substring(closingParenIndex + 1).trim();
              
              if (!afterParen.startsWith(':') && (afterParen === '{' || afterParen === '' || afterParen.startsWith('{') || !afterParen)) {
                lines[searchIndex] = nextLine.substring(0, closingParenIndex + 1) + ': Promise<any>' + nextLine.substring(closingParenIndex + 1);
                modified = true;
                methodsFixed++;
                foundClosing = true;
              }
              break;
            }
            searchIndex++;
          }
        }
      }
    }
    
    if (modified) {
      const newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✓ Fixed: ${filePath}`);
    } else {
      console.log(`- Skipped (already has return types): ${filePath}`);
    }
    filesProcessed++;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

walkDir(sourceDir, fixFile);
console.log(`\nProcessed: ${filesProcessed} files`);
console.log(`Methods fixed: ${methodsFixed}`);
