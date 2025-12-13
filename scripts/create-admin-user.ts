import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/create-admin-user.ts <email> <password> [name] [tenantSlug]')
    console.log('\nExample:')
    console.log('  npx tsx scripts/create-admin-user.ts admin@example.com mypassword123 "Admin User" yodha-strength')
    process.exit(1)
  }

  const email = args[0]
  const password = args[1]
  const name = args[2] || 'Admin User'
  const tenantSlug = args[3]

  // Validate password length
  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long')
    process.exit(1)
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.error(`❌ Error: User with email ${email} already exists`)
      process.exit(1)
    }

    // Find tenant if slug provided
    let tenantId: string | undefined = undefined
    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      })

      if (!tenant) {
        console.error(`❌ Error: Tenant with slug "${tenantSlug}" not found`)
        console.log('\nAvailable tenants:')
        const tenants = await prisma.tenant.findMany({
          select: { slug: true, name: true },
        })
        tenants.forEach((t) => console.log(`  - ${t.slug} (${t.name})`))
        process.exit(1)
      }

      tenantId = tenant.id
      console.log(`✓ Found tenant: ${tenant.name}`)
    }

    // Hash password
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    console.log('👤 Creating admin user...')
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tenantId,
        role: tenantId ? 'admin' : 'user',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenant: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    })

    console.log('\n✅ Admin user created successfully!\n')
    console.log('User Details:')
    console.log(`  ID: ${user.id}`)
    console.log(`  Name: ${user.name}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Role: ${user.role}`)
    if (user.tenant) {
      console.log(`  Tenant: ${user.tenant.name} (${user.tenant.slug})`)
      console.log(`\n🔗 Login and visit: http://localhost:3000/admin/${user.tenant.slug}`)
    } else {
      console.log(`  Tenant: None`)
      console.log(`\n🔗 Login at: http://localhost:3000/login`)
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
