import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  // ═══ 1. Users (upsert by phone) ═══
  const minh = await prisma.user.upsert({
    where: { phone: '0901234567' },
    update: { name: 'Minh', email: 'minh@test.com', passwordHash },
    create: { name: 'Minh', phone: '0901234567', email: 'minh@test.com', passwordHash }
  });

  const lan = await prisma.user.upsert({
    where: { phone: '0901234568' },
    update: { name: 'Lan', email: 'lan@test.com', passwordHash },
    create: { name: 'Lan', phone: '0901234568', email: 'lan@test.com', passwordHash }
  });

  const duc = await prisma.user.upsert({
    where: { phone: '0901234569' },
    update: { name: 'Đức', email: 'duc@test.com', passwordHash },
    create: { name: 'Đức', phone: '0901234569', email: 'duc@test.com', passwordHash }
  });

  const huong = await prisma.user.upsert({
    where: { phone: '0901234570' },
    update: { name: 'Hương', email: 'huong@test.com', passwordHash },
    create: { name: 'Hương', phone: '0901234570', email: 'huong@test.com', passwordHash }
  });

  // ═══ Helper: Create space if not exists ═══
  async function ensureSpace(data, memberList) {
    let space = await prisma.space.findFirst({ where: { name: data.name } });
    if (!space) {
      space = await prisma.space.create({ data });
      for (const m of memberList) {
        await prisma.spaceMember.upsert({
          where: { userId_spaceId: { userId: m.userId, spaceId: space.id } },
          update: { role: m.role },
          create: { userId: m.userId, spaceId: space.id, role: m.role }
        });
      }
    }
    return space;
  }

  // ═══ 2. Preset Spaces — Khu vực Chùa Láng, Hà Nội ═══
  const ftu = await ensureSpace(
    {
      name: 'Đại học Ngoại Thương (FTU)',
      description: 'Trường Đại học Ngoại thương - 91 Chùa Láng, Đống Đa',
      deliveryPoint: 'Sảnh nhà A, cổng chính Chùa Láng',
      latitude: 21.0228,
      longitude: 105.8098,
      createdBy: minh.id
    },
    [
      { userId: minh.id, role: 'ADMIN' },
      { userId: lan.id, role: 'MEMBER' },
      { userId: duc.id, role: 'MEMBER' }
    ]
  );

  await ensureSpace(
    {
      name: 'Học viện Ngoại giao (DAV)',
      description: 'Học viện Ngoại giao - 69 Chùa Láng, Đống Đa',
      deliveryPoint: 'Sảnh tòa nhà chính, cổng Chùa Láng',
      latitude: 21.0235,
      longitude: 105.8085,
      createdBy: lan.id
    },
    [
      { userId: lan.id, role: 'ADMIN' },
      { userId: huong.id, role: 'MEMBER' }
    ]
  );

  await ensureSpace(
    {
      name: 'Đại học Giao thông Vận tải (UTC)',
      description: 'Trường ĐH GTVT - 3 Cầu Giấy, Đống Đa',
      deliveryPoint: 'Cổng chính đường Cầu Giấy, bảo vệ tầng 1',
      latitude: 21.0282,
      longitude: 105.8023,
      createdBy: duc.id
    },
    [{ userId: duc.id, role: 'ADMIN' }]
  );

  await ensureSpace(
    {
      name: 'Học viện Hành chính Quốc gia (NAPA)',
      description: 'Học viện Hành chính Quốc gia - 77 Nguyễn Chí Thanh',
      deliveryPoint: 'Cổng chính Nguyễn Chí Thanh, sảnh tòa A',
      latitude: 21.0245,
      longitude: 105.8045,
      createdBy: huong.id
    },
    [{ userId: huong.id, role: 'ADMIN' }]
  );

  await ensureSpace(
    {
      name: 'Đại học Luật Hà Nội (HLU)',
      description: 'Trường ĐH Luật Hà Nội - 87 Nguyễn Chí Thanh, Đống Đa',
      deliveryPoint: 'Sảnh tòa nhà A, cổng Nguyễn Chí Thanh',
      latitude: 21.0248,
      longitude: 105.8038,
      createdBy: minh.id
    },
    [{ userId: minh.id, role: 'ADMIN' }]
  );

  await ensureSpace(
    {
      name: 'KTX Mễ Trì - ĐH Ngoại Thương',
      description: 'Ký túc xá sinh viên Mễ Trì, Nam Từ Liêm',
      deliveryPoint: 'Sảnh tầng 1, cổng KTX Mễ Trì',
      latitude: 21.0130,
      longitude: 105.7760,
      createdBy: lan.id
    },
    [
      { userId: lan.id, role: 'ADMIN' },
      { userId: minh.id, role: 'MEMBER' },
      { userId: duc.id, role: 'MEMBER' },
      { userId: huong.id, role: 'MEMBER' }
    ]
  );

  // ═══ 3. Demo open session in FTU ═══
  const existingSession = await prisma.session.findFirst({
    where: { spaceId: ftu.id, restaurantName: 'Phúc Long - Chùa Láng' }
  });

  if (!existingSession) {
    const expiresAt = new Date(Date.now() + 60 * 60000); // 60 mins from now
    const session = await prisma.session.create({
      data: {
        spaceId: ftu.id,
        restaurantName: 'Phúc Long - Chùa Láng',
        createdBy: minh.id,
        durationMinutes: 60,
        expiresAt,
        minOrderValue: 100000
      }
    });

    await prisma.orderItem.create({
      data: {
        sessionId: session.id,
        userId: minh.id,
        itemName: 'Trà sữa Phúc Long size L',
        quantity: 1,
        unitPrice: 55000
      }
    });

    await prisma.orderItem.create({
      data: {
        sessionId: session.id,
        userId: lan.id,
        itemName: 'Cà phê sữa đá',
        quantity: 1,
        unitPrice: 35000
      }
    });
  }

  console.log('✅ Seed data initialized successfully (idempotent)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
