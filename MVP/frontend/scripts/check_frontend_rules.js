/**
 * MVP/frontend/scripts/check_frontend_rules.js
 * Static rule enforcer for React frontend per dev_rules.md:
 * 1. Banned axios / fetch in src/components/ and src/views/ (Presentation layer)
 * 2. Banned new Audio() outside Singleton AudioPlayerContext
 * 3. Banned navigator.geolocation.getCurrentPosition() (Must use watchPosition)
 * 4. Banned location.reload() (Must use reactive state updates)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, '..');
const srcDir = path.resolve(projectDir, 'src');
const violations = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      validateFile(fullPath);
    }
  }
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(projectDir, filePath).replace(/\\/g, '/');

  const isPresentationLayer = relPath.startsWith('src/components/') || relPath.startsWith('src/views/');
  const isAudioSingleton = /AudioPlayerContext|audioService|audioSingleton/i.test(relPath);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // 1. Presentation Layer Network Ban (axios / fetch)
    if (isPresentationLayer) {
      if (/from\s+['"]axios['"]|require\(['"]axios['"]\)/.test(line) || /\baxios\s*[.(]/.test(line)) {
        violations.push(`${relPath}:${lineNum} -> [PRESENTATION LEAK] Banned direct 'axios' in components/views. Delegate to src/api/ or custom hooks.`);
      }
      if (/\bfetch\s*\(/.test(line)) {
        violations.push(`${relPath}:${lineNum} -> [PRESENTATION LEAK] Banned direct 'fetch()' in components/views. Delegate to src/api/ or custom hooks.`);
      }
    }

    // 2. Audio Singleton Enforcement (Banned ad-hoc new Audio())
    if (!isAudioSingleton && /new\s+Audio\s*\(/.test(line)) {
      violations.push(`${relPath}:${lineNum} -> [AUDIO LEAK] Banned 'new Audio()'. Use Singleton AudioPlayerContext to avoid audio overlap.`);
    }

    // 3. Geolocation Rule (Banned getCurrentPosition())
    if (/getCurrentPosition\s*\(/.test(line)) {
      violations.push(`${relPath}:${lineNum} -> [GPS LEAK] Banned 'getCurrentPosition()'. Must use 'watchPosition()' with cleanup to ensure real-time walking geofence.`);
    }

    // 4. State Management Rule (Banned location.reload())
    if (/location\.reload\s*\(/.test(line)) {
      violations.push(`${relPath}:${lineNum} -> [STATE LEAK] Banned 'location.reload()'. Update UI reactively using React state.`);
    }
  });
}

scanDir(srcDir);

if (violations.length > 0) {
  console.error('❌ DETECTED FRONTEND CODING STANDARD VIOLATIONS:');
  violations.forEach((v) => console.error('  ' + v));
  process.exit(1);
} else {
  console.log('✅ Frontend Domain & Layering Rules check passed: 0 violations.');
  process.exit(0);
}
