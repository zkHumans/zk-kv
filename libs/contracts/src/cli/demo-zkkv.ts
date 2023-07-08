import {
  AccountUpdate,
  CircuitString,
  Field,
  Mina,
  MerkleMap,
  Poseidon,
  PrivateKey,
  Proof,
  verify,
} from 'snarkyjs';
import { strToBool } from '@zk-kv/utils';
import {
  EMPTY,
  EventStore,
  Store,
  StoreData,
  ZKKV,
  eventStoreDefault,
  RollupTransformations,
  EventStorePending,
  RollupState,
} from '../ZKKV';

////////////////////////////////////////////////////////////////////////
// set config from env
////////////////////////////////////////////////////////////////////////

let proofsEnabled = strToBool(process.env['ZK_PROOFS_ENABLED']) ?? true;
const recursionEnabled = strToBool(process.env['RECURSION_ENABLED']) ?? true;
const demoRecursionOnly = strToBool(process.env['RECURSION_ONLY']) ?? false;

// recursion requires compiled contract
if (recursionEnabled) proofsEnabled = true;

console.log('ZK Proofs Enabled:', proofsEnabled);
console.log('Recursion Enabled:', recursionEnabled);
console.log('Recursion Only   :', demoRecursionOnly);

////////////////////////////////////////////////////////////////////////
// lil utilities
////////////////////////////////////////////////////////////////////////

// performance logging
const label = '[time]';
console.time(label);
const log = (
  ...args: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */
) => console.timeLog(label, ...args);

let rollupTransformationVerificationKey: string;
if (recursionEnabled) {
  // these need to be compiled before ZKKV
  log('compile ZkProgram(s)...');
  const { verificationKey } = await RollupTransformations.compile();
  rollupTransformationVerificationKey = verificationKey;
  log('...compile ZkProgram(s)');
}

if (proofsEnabled) {
  log('compile SmartContract...');
  await ZKKV.compile();
  log('...compile SmartContract');
}

// log a spacer on the console between transactions
const hr = () =>
  console.log(
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  );

// celebrate success!
const tada = () => {
  console.log();
  console.log('🚀🚀🚀 Works! 🚀🚀🚀');
  process.exit(0);
};

////////////////////////////////////////////////////////////////////////
// go!
////////////////////////////////////////////////////////////////////////

const Local = Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

const feePayer = Local.testAccounts[0].publicKey;
const feePayerKey = Local.testAccounts[0].privateKey;

const zkappKey = PrivateKey.random();
const zkappAddress = zkappKey.toPublicKey();

// Create 4 Stores with in-memory Merkle Maps
const storeMMs: Array<MerkleMap> = [];
const stores: Array<Store> = [];
for (let i = 0; i < 4; i++) {
  storeMMs[i] = new MerkleMap();
  stores[i] = new Store({
    identifier: Poseidon.hash(CircuitString.fromString(`store${i}`).toFields()),
    commitment: storeMMs[i].getRoot(),
  });
}

// Create a Store Manager Merkle Map
// then add 2 Stores initially
const storeManagerMerkleMap = new MerkleMap();
storeManagerMerkleMap.set(stores[0].getKey(), stores[0].getValue());
storeManagerMerkleMap.set(stores[1].getKey(), stores[1].getValue());

// set initial MM to confirm restoration from contract events later
const initialManagerMM = new MerkleMap();
initialManagerMM.set(stores[0].getKey(), stores[0].getValue());
initialManagerMM.set(stores[1].getKey(), stores[1].getValue());

// pending store events
const storePending = [] as Array<EventStorePending>;

// interface with the zkApp itself as a Store
// and conform its off-chain storage mechanics
const zkappStore = new Store({
  identifier: Poseidon.hash(zkappAddress.toFields()),
  commitment: storeManagerMerkleMap.getRoot(),
});
const initStoreIdentifier = zkappStore.getKey();
const initStoreCommitment = zkappStore.getValue();
console.log('init storeIdentifier :', initStoreIdentifier.toString());
console.log('init storeCommitment :', initStoreCommitment.toString());

