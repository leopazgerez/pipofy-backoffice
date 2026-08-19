import assert from 'node:assert/strict';
import { parseEnv, buildEnvironment, ngVarsFrom } from './set-env.mjs';

const full = `
# comentario
NG_API_BASE_URL=/api
NG_REALTIME_BASE_URL=/api/stream
NG_STORAGE_BASE_PATH=/uploads
NG_MERCADOPAGO_PUBLIC_KEY="TEST-abc"
`;

const vars = parseEnv(full);
assert.equal(vars['NG_MERCADOPAGO_PUBLIC_KEY'], 'TEST-abc', 'debe quitar comillas');
assert.equal(vars['NG_API_BASE_URL'], '/api');

const out = buildEnvironment('production', vars);
assert.match(out, /production: true/);
assert.match(out, /satisfies Environment/);
assert.match(out, /no editar a mano/);

const dev = buildEnvironment('development', vars);
assert.match(dev, /production: false/);

// falta clave requerida -> falla
assert.throws(() => buildEnvironment('development', { NG_API_BASE_URL: '/api' }), /Faltan claves/);

// clave con pinta de secreto -> aborta
assert.throws(
  () => buildEnvironment('development', { ...vars, MP_ACCESS_TOKEN: 'x' }),
  /secreto/i,
);

// Fallback al entorno (Render/CI, donde .env.production no existe): SÓLO entran las NG_*.
// Sin este filtro, process.env metería credenciales de la máquina de build en el bundle.
const fromEnv = ngVarsFrom({
  NG_API_BASE_URL: 'https://pipofy-api.onrender.com/api',
  AWS_SECRET_ACCESS_KEY: 'no-debe-pasar',
  PATH: '/usr/bin',
});
assert.deepEqual(Object.keys(fromEnv), ['NG_API_BASE_URL']);

console.log('✓ set-env self-check OK');
