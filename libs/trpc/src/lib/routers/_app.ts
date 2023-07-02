import { t } from '../server';
import { metaProcedure } from './meta';
export const appRouter = t.router({
  meta: metaProcedure,
});

export type AppRouter = typeof appRouter;
