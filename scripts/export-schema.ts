/** npm run db:schema — exporta as migrações para database/schema.sql */
import { writeFileSync } from 'node:fs';
import { MIGRATIONS } from '../server/db/schema';

const header = `-- MIÚDA — Da Toca do Javali\n-- Esquema PostgreSQL gerado a partir de server/db/schema.ts (não edite à mão).\n-- As migrações são aplicadas automaticamente pela aplicação.\n`;
const body = MIGRATIONS.map((m) => `\n-- Migração ${m.version}: ${m.name}\n${m.sql.trim()}\n`).join('');
writeFileSync('database/schema.sql', header + body);
console.log('database/schema.sql atualizado.');
