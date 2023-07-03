import { jest } from '@jest/globals';
import { Field, MerkleMap } from 'snarkyjs';
import { trpc } from '@zk-kv/trpc-client';

describe('Store', () => {
  jest.setTimeout(1000 * 100);

  const id = '__TEST__'; // store identifier
  const address = '__TEST__'; // zkapp address

  const k1 = Field(100);
  const v1 = Field(200);
  const k2 = Field(300);
  const v2 = Field(400);

  it('should create, update, restore a MerkleMap in database', async () => {
    ////////////////////////////////////
    // Get / Clear (for fresh test)
    ////////////////////////////////////

    if (await trpc.store.byId.query({ id }))
      await trpc.store.delete.mutate({ id });

    if (await trpc.zkapp.byAddress.query({ address }))
      await trpc.zkapp.delete.mutate({ address });

    ////////////////////////////////////
    // Create
    ////////////////////////////////////

    // Create a MM
    const mm1 = new MerkleMap();

    // crete zkapp in database
    await trpc.zkapp.create.mutate({ address });

    // create store in database
    let store = await trpc.store.create.mutate({
      id,
      commitment: '',
      zkapp: { address },
    });

    ////////////////////////////////////
    // Update
    ////////////////////////////////////

    // add to the MM
    mm1.set(k1, v1);
    await trpc.store.set.mutate({
      store: { id },
      key: k1.toString(),
      value: v1.toString(),
    });

    // add to the MM
    mm1.set(k2, v2);
    await trpc.store.set.mutate({
      store: { id },
      key: k2.toString(),
      value: v2.toString(),
    });

    // delete from MM (set to "empty")
    mm1.set(k1, Field(0));
    await trpc.store.set.mutate({
      store: { id },
      key: k1.toString(),
      value: Field(0).toString(),
    });

    ////////////////////////////////////
    // Restore
    ////////////////////////////////////

    // get store from database
    store = await trpc.store.byId.query({ id });
    console.log('store', store);

    const mm2 = new MerkleMap();

    // restore Merkle Map from db store
    for (const data of store.data) {
      try {
        mm2.set(Field(data.key), Field(data.value));
      } catch (e) {
        console.log('Error', e.message);
      }
    }

    ////////////////////////////////////
    // Prove
    ////////////////////////////////////

    const witness1 = mm1.getWitness(k2);
    const witness2 = mm2.getWitness(k2);
    expect(witness1.equals(witness2).toBoolean()).toBeTruthy();

    ////////////////////////////////////
    // Clean up
    ////////////////////////////////////

    const s = await trpc.store.delete.mutate({ id });
    expect(s).toBeTruthy();

    const z = await trpc.zkapp.delete.mutate({ address });
    expect(z).toBeTruthy();
  });
});