////////////////////////////////////////////////////////////////////////
// deploy
////////////////////////////////////////////////////////////////////////
hr();
log('Deploying ZKKV...');
const zkapp = new ZKKV(zkappAddress);
const tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  zkapp.deploy({ zkappKey });

  // set initial storage identifier and root hash
  zkapp.storeIdentifier.set(initStoreIdentifier);
  zkapp.storeCommitment.set(initStoreCommitment);

  // notify off-chain storage
  zkapp.emitEvent('store:new', {
    ...eventStoreDefault,
    id: initStoreIdentifier,
    root1: initStoreCommitment,
  });
});
await tx.prove();
await tx.sign([feePayerKey]).send();
log('...Deploying ZKKV');

// count events processed to show them sequentually
let numEvents = 0;
numEvents = await processEvents(numEvents);

////////////////////////////////////////////////////////////////////////
// add Store to Manager
////////////////////////////////////////////////////////////////////////

// add new Store
hr();
log('addStore stores[2]...');
await addStore(stores[2], storeManagerMerkleMap);
log('...addStore stores[2]');
numEvents = await processEvents(numEvents);

// add another Store
hr();
log('addStore stores[3]...');
await addStore(stores[3], storeManagerMerkleMap);
log('...addStore stores[3]');
numEvents = await processEvents(numEvents);

// attempt to add an already added Store
if (!demoRecursionOnly) {
  hr();
  log('addStore already added; should fail...');
  try {
    await addStore(stores[1], storeManagerMerkleMap);
  } catch (
    err: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    console.log(err.message);
  }
  log('...addStore already added; should fail');
  numEvents = await processEvents(numEvents);
}

////////////////////////////////////////////////////////////////////////
// update Store
////////////////////////////////////////////////////////////////////////

// set (update) an added Store's value
if (!demoRecursionOnly) {
  hr();
  log('setStore stores[2]...');
  // add something to the store
  storeMMs[2].set(Field(100), Field(100));
  const store1 = stores[2].setCommitment(storeMMs[2].getRoot());
  await setStore(stores[2], store1, storeManagerMerkleMap);
  log('...setStore stores[2]');
  numEvents = await processEvents(numEvents);

  // attempt to set a store that has not been added
  hr();
  log('setStore not added; should fail...');
  try {
    const storeMM = new MerkleMap();
    const store0 = new Store({
      identifier: Poseidon.hash(CircuitString.fromString('!store').toFields()),
      commitment: storeMM.getRoot(),
    });
    // add something to the store
    storeMM.set(Field(100), Field(100));
    const store1 = store0.setCommitment(storeMM.getRoot());
    await setStore(store0, store1, storeManagerMerkleMap);
  } catch (
    err: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    console.log(err.message);
  }
  log('...setStore not added; should fail');
  numEvents = await processEvents(numEvents);
}

////////////////////////////////////////////////////////////////////////
// set Data in Store
////////////////////////////////////////////////////////////////////////
if (!demoRecursionOnly) {
  hr();
  log('setStoreData...');
  {
    const i = 2; // which store

    // new key:value pair within the store
    const key = Field(222);
    const value1 = Field(999);

    // use EMPTY for current value as storeData has not yet been added
    const value0 = EMPTY;

    // deep clone MerkleMap is difficult, so set/unset to preserve
    const prevValue = storeMMs[i].get(key);
    storeMMs[i].set(key, value1);
    const storeRoot = storeMMs[i].getRoot();
    storeMMs[i].set(key, prevValue);

    // create a new store from the current to represent the change
    const store1 = stores[i].setCommitment(storeRoot);

    const storeData0 = StoreData.init(stores[i], key, value0);
    const storeData1 = StoreData.init(store1, key, value1);

    await setStoreData(
      storeData0,
      storeData1,
      storeMMs[i],
      storeManagerMerkleMap
    );
  }
  log('...setStoreData');
  numEvents = await processEvents(numEvents);
}

