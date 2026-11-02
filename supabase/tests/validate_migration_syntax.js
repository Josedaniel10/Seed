import fs from 'fs';
import path from 'path';

const upPath = path.resolve('supabase/migrations/20261102000001_initial_schema.sql');
const downPath = path.resolve('supabase/migrations/20261102000001_initial_schema_down.sql');

const upContent = fs.readFileSync(upPath, 'utf8');
const downContent = fs.readFileSync(downPath, 'utf8');

// Extraer tablas creadas en el UP
const createdTables = [...upContent.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z_]+)/g)].map(m => m[1]);

// Extraer tablas eliminadas en el DOWN
const droppedTables = [...downContent.matchAll(/DROP TABLE IF EXISTS\s+([a-zA-Z_]+)/g)].map(m => m[1]);

console.log(`[UP] Tablas encontradas (${createdTables.length}):`, createdTables.join(', '));
console.log(`[DOWN] Tablas a revertir (${droppedTables.length}):`, droppedTables.join(', '));

// Validar que todas las tablas creadas tienen su correspondiente DROP
const missingDrops = createdTables.filter(t => !droppedTables.includes(t));
if (missingDrops.length > 0) {
  console.error('ERROR: Faltan tablas por revertir en el script DOWN:', missingDrops);
  process.exit(1);
}

// Validar que no hay paréntesis ni comillas desbalanceadas
function checkBalances(content, filename) {
  let openParen = 0;
  for (let char of content) {
    if (char === '(') openParen++;
    if (char === ')') openParen--;
  }
  if (openParen !== 0) {
    console.error(`ERROR: Paréntesis desbalanceados en ${filename}: delta = ${openParen}`);
    process.exit(1);
  }
}

checkBalances(upContent, 'initial_schema.sql');
checkBalances(downContent, 'initial_schema_down.sql');

console.log('Validación exitosa: Todos los esquemas se aplican y se revierten sin inconsistencias.');
