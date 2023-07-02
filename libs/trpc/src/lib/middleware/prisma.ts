import { PrismaClient } from '@prisma/client';
import { t } from '../server';

/**
 * Instantiate a single instance PrismaClient and save it on the global object.
 * @link https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices
 */
const prismaGlobal = global as typeof global & {
  prisma?: PrismaClient;
};

// export prisma client directly
export const prisma: PrismaClient =
  prismaGlobal.prisma ||
  new PrismaClient({
    errorFormat: 'minimal',
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  prismaGlobal.prisma = prisma;
}

// export prisma client as trpc middleware
export const prismaMiddleware = t.middleware(({ next, ctx }) => {
  return next({
    ctx: {
      ...ctx,
      prisma,
    },
  });
});