if (!recursionEnabled) tada();

////////////////////////////////////////////////////////////////////////
// Concurrency
////////////////////////////////////////////////////////////////////////
hr();
log('Recursion is supr powr!');

////////////////////////////////////
// set Data in Store
////////////////////////////////////
hr();
log('setStoreData...');
{
  const i = 3; // which store

  // new key:value pair within the store
  const key = Field(222);
  const value1 = Field(999);

  // use EMPTY for current value as storeData has not yet been added
  const value0 = EMPTY;

  // deep clone MerkleMap is difficult, so set/unset to preserve
  const prevValue = storeMMs[i].get(key);
  storeMMs[i].set(key, value1);
  const storeRoot = storeMMs[i].getRoot();
  storeMMs[i].set(key, prevValue);

  // create a new store from the current to represent the change
  const store1 = stores[i].setCommitment(storeRoot);

  const storeData0 = StoreData.init(stores[i], key, value0);
  const storeData1 = StoreData.init(store1, key, value1);

  await setStoreData(
    storeData0,
    storeData1,
    storeMMs[i],
    storeManagerMerkleMap,
    recursionEnabled
  );
}
log('...setStoreData');
numEvents = await processEvents(numEvents);

// WIP: two pending events causes proof.verify in contract to fail
hr();
log('setStoreData...');
{
  const i = 2; // which store

  // new key:value pair within the store
  const key = Field(111);
  const value1 = Field(777);

  // use EMPTY for current value as storeData has not yet been added
  const value0 = EMPTY;

  // deep clone MerkleMap is difficult, so set/unset to preserve
  const prevValue = storeMMs[i].get(key);
  storeMMs[i].set(key, value1);
  const storeRoot = storeMMs[i].getRoot();
  storeMMs[i].set(key, prevValue);

  // create a new store from the current to represent the change
  const store1 = stores[i].setCommitment(storeRoot);

  const storeData0 = StoreData.init(stores[i], key, value0);
  const storeData1 = StoreData.init(store1, key, value1);

  await setStoreData(
    storeData0,
    storeData1,
    storeMMs[i],
    storeManagerMerkleMap,
    recursionEnabled
  );
}
log('...setStoreData');
numEvents = await processEvents(numEvents);

////////////////////////////////////
// commit pending transformations
////////////////////////////////////
hr();
log('commitPendingTransformations...');
{
  // generate recursive proof, submit it
  await commitPendingTransformations(
    storePending,
    storeManagerMerkleMap,
    storeMMs
  );
}
log('...commitPendingTransformations');
await processEvents(numEvents, false);

hr();
tada();

////////////////////////////////////////////////////////////////////////
// helper functions
////////////////////////////////////////////////////////////////////////

/**
 * Process events emitted by the zkApp SmartContract.
 *
 * Use offset param and returned counter output
 * to processEvents sequentually after each txn.
 */
async function processEvents(offset = 0, checkStorage = true) {
  let counter = 0;

  const events = await zkapp.fetchEvents();

  log('Process Events...');
  console.log('MM 1:', storeManagerMerkleMap.getRoot().toString());
  console.log('MM 2:', initialManagerMM.getRoot().toString());

  for (const event of events) {
    // skip already processed events
    if (counter++ < offset) continue;

    // TODO: a better way to access event data?
    const js = JSON.parse(JSON.stringify(event.event.data));
    console.log(`Event: ${event.type}`, js);

    switch (event.type) {
      case 'store:new':
        {
          // off-chain storage should create the record
        }
        break;

      case 'store:set':
        {
          // off-chain storage should set the record

          const ev = EventStore.fromJSON(js);

          // add to the MM
          if (ev.root0.equals(initialManagerMM.getRoot()).toBoolean()) {
            initialManagerMM.set(ev.key, ev.value);
            const s = ev.root1.equals(initialManagerMM.getRoot()).toBoolean();
            console.log(s ? '✅' : '❌', 'MerkleMap set from event');
          }
        }
        break;

      case 'store:pending':
        {
          // off-chain storage should create the record as pending

          storePending.push(EventStorePending.fromJSON(js));
        }
        break;

      case 'store:commit':
        {
          // off-chain storage should update pending records
        }
        break;

      default:
        console.log(`Event: ${event.type}`, js);
        break;
    }
  }

  console.log('MM 1:', storeManagerMerkleMap.getRoot().toString());
  console.log('MM 2:', initialManagerMM.getRoot().toString());

  // check to confirm sync of MMs
  if (checkStorage) {
    const witness1 = storeManagerMerkleMap.getWitness(stores[3].getKey());
    const witness2 = initialManagerMM.getWitness(stores[3].getKey());
    witness1.assertEquals(witness2);
  }

  log('...Process Events');

  return counter;
}

