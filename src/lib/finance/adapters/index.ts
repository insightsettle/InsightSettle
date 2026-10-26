import { afsAdapter } from './afs';
import { geideaAdapter } from './geidea';
import { liteAdapter } from './lite';
import { simulatedAdapter } from './simulated';
import { tapAdapter } from './tap';
import { stubAdapter, type AdapterDefinition } from './types';
/** Adding a provider = add one adapter file here + create its row from the console. */
export const ADAPTERS: Record<string, AdapterDefinition> = { simulated: simulatedAdapter, lite: liteAdapter, tap: tapAdapter, geidea: geideaAdapter, afs: afsAdapter, generic: stubAdapter('generic') };
export const adapterFor = (adapter: string) => ADAPTERS[adapter] ?? ADAPTERS['generic']!;
export * from './types';
