import { prisma } from '../middleware/prisma';
import { t } from '../server';

export const healthRouter = t.router({
  check: t.procedure.query(async () => {
    // ensure a database connection can be established
    await prisma.store.count();
    return 1;
  }),
});
