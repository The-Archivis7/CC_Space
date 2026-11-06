/**
 * Ambient declarations for modules lacking bundled types in the pinned
 * three.js 0.128 type set (OutputPass landed around three r154).
 */
declare module 'three/examples/jsm/postprocessing/OutputPass.js' {
  import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
  export class OutputPass extends Pass {
    constructor();
  }
}
