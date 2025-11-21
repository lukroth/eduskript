import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://eduskript-dbadmin:npg_Zsjo1JCu9ahT@ep-broad-moon-a2jyig85.eu-central-1.pg.koyeb.app:5432/koyebdb'
})

try {
  console.log('Testing database connection...')
  const client = await pool.connect()
  console.log('✓ Connected to database successfully!')

  const result = await client.query('SELECT NOW()')
  console.log('✓ Query executed:', result.rows[0])

  // Test if User table exists
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  console.log('✓ Tables in database:', tables.rows.map(r => r.table_name).join(', '))

  client.release()
  await pool.end()
  console.log('✓ Connection test complete!')
  process.exit(0)
} catch (error) {
  console.error('✗ Database connection failed:', error.message)
  console.error('Error details:', error)
  process.exit(1)
}
