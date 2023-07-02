import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@zk-kv/trpc';

// https://trpc.io/docs/server/infer-types
type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

// input

export type ApiInputMeta = RouterInput['meta'];

export type ApiInputStoreById = RouterInput['store']['byId'];
export type ApiInputStoreCreate = RouterInput['store']['create'];
export type ApiInputStoreDelete = RouterInput['store']['delete'];
export type ApiInputStoreGet = RouterInput['store']['get'];
export type ApiInputStoreSet = RouterInput['store']['set'];

export type ApiInputZkappByAddress = RouterInput['zkapp']['byAddress'];
export type ApiInputZkappCreate = RouterInput['zkapp']['create'];
export type ApiInputZkappDelete = RouterInput['zkapp']['delete'];
export type ApiInputZkappUpdate = RouterInput['zkapp']['update'];

// output

export type ApiOutputMeta = RouterOutput['meta'];

export type ApiOutputStoreById = RouterOutput['store']['byId'];
export type ApiOutputStoreCreate = RouterOutput['store']['create'];
export type ApiOutputStoreDelete = RouterOutput['store']['delete'];
export type ApiOutputStoreGet = RouterOutput['store']['get'];
export type ApiOutputStoreSet = RouterOutput['store']['set'];

export type ApiOutputZkappByAddress = RouterOutput['zkapp']['byAddress'];
export type ApiOutputZkappCreate = RouterOutput['zkapp']['create'];
export type ApiOutputZkappDelete = RouterOutput['zkapp']['delete'];
export type ApiOutputZkappUpdate = RouterOutput['zkapp']['update'];
