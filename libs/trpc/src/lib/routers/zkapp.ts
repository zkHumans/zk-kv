import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../middleware/prisma';
import { t } from '../server';

export const selectZkApp = Prisma.validator<Prisma.zkappSelect>()({
  address: true,
  blockInit: true,
  blockLast: true,
  createdAt: true,
  updatedAt: true,
});

export const zkappRouter = t.router({
  create: t.procedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .mutation(async ({ input: { address } }) => {
      return await prisma.zkapp.create({
        data: {
          address,
        },
        select: selectZkApp,
      });
    }),

  delete: t.procedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .mutation(async ({ input: { address } }) => {
      return await prisma.zkapp.delete({ where: { address } });
    }),

  update: t.procedure
    .input(
      z.object({
        address: z.string(),
        blockInit: z.bigint().optional(),
        blockLast: z.bigint().optional(),
      })
    )
    .mutation(async ({ input: { address, ...data } }) => {
      return await prisma.zkapp.update({
        where: { address },
        data,
        select: selectZkApp,
      });
    }),

  byAddress: t.procedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input: { address } }) => {
      return await prisma.zkapp.findUnique({
        where: { address },
        select: selectZkApp,
      });
    }),
});
