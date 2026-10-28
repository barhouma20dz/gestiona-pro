import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function isSqlite(): boolean {
  return (process.env.DATABASE_URL ?? '').startsWith('file:')
}

/** True when the app runs on the local SQLite file (desktop / sandbox). */
export const isSqliteDb = isSqlite()

/**
 * Exclusive in-process write queue for SQLite (م-0 acceptance: 20 concurrent
 * sales with no duplicates or gaps). Local deployments are a single Node
 * process; serializing write transactions there removes SQLITE_BUSY churn
 * entirely. Postgres (production) is unaffected — row locks handle it.
 * Stored on globalThis so hot reload cannot spawn competing queues.
 */
const globalQueue = globalThis as unknown as {
  __gestionaWriteQueue?: Promise<unknown>
}

export function withSqliteWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!isSqlite()) return fn()
  const prev = (globalQueue.__gestionaWriteQueue ?? Promise.resolve()) as Promise<void>
  const run = prev.then(fn, fn)
  globalQueue.__gestionaWriteQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

/**
 * Query logging is OFF by default — it leaked every statement (with data)
 * to stdout in production (م-0). Enable explicitly in development only:
 *   PRISMA_LOG_QUERIES=1 npm run dev
 */
function createClient(): PrismaClient {
  const logQueries =
    process.env.NODE_ENV === 'development' &&
    process.env.PRISMA_LOG_QUERIES === '1'

  return new PrismaClient({
    log: logQueries ? ['query', 'error', 'warn'] : ['error', 'warn'],
  })
}

/** One-time SQLite hardening: WAL + busy timeout (survives power cuts, م-0/8.2). */
async function hardenSqlite(client: PrismaClient): Promise<void> {
  if (!isSqlite()) return
  try {
    await client.$executeRawUnsafe('PRAGMA journal_mode=WAL;')
    await client.$executeRawUnsafe('PRAGMA busy_timeout=5000;')
  } catch (err) {
    console.warn('[db] SQLite hardening skipped:', (err as Error).message)
  }
}

export const db =
  globalForPrisma.prisma ?? createClient()

if (!globalForPrisma.prisma) {
  // Fire-and-forget: pragmas apply per connection file the first time.
  void hardenSqlite(db)
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
