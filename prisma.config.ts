import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
    // Shadow DB used for migration diff - optional, set in test env
    ...(process.env.SHADOW_DATABASE_URL && { shadowDatabaseUrl: env('SHADOW_DATABASE_URL') }),
  },
})
