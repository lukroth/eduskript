// Simple admin user seeder (no TypeScript, no tsx required)
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for admin user...')

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'eduadmin@eduskript.org' }
  })

  if (existingAdmin) {
    console.log('Admin user already exists')
    return
  }

  console.log('Creating admin user...')
  const hashedPassword = await bcrypt.hash('letseducate', 12)

  await prisma.user.create({
    data: {
      email: 'eduadmin@eduskript.org',
      name: 'Edu Admin',
      subdomain: 'eduadmin',
      hashedPassword,
      emailVerified: new Date(),
      isAdmin: true,
      requirePasswordReset: true
    }
  })

  console.log('✅ Admin user created: eduadmin@eduskript.org / letseducate')
  console.log('⚠️  User must reset password on first login')
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
