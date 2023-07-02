import {
  CreateExpressContextOptions,
  createExpressMiddleware,
} from '@trpc/server/adapters/express';
import { Context } from '../context';
import { appRouter } from '../routers';

export function expressCreateContext({
  req,
}: CreateExpressContextOptions): Context {
  const APIToken = req.headers.authorization?.replace(/^Token /, '');
  return { APIToken };
}

export function expressHandleTRPCRequest() {
  return createExpressMiddleware({
    router: appRouter,
    createContext: expressCreateContext,
  });
}
