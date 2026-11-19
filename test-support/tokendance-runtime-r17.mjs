// Gateway and compiled Mini tests run without a TS loader. Reuse Core's installed
// loader only for the real in-memory runtime, preserving each package's command.
import {createRequire} from 'node:module';
const require = createRequire(new URL('../apps/paperbanana-api/package.json', import.meta.url));
const {tsImport} = require('tsx/esm/api');
export async function tokenDanceTestRuntime(mode) {
  const {createRefineRuntime} = await tsImport('./refine-runtime.mjs', import.meta.url);
  return createRefineRuntime({startServer:false,tokenDanceCatalogMode:mode});
}
