import { t } from '../server';
import { healthRouter } from './health';
import { metaProcedure } from './meta';
export const appRouter = t.router({
  health: healthRouter,
  meta: metaProcedure,
});

export type AppRouter = typeof appRouter;