async function addStore(store: Store, managerMM: MerkleMap) {
  // prove the store IS NOT in the Manager MT
  const witness = managerMM.getWitness(store.getKey());

  // add store as data of the zkapp store
  const storeData = StoreData.init(
    zkappStore,
    store.getKey(),
    store.getValue()
  );

  log('  tx: prove() sign() send()...');
  const tx = await Mina.transaction(feePayer, () => {
    zkapp.addStore(storeData, witness);
  });
  await tx.prove();
  await tx.sign([feePayerKey]).send();
  log('  ...tx: prove() sign() send()');

  // if tx was successful, we can update our off-chain storage
  // in production, the indexer updates off-chain storage
  managerMM.set(store.getKey(), store.getValue());
  log('  managerMM.getRoot()         :', managerMM.getRoot().toString());
  log(
    '  zkapp.storeCommitment.get() :',
    zkapp.storeCommitment.get().toString()
  );
  zkapp.storeCommitment.get().assertEquals(managerMM.getRoot());
}

async function setStore(store0: Store, store1: Store, managerMM: MerkleMap) {
  // prove the store IS in the Manager MT
  const witness = managerMM.getWitness(store0.getKey());

  // update store as data of the zkapp store
  const storeData0 = StoreData.init(
    zkappStore,
    store0.getKey(),
    store0.getValue()
  );
  const storeData1 = StoreData.init(
    zkappStore,
    store1.getKey(),
    store1.getValue()
  );

  log('  tx: prove() sign() send()...');
  const tx = await Mina.transaction(feePayer, () => {
    zkapp.setStore(storeData0, storeData1, witness);
  });
  await tx.prove();
  await tx.sign([feePayerKey]).send();
  log('  ...tx: prove() sign() send()');

  // if tx was successful, we can update our off-chain storage
  // in production, the indexer updates off-chain storage
  managerMM.set(store1.getKey(), store1.getValue());
  log('  managerMM.getRoot()         :', managerMM.getRoot().toString());
  log(
    '  zkapp.storeCommitment.get() :',
    zkapp.storeCommitment.get().toString()
  );
  zkapp.storeCommitment.get().assertEquals(managerMM.getRoot());
}

async function setStoreData(
  data0: StoreData,
  data1: StoreData,
  storeMM: MerkleMap,
  managerMM: MerkleMap,
  concurrent = false
) {
  // get witness for store within the manager
  const witnessManager = managerMM.getWitness(data1.store.getKey());

  // get witness for data within the store
  const witnessStore = storeMM.getWitness(data1.getKey());

  log('  tx: prove() sign() send()...');
  const tx = await Mina.transaction(feePayer, () => {
    concurrent
      ? zkapp.setStoreDataConcurrent(data0, data1, witnessStore, witnessManager)
      : zkapp.setStoreData(data0, data1, witnessStore, witnessManager);
  });
  await tx.prove();
  await tx.sign([feePayerKey]).send();
  log('  ...tx: prove() sign() send()');

  if (!concurrent) {
    // if tx was successful, we can update our off-chain storage
    // in production, the indexer updates off-chain storage
    storeMM.set(data1.getKey(), data1.getValue());
    managerMM.set(data1.store.getKey(), storeMM.getRoot());
    log('  managerMM getRoot()   :', managerMM.getRoot().toString());
    log('  zkapp storeCommitment :', zkapp.storeCommitment.get().toString());
    zkapp.storeCommitment.get().assertEquals(managerMM.getRoot());
  }
}

