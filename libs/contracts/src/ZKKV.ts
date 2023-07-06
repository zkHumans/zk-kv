import {
  MerkleMapWitness,
  Field,
  Reducer,
  SmartContract,
  State,
  Struct,
  method,
  state,
  Experimental,
  SelfProof,
} from 'snarkyjs';

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

/**
 * State transformation of StoreData.
 */
export class StoreDataTransformation extends Struct({
  /**
   * Commited StoreData, its current state.
   */
  data0: StoreData,

  /**
   * New StoreData.
   */
  data1: StoreData,

  /**
   * Merkle proof of the data within the store.
   */
  witnessStore: MerkleMapWitness,

  /**
   * Merkle Proof of the Store within the manager (zkApp).
   */
  witnessManager: MerkleMapWitness,
}) {}

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

/**
 * emitted by event 'store:set:pending'
 */
export class EventStorePending extends Struct({
  /**
   * Commited StoreData, its current state.
   */
  data0: StoreData,

  /**
   * New StoreData.
   */
  data1: StoreData,
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

export class Action extends Struct({
  root0: Field, // the zkApp's storeCommitment
  data0: StoreData, // current store data
  data1: StoreData, // new store data
}) {}

export class RollupState extends Struct({
  initialRoot: Field,
  latestRoot: Field,
}) {
  static createOneStep(
    initialRoot: Field,
    latestRoot: Field,
    transformation: StoreDataTransformation
  ) {
    const { data0, data1, witnessStore, witnessManager } = transformation;

    // assert keys (store identifiers) are the same - necessary?
    data0.getKey().assertEquals(data1.getKey(), 'StoreData keys do not match!');
    data0.store
      .getKey()
      .assertEquals(data1.store.getKey(), 'Store keys do not match!');

    // assert current value in the store in the manager
    const [storeRoot0, storeKey0] = witnessStore.computeRootAndKey(
      data0.getValue()
    );
    const [mgrRoot0] = witnessManager.computeRootAndKey(storeRoot0);
    mgrRoot0.assertEquals(initialRoot, 'current StoreData assertion failed!');
    storeKey0.assertEquals(data0.getKey());

    // assert latest root based on the new data in the store in the manager
    const [storeRoot1] = witnessStore.computeRootAndKey(data1.getValue());
    const [mgrRoot1] = witnessManager.computeRootAndKey(storeRoot1);
    latestRoot.assertEquals(mgrRoot1);

    return new RollupState({
      initialRoot,
      latestRoot,
    });
  }

  static createMerged(state1: RollupState, state2: RollupState) {
    return new RollupState({
      initialRoot: state1.initialRoot,
      latestRoot: state2.latestRoot,
    });
  }

  static assertEquals(state1: RollupState, state2: RollupState) {
    state1.initialRoot.assertEquals(state2.initialRoot);
    state1.latestRoot.assertEquals(state2.latestRoot);
  }
}

export const RollupTransformations = Experimental.ZkProgram({
  publicInput: RollupState,

  methods: {
    oneStep: {
      privateInputs: [Field, Field, StoreDataTransformation],
      method(
        state: RollupState,
        initialRoot: Field,
        latestRoot: Field,
        transformation: StoreDataTransformation
      ) {
        const computedState = RollupState.createOneStep(
          initialRoot,
          latestRoot,
          transformation
        );
        RollupState.assertEquals(computedState, state);
      },
    },

    merge: {
      privateInputs: [SelfProof, SelfProof],

      method(
        newState: RollupState,
        rollup1proof: SelfProof<RollupState, void>,
        rollup2proof: SelfProof<RollupState, void>
      ) {
        rollup1proof.verify(); // A -> B
        rollup2proof.verify(); // B -> C

        rollup1proof.publicInput.initialRoot.assertEquals(newState.initialRoot);

        rollup1proof.publicInput.latestRoot.assertEquals(
          rollup2proof.publicInput.initialRoot
        );

        rollup2proof.publicInput.latestRoot.assertEquals(newState.latestRoot);
      },
    },
  },
});

export const RollupTransformationsProof_ = Experimental.ZkProgram.Proof(
  RollupTransformations
);
export class RollupTransformationsProof extends RollupTransformationsProof_ {}

export class ZKKV extends SmartContract {
  /**
   * Static identifier of the Store.
   */
  @state(Field) storeIdentifier = State<Field>();

  /**
   * Root of the Merkle Map that stores all committed Stores.
   */
  @state(Field) storeCommitment = State<Field>();

  /**
   * Accumulator of all emitted StoreData state transformations.
   */
  @state(Field) accumulatedTransformations = State<Field>();

  reducer = Reducer({ actionType: Action });

  override events = {
    // for updating off-chain data
    'store:new': EventStore,
    'store:set': EventStore,
    'store:pending': EventStorePending,

    // triggers pending events to be committed
    // previous storeCommitment that is settled
    'store:commit': Field,
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
   * @param {MerkleMapWitness} witnessStore Witness for Store within Manager.
   * @param {MerkleMapWitness} witnessManager Witness for Data within Store.
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

  /**
   * Update data in a store that has been added to the Manager.
   * Uses reducer for txn concurrency.
   *
   * To add store data, use data0 value = EMPTY
   * To del store data, use data1 value = EMPTY
   *
   * @param {StoreData} data0 The store with previosly recorded value.
   * @param {StoreData} data1 The store with new value to update.
   * @param {MerkleMapWitness} witnessStore Witness for Store within Manager.
   * @param {MerkleMapWitness} witnessManager Witness for Data within Store.
   */
  @method setStoreDataConcurrent(
    data0: StoreData,
    data1: StoreData,
    witnessStore: MerkleMapWitness,
    witnessManager: MerkleMapWitness
  ) {
    const mgrStoreCommitment = this.storeCommitment.getAndAssertEquals();

    // assert keys (store identifiers) are the same
    data0.getKey().assertEquals(data1.getKey(), 'StoreData keys do not match!');
    data0.store
      .getKey()
      .assertEquals(data1.store.getKey(), 'Store keys do not match!');

    // assert the transformation against the current zkApp storeCommitment
    // data in the store in the manager
    const [storeRoot0] = witnessStore.computeRootAndKey(data0.getValue());
    const [mgrRoot0] = witnessManager.computeRootAndKey(storeRoot0);
    mgrRoot0.assertEquals(
      mgrStoreCommitment,
      'current StoreData assertion failed!'
    );

    this.reducer.dispatch({ root0: mgrRoot0, data0, data1 });

    this.emitEvent('store:pending', { data0, data1 });

  }

  @method commitPendingTransformations(proof: RollupTransformationsProof) {
    const mgrStoreCommitment = this.storeCommitment.getAndAssertEquals();

    // ensure the proof started from the zkApp's current commitment
    proof.publicInput.initialRoot.assertEquals(mgrStoreCommitment);

    proof.verify();

    // ?: WIP... reduce actions

    // updat the zkApp's commitment
    this.storeCommitment.set(proof.publicInput.latestRoot);

    // inform storage to commit pending transformations proven on the initial commitment
    this.emitEvent('store:commit', proof.publicInput.initialRoot);
  }
}
