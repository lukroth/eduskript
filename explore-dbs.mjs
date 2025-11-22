import { prisma } from './src/lib/prisma.ts'
import initSqlJs from 'sql.js'
import { readFile } from 'fs/promises'

// Find the database files
const files = await prisma.file.findMany({
  where: {
    name: {
      in: ['world_bank_indicators.db', 'netflix.db']
    }
  },
  select: {
    id: true,
    name: true,
    hash: true
  }
})

console.log('Found databases:', files.map(f => f.name))

// Initialize SQL.js
const SQL = await initSqlJs()

for (const file of files) {
  console.log(`\n=== ${file.name} ===`)
  
  // Try both .db and .sqlite extensions
  let dbPath
  try {
    dbPath = `./uploads/${file.hash}.db`
    await readFile(dbPath)
  } catch {
    dbPath = `./uploads/${file.hash}.sqlite`
  }
  
  const buffer = await readFile(dbPath)
  const db = new SQL.Database(buffer)
  
  // Get all tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log('\nTables:', tables[0]?.values.map(v => v[0]).join(', '))
  
  // For each table, show schema
  for (const tableRow of tables[0]?.values || []) {
    const tableName = tableRow[0]
    const schema = db.exec(`PRAGMA table_info(${tableName})`)
    console.log(`\n${tableName} columns:`)
    schema[0]?.values.forEach(col => {
      console.log(`  - ${col[1]} (${col[2]})`)
    })
    
    // Show row count
    const count = db.exec(`SELECT COUNT(*) FROM ${tableName}`)
    console.log(`  Total rows: ${count[0]?.values[0][0]}`)
    
    // Show sample row
    const sample = db.exec(`SELECT * FROM ${tableName} LIMIT 1`)
    if (sample[0]) {
      const colNames = sample[0].columns.join(', ')
      console.log(`  Sample columns: ${colNames}`)
    }
  }
  
  db.close()
}

await prisma.$disconnect()
