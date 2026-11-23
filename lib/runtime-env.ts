import { env } from 'cloudflare:workers';

type RuntimeEnvironment = Record<string, string | undefined> & {
  HYPERDRIVE?: { connectionString: string };
};

const workerEnv = env as RuntimeEnvironment;

export function runtimeEnv(name: string) {
  return workerEnv[name] ?? process.env[name];
}

export function databaseUrl() {
  return workerEnv.HYPERDRIVE?.connectionString ?? runtimeEnv('DATABASE_URL');
}
