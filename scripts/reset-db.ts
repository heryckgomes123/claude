/** npm run db:reset — apaga todos os dados e recria a demonstração. */
import { ensureReady, resetAllData } from '../server/bootstrap';

const db = await ensureReady();
const r = await resetAllData(db);
console.log('[db:reset] Dados recriados:', r);
await db.close();
process.exit(0);
