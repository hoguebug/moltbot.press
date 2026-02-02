import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Multbot Press</title>
        <meta name="description" content="Multi-language bot platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://multbot.press">Multbot Press!</a>
        </h1>

        <p className={styles.description}>
          Multi-language bot platform for the future
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>AI Powered</h2>
            <p>Advanced artificial intelligence for natural conversations</p>
          </div>

          <div className={styles.card}>
            <h2>Multilingual</h2>
            <p>Support for 50+ languages with real-time translation</p>
          </div>

          <div className={styles.card}>
            <h2>Customizable</h2>
            <p>Tailor bots to your specific needs and industry</p>
          </div>

          <div className={styles.card}>
            <h2>Scalable</h2>
            <p>Handle millions of conversations seamlessly</p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <a href="https://multbot.press" target="_blank" rel="noopener noreferrer">
          Powered by Multbot Press
        </a>
      </footer>
    </div>
  );
}