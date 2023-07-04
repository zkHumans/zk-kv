import { PrivateKey } from 'snarkyjs';

const privateKey = PrivateKey.random();
const publicKey = privateKey.toPublicKey();

const key = {
  privateKey: privateKey.toBase58(),
  publicKey: publicKey.toBase58(),
};

console.log(key);
console.log();
console.log(
  `Request funds at https://faucet.minaprotocol.com/?address=${publicKey.toBase58()}`
);
