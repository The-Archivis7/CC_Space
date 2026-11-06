/**
 * Build script: bundles each game's TypeScript entry into a self-contained
 * IIFE bundle in dist/. Each page keeps the exact three.js version it used
 * before the refactor:
 *   - space / rogue / mech: three@0.128  (npm package "three")
 *   - wizard:               three@0.160  (npm package "three160")
 */
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Resolves 'three' and 'three/examples/jsm/*' to a specific three version on disk. */
function threeAliasPlugin(pkgName) {
  return {
    name: `three-alias-${pkgName}`,
    setup(build) {
      const pkgDir = path.join(root, 'node_modules', pkgName);
      build.onResolve({ filter: /^three$/ }, () => ({
        path: path.join(pkgDir, 'build', 'three.module.js'),
      }));
      build.onResolve({ filter: /^three\/examples\/jsm\// }, (args) => ({
        path: path.join(pkgDir, 'examples', 'jsm', args.path.slice('three/examples/jsm/'.length)),
      }));
      // Package-internal imports of jsm files ('../..', './CopyShader.js', ...)
      // resolve relative to the file itself, which esbuild does by default.
    },
  };
}

/** Treat bare 'three' (and its js examples) as an absolute disk path under a pinned version. */
const shared = (pkgName) => ({
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false,
  sourcemap: false,
  logLevel: 'info',
  plugins: [threeAliasPlugin(pkgName)],
  define: { 'process.env.NODE_ENV': '"production"' },
});

const pages = [
  { entry: 'src/space/main.ts', out: 'dist/space.js', pkg: 'three' },
  { entry: 'src/rogue/main.ts', out: 'dist/rogue.js', pkg: 'three' },
  { entry: 'src/mech/main.ts', out: 'dist/mech.js', pkg: 'three' },
  { entry: 'src/wizard/main.ts', out: 'dist/wizard.js', pkg: 'three160' },
];

await Promise.all(
  pages.map((page) =>
    esbuild.build({
      ...shared(page.pkg),
      entryPoints: [path.join(root, page.entry)],
      outfile: path.join(root, page.out),
    })
  )
);

console.log('All bundles written to dist/.');