async function commitPendingTransformations(
  pendingEvents: Array<EventStorePending>,
  managerMM: MerkleMap,
  storesMM: Array<MerkleMap>
) {
  console.log('pending events:', JSON.stringify(pendingEvents, null, 2));

  // lil help...
  const whichStore = (identifier: Field) => {
    for (let i = 0; i < 4; i++)
      if (stores[i].identifier.equals(identifier).toBoolean()) return i;
    return -1;
  };

  hr();
  log('computing transitions...');
  const rollupStepInfo: any[] = [];
  pendingEvents.forEach(({ data0, data1 }) => {
    const s = whichStore(data1.store.identifier);
    log('  which store:', s);

    // DO NOT get witness for data within the store
    // this was already verified when a transformation was submitted to the zkApp
    // now only need to prove the manager's merkle tree transformation
    // X: const witnessStore = storesMM[s].getWitness(data1.getKey());

    // get witness for store within the manager
    const witnessManager = managerMM.getWitness(data1.store.getKey());

    const root0 = managerMM.getRoot();
    const value0 = storesMM[s].getRoot();

    storesMM[s].set(data1.getKey(), data1.getValue());
    managerMM.set(data1.store.getKey(), storesMM[s].getRoot());

    const root1 = managerMM.getRoot();
    const value1 = storesMM[s].getRoot();
    const key = data0.store.getKey();

    console.log('  root0  =', root0.toString());
    console.log('  root1  =', root1.toString());
    console.log('  key    =', key.toString());
    console.log('  value0 =', value0.toString());
    console.log('  value1 =', value1.toString());

    rollupStepInfo.push({
      root0,
      root1,
      key,
      value0,
      value1,
      witnessManager,
    });
  });
  log('...computing transitions');

  hr();
  log('making first set of proofs...');
  const rollupProofs: Proof<RollupState, void>[] = [];
  for (const {
    root0,
    root1,
    key,
    value0,
    value1,
    witnessManager,
  } of rollupStepInfo) {
    const rollup = RollupState.createOneStep(
      root0,
      root1,
      key,
      value0,
      value1,
      witnessManager
    );
    const proof = await RollupTransformations.oneStep(
      rollup,
      root0,
      root1,
      key,
      value0,
      value1,
      witnessManager
    );
    rollupProofs.push(proof);
  }
  log('...making first set of proofs');

  hr();
  log('merging proofs...');
  let proof: Proof<RollupState, void> = rollupProofs[0];
  for (let i = 1; i < rollupProofs.length; i++) {
    const rollup = RollupState.createMerged(
      proof.publicInput,
      rollupProofs[i].publicInput
    );
    const mergedProof = await RollupTransformations.merge(
      rollup,
      proof,
      rollupProofs[i]
    );
    proof = mergedProof;
  }
  log('...merging proofs');

  hr();
  log('verifying rollup...');
  console.log('  proof root0:', proof.publicInput.root0.toString());
  console.log('  proof root1:', proof.publicInput.root1.toString());
  const ok = await verify(proof.toJSON(), rollupTransformationVerificationKey);
  console.log('ok', ok);
  log('...verifying rollup');

  hr();
  log('  tx: prove() sign() send()...');
  const tx = await Mina.transaction(feePayer, () => {
    zkapp.commitPendingTransformations(proof);
  });
  await tx.prove();
  await tx.sign([feePayerKey]).send();
  log('  ...tx: prove() sign() send()');
}
