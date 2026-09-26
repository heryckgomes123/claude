/**
 * Define o papel de um usuário existente.  npm run user:role -- email@exemplo.com ADMIN
 * Útil para criar o primeiro administrador em produção (rode localmente com o DATABASE_URL de produção).
 */
import { eq } from 'drizzle-orm'
import { isRole } from '../src/server/access/roles'
import { user } from '../src/server/db/schema'
import { connect } from './_db'

async function main() {
  const [email, role] = process.argv.slice(2)
  if (!email || !isRole(role)) {
    console.error('Uso: npm run user:role -- email@exemplo.com <USER|ADMIN>')
    process.exit(1)
  }
  const { db, close } = connect()
  try {
    const updated = await db.update(user).set({ role }).where(eq(user.email, email.trim().toLowerCase())).returning({ id: user.id })
    if (!updated.length) {
      console.error(`✖ Nenhum usuário com e-mail ${email}. Crie a conta em /criar-conta primeiro.`)
      process.exitCode = 1
    } else console.log(`✓ ${email} agora é ${role}`)
  } finally {
    await close()
  }
}

main()
