import Head from 'next/head';
import Image from 'next/image';
import { useEffect } from 'react';
import GradientBG from '../components/GradientBG.js';
import styles from '../styles/Home.module.css';

export default function Home() {
  useEffect(() => {
    (async () => {
      const { createTRPCClient } = await import('@zk-kv/trpc-client');
      const trpc = createTRPCClient(process.env.NEXT_PUBLIC_API_URL);

      const apiStatus = await trpc.health.check.query();
      console.log('apiStatus', apiStatus);

      // get system info, including zkApp address(es) from the API
      const meta = await trpc.meta.query();
      console.log('meta', meta);

      const { Mina, PublicKey } = await import('snarkyjs');
      const { Add } = await import('@zk-kv/contracts');

      // configure the ZKAPP_ADDRESS in .env
      const zkAppAddress = meta.address.Add;

      // This should be removed once the zkAppAddress is updated.
      if (!zkAppAddress) {
        console.error(
          'The following error is caused because the zkAppAddress has an empty string as the public key. Update the ZKAPP_ADDRESS in your .env file with the public key for your zkApp account, or try this address for an example "Add" smart contract that we deployed to Berkeley Testnet: B62qkwohsqTBPsvhYE8cPZSpzJMgoKn4i1LQRuBAtVXWpaT4dgH6WoA'
        );
      }
      //const zkApp = new Add(PublicKey.fromBase58(zkAppAddress))
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Mina ZK:KV zkApp UI</title>
        <meta name="description" content="ZK:KV - built with SnarkyJS" />
        <link rel="icon" href="/assets/favicon.ico" />
      </Head>
      <GradientBG>
        <main className={styles.main}>
          <div className={styles.center}>
            <a
              href="https://minaprotocol.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className={styles.logo}
                src="/assets/HeroMinaLogo.svg"
                alt="Mina Logo"
                width="191"
                height="174"
                priority
              />
            </a>
            <p className={styles.tagline}>
              built with
              <code className={styles.code}> SnarkyJS</code>
            </p>
          </div>
          <p className={styles.start}>
            Get started by editing
            <code className={styles.code}> src/pages/zkkv.tsx</code>
          </p>
        </main>
      </GradientBG>
    </>
  );
}
