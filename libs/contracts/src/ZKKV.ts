import {
  Field,
  MerkleMapWitness,
  SmartContract,
  State,
  Struct,
  method,
  state,
} from 'snarkyjs';

export class EventStore extends Struct({
  id: Field, // store identifier
  root0: Field, // before state change
  root1: Field, // after state change
  key: Field,
  value: Field,

  /**
   * Meta or protocol data. It is passed as-is (not hashed/encrypted).
   *
   * Increase or decrease the number of fields as needed then update
   * eventStoreDefault.meta and StoreData.meta* to match.
   */
  meta: [Field, Field, Field],
}) {}

// "empty" or default value for a key not within a MerkleMap
export const EMPTY = Field(0);

export const eventStoreDefault = {
  id: EMPTY,
  root0: EMPTY,
  root1: EMPTY,
  key: EMPTY,
  value: EMPTY,
  meta: [EMPTY, EMPTY, EMPTY],
};

/**
 * A Store.
 */
export class Store extends Struct({
  identifier: Field, // aka id
  commitment: Field, // aka root
}) {
  getKey(): Field {
    return this.identifier;
  }
  getValue(): Field {
    return this.commitment;
  }
  setCommitment(commitment: Field): Store {
    return new Store({
      identifier: this.identifier,
      commitment,
    });
  }
}

/**
 * An individual unit of key:value data.
 */
export class StoreData extends Struct({
  store: Store,
  key: Field,
  value: Field,
  meta0: Field,
  meta1: Field,
  meta2: Field,
}) {
  getKey(): Field {
    return this.key;
  }

  getValue(): Field {
    return this.value;
  }

  getMeta() {
    return [this.meta0, this.meta1, this.meta2];
  }

  static init(
    store: Store,
    key: Field,
    value = eventStoreDefault.value,
    meta = eventStoreDefault.meta
  ): StoreData {
    return new StoreData({
      store,
      key,
      value,
      meta0: meta[0],
      meta1: meta[1],
      meta2: meta[2],
    });
  }
}

export class ZKKV extends SmartContract {
  // off-chain storage identifier (id)
  @state(Field) storeIdentifier = State<Field>();

  // off-chain storage commitment (root)
  @state(Field) storeCommitment = State<Field>();

  override events = {
    // for updating off-chain data
    'store:new': EventStore,
    'store:set': EventStore,
  };

  @state(Field) num = State<Field>();

  override init() {
    super.init();
    this.num.set(Field(1));
  }

  @method update() {
    const currentState = this.num.getAndAssertEquals();
    const newState = currentState.add(2);
    this.num.set(newState);
  }

  // add a store; only if it has not already been added
  // a store is Data to the Store of the Contract
  @method addStore(data1: StoreData, witnessManager: MerkleMapWitness) {
    const mgrStoreCommitment = this.storeCommitment.getAndAssertEquals();
    const mgrStoreIdentifier = this.storeIdentifier.getAndAssertEquals();

    const key = data1.getKey();
    const value = data1.getValue();
    const meta = data1.getMeta();

    // prove the store has not been added
    // by asserting the "current" value for this key is empty
    const [root0] = witnessManager.computeRootAndKey(EMPTY);
    root0.assertEquals(mgrStoreCommitment, 'Store already added!');

    // set the new Merkle Map root based on the new store
    const [root1] = witnessManager.computeRootAndKey(value);
    this.storeCommitment.set(root1);

    this.emitEvent('store:set', {
      id: mgrStoreIdentifier,
      root0,
      root1,
      key,
      value,
      meta,
    });

    this.emitEvent('store:new', {
      ...eventStoreDefault,
      id: key,
      root1: value,
    });
  }

  /**
   * setStore; update a store that has been added to the Manager.
   *
   * @param {StoreData} data0 The store with previosly recorded value.
   * @param {StoreData} data1 The store with new value to update.
   */
  @method setStore(
    data0: StoreData,
    data1: StoreData,
    witnessManager: MerkleMapWitness
  ) {
    const mgrStoreCommitment = this.storeCommitment.getAndAssertEquals();
    const mgrStoreIdentifier = this.storeIdentifier.getAndAssertEquals();

    // assert keys (store identifiers) are the same
    data0.getKey().assertEquals(data1.getKey(), 'Store keys do not match!');

    // prove the store has been added to the manager
    // by asserting the current value is known
    const [root0] = witnessManager.computeRootAndKey(data0.getValue());
    root0.assertEquals(mgrStoreCommitment, 'Store not added!');

    // set the new Merkle Map root based on the new store data
    const [root1] = witnessManager.computeRootAndKey(data1.getValue());
    this.storeCommitment.set(root1);

    this.emitEvent('store:set', {
      id: mgrStoreIdentifier,
      root0,
      root1,
      key: data1.getKey(),
      value: data1.getValue(),
      meta: data1.getMeta(),
    });
  }

  /**
   * setStoreData; update data in a store that has been added to the Manager.
   *
   * To add store data, use data0 value = EMPTY
   * To del store data, use data1 value = EMPTY
   *
   * @param {StoreData} data0 The store with previosly recorded value.
   * @param {StoreData} data1 The store with new value to update.
   */
  @method setStoreData(
    data0: StoreData,
    data1: StoreData,
    witnessStore: MerkleMapWitness,
    witnessManager: MerkleMapWitness
  ) {
    const mgrStoreCommitment = this.storeCommitment.getAndAssertEquals();
    const mgrStoreIdentifier = this.storeIdentifier.getAndAssertEquals();

    // assert keys (store identifiers) are the same
    data0.getKey().assertEquals(data1.getKey(), 'StoreData keys do not match!');
    data0.store
      .getKey()
      .assertEquals(data1.store.getKey(), 'Store keys do not match!');

    // prove the data has not been added to the store
    // by asserting the current value is known
    const [storeRoot0] = witnessStore.computeRootAndKey(data0.getValue());
    const [mgrRoot0] = witnessManager.computeRootAndKey(storeRoot0);
    mgrRoot0.assertEquals(
      mgrStoreCommitment,
      'current StoreData assertion failed!'
    );

    // set the new Merkle Map root based on the new store data
    const [storeRoot1] = witnessStore.computeRootAndKey(data1.getValue());
    const [mgrRoot1] = witnessManager.computeRootAndKey(storeRoot1);
    this.storeCommitment.set(mgrRoot1);

    // set data in store
    this.emitEvent('store:set', {
      id: data1.store.getKey(),
      root0: storeRoot0,
      root1: storeRoot1,
      key: data1.getKey(),
      value: data1.getValue(),
      meta: data1.getMeta(),
    });

    // set data in manager's store
    this.emitEvent('store:set', {
      ...eventStoreDefault,
      id: mgrStoreIdentifier,
      root0: mgrRoot0,
      root1: mgrRoot1,
      key: data1.store.getKey(),
      value: data1.store.getValue(),
    });
  }
}
