const prisma = require('./prisma');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = 'mustahiq_care_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

async function seedUser() {
  console.log('=== SEEDING DEMO USER ===');
  const tenantId = '5bf20421-6695-45aa-a6a9-63355b28fa9e';

  try {
    // Check if tenant exists
    let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: tenantId,
          name: 'Madrasah Uji Coba',
          domain_or_slug: 'demo',
          license_key: 'ORK-DEMO-TEST-KEY-2026',
          settings: JSON.stringify({
            theme: { primary_color: "#059669", accent_color: "#D97706" },
            branding: { slogan: "Berbagi Kehangatan Bersama Yatim Dhuafa" },
            rules: { max_mustahiq: 100, max_age_yatim: 15 }
          })
        }
      });
    }

    const email = 'admin@sekolah.sch.id';
    const password = 'password123';
    const hashedPassword = hashPassword(password);

    await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name: 'Admin Utama',
        role: 'ADMIN'
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Admin Utama',
        tenant_id: tenantId,
        role: 'ADMIN'
      }
    });

    console.log('\n✓ Demo User Seeded Successfully!');
    console.log(`  - Email   : ${email}`);
    console.log(`  - Password: ${password}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedUser();
