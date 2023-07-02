import SuperJSON from 'superjson';
import { createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';

import type { AppRouter } from '@zk-kv/trpc';

// Note: With the exception of NODE_ENV, process.env variables are not
// available on statically build client, only server-side where there is an
// actual running process[1]. The `trpc` export will use the url from
// `process.env['API_URL']` when available and default to '/api' when not.
//
// Use `createTRPCClient` to init trpc client with an explictly set api url.
//
// [1] https://github.com/remix-run/remix/discussions/2928

const getURL = () => {
  const urlDefault = '/api';
  try {
    return process.env['API_URL'] ?? urlDefault;
  } catch (e) {
    return urlDefault;
  }
};

export const createTRPCClient = (url = getURL()) =>
  createTRPCProxyClient<AppRouter>({
    transformer: SuperJSON,
    links: [
      // Log to console in development and only log errors in production
      // https://trpc.io/docs/links/loggerLink
      loggerLink({
        enabled: (opts) =>
          (process.env['NODE_ENV'] === 'development' &&
            typeof window !== 'undefined') ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      httpBatchLink({
        url,
      }),
    ],
  });

export const trpc = createTRPCClient();
