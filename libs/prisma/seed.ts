import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  ////////////////////////////////////////////////////////////////////////
  // add db seed data here
  ////////////////////////////////////////////////////////////////////////

  // await prisma.model.create({
  //   data: {
  //     name: 'X',
  //   },
  // });

  // await prisma.model.create({
  //   data: {
  //     name: 'Y',
  //   },
  // });

  // await prisma.model.create({
  //   data: {
  //     name: 'Z',
  //   },
  // });

  console.log(`Database has been seeded. 🌱`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
