const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendDir = path.resolve(__dirname, '..');
const glbPath = path.join(frontendDir, 'assets', '3d', 'hand-posable.glb');
const outTsPath = path.join(frontendDir, 'assets', '3d', 'handModelBundle.ts');

if (!fs.existsSync(glbPath)) {
  console.error('GLB model not found at:', glbPath);
  process.exit(1);
}

// 1. Read GLB and convert to base64
console.log('Reading GLB from:', glbPath);
const glbBuf = fs.readFileSync(glbPath);
const glbBase64 = glbBuf.toString('base64');
console.log('GLB base64 length:', glbBase64.length);

// 2. Create entry file for esbuild
const entryCode = `
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

window.THREE = THREE;
window.OrbitControls = OrbitControls;
window.GLTFLoader = GLTFLoader;
`;

const tempEntry = path.join(frontendDir, 'temp_3d_entry.js');
const tempBundle = path.join(frontendDir, 'temp_3d_bundle.js');
fs.writeFileSync(tempEntry, entryCode, 'utf8');

console.log('Bundling Three.js + OrbitControls + GLTFLoader with esbuild...');
execSync(`npx esbuild "${tempEntry}" --bundle --minify --format=iife --outfile="${tempBundle}"`, {
  cwd: frontendDir,
  stdio: 'inherit',
});

const bundleJs = fs.readFileSync(tempBundle, 'utf8');
console.log('Three bundle length:', bundleJs.length);

// Clean up temp files
fs.unlinkSync(tempEntry);
fs.unlinkSync(tempBundle);

// 3. Write out handModelBundle.ts
const tsContent = `// Auto-generated 3D hand model and Three.js viewer bundle
// Model: hand-posable.glb (506KB glTF 2.0 skinned hand)
export const HAND_MODEL_GLB_BASE64: string = ${JSON.stringify(glbBase64)};
export const THREE_VIEWER_BUNDLE: string = ${JSON.stringify(bundleJs)};
`;

fs.writeFileSync(outTsPath, tsContent, 'utf8');
console.log('Generated handModelBundle.ts at:', outTsPath, 'size:', fs.statSync(outTsPath).size);
