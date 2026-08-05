import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED = [
  'NG_API_BASE_URL',
  'NG_REALTIME_BASE_URL',
  'NG_STORAGE_BASE_PATH',
  'NG_MERCADOPAGO_PUBLIC_KEY',
];
const SECRET_RE = /_(SECRET|TOKEN)$|ACCESS_TOKEN|PASSWORD|PRIVATE/i;

// production regenera el archivo base que reemplazan los otros configs
const OUT = {
  development: 'environment.development.ts',
  staging: 'environment.staging.ts',
  production: 'environment.ts',
};

export function parseEnv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function buildEnvironment(env, vars) {
  const secret = Object.keys(vars).find((k) => SECRET_RE.test(k));
  if (secret) {
    throw new Error(
      `Clave "${secret}" parece un secreto. Los secretos van en el .env del backend, NO en el bundle del front.`,
    );
  }
  const missing = REQUIRED.filter((k) => !vars[k]);
  if (missing.length) {
    throw new Error(`Faltan claves en .env.${env}: ${missing.join(', ')}`);
  }
  const fields = {
    production: env === 'production',
    apiBaseUrl: vars['NG_API_BASE_URL'],
    realtimeBaseUrl: vars['NG_REALTIME_BASE_URL'],
    storageBasePath: vars['NG_STORAGE_BASE_PATH'],
    mercadopagoPublicKey: vars['NG_MERCADOPAGO_PUBLIC_KEY'],
  };
  const body = Object.entries(fields)
    .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : v},`)
    .join('\n');
  return (
    `// GENERADO por set-env.mjs — no editar a mano.\n` +
    `import type { Environment } from './environment.model';\n\n` +
    `export const environment = {\n${body}\n} satisfies Environment;\n`
  );
}

// CLI: solo corre si se pasa un ambiente (el test importa sin argv[2])
const env = process.argv[2];
if (env) {
  if (!OUT[env]) {
    console.error(`Ambiente inválido: ${env}. Usá development|staging|production.`);
    process.exit(1);
  }
  const envPath = resolve(process.cwd(), `.env.${env}`);
  let text;
  try {
    text = readFileSync(envPath, 'utf8');
  } catch {
    console.error(`No existe ${envPath}. Copiá .env.example → .env.${env}`);
    process.exit(1);
  }
  try {
    const content = buildEnvironment(env, parseEnv(text));
    writeFileSync(resolve(process.cwd(), `src/environments/${OUT[env]}`), content);
    console.log(`✓ Generado src/environments/${OUT[env]} desde .env.${env}`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
