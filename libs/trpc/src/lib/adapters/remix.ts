import type { DataFunctionArgs } from '@remix-run/server-runtime';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../routers';
import { fetchCreateContext } from './fetch';

export function remixHandleTRPCRequest({ request }: DataFunctionArgs) {
  return fetchRequestHandler({
    endpoint: '/api',
    req: request,
    router: appRouter,
    createContext: fetchCreateContext,
  });
}
