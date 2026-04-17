/**
 * Package Compass as a portable folder using Next.js standalone output.
 * Result: ~50-80MB folder, just needs Node.js to run.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');
const OUT = path.join(ROOT, 'dist-portable', 'AccSense-Intelligence-v2');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git') continue;
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Packaging AccSense Intelligence (standalone)...\n');

// Check standalone exists
if (!fs.existsSync(STANDALONE)) {
  console.error('❌ Standalone build not found. Run "next build" with output: "standalone" first.');
  process.exit(1);
}

// Clean
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// Copy standalone (includes server.js + minimal node_modules)
console.log('  Copying standalone server...');
copyDir(STANDALONE, OUT);

// Copy static assets (.next/static → .next/static)
console.log('  Copying static assets...');
copyDir(path.join(ROOT, '.next', 'static'), path.join(OUT, '.next', 'static'));

// Copy public folder
console.log('  Copying public assets...');
copyDir(path.join(ROOT, 'public'), path.join(OUT, 'public'));

// Copy icon
const iconPath = path.join(ROOT, 'electron', 'icon.png');
if (fs.existsSync(iconPath)) fs.copyFileSync(iconPath, path.join(OUT, 'icon.png'));

// Create start.bat (Windows) — with cool branding
fs.writeFileSync(path.join(OUT, 'Start AccSense.bat'), `@echo off
title AccSense Intelligence
color 0D
echo.
echo   [95m╔══════════════════════════════════════════════════╗[0m
echo   [95m║[0m                                                  [95m║[0m
echo   [95m║[0m    [97m◈  AccSense Intelligence Platform[0m             [95m║[0m
echo   [95m║[0m       [90mPowered by Accenture Compass[0m              [95m║[0m
echo   [95m║[0m                                                  [95m║[0m
echo   [95m╚══════════════════════════════════════════════════╝[0m
echo.
echo   [97mStarting server...[0m
echo   [90mThe browser will open automatically.[0m
echo   [90mKeep this window open while using the app.[0m
echo.

cd /d "%~dp0"

REM Wait a moment then open browser
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3456/explore/united-states/intelligence"

REM Start the server
node server.js

echo.
echo   [90mServer stopped. Press any key to close.[0m
pause >nul
`, 'utf8');

// Create start.sh (macOS/Linux)
fs.writeFileSync(path.join(OUT, 'start.sh'), `#!/bin/bash
echo ""
echo "  ◈  AccSense Intelligence Platform"
echo "     Powered by Accenture Compass"
echo ""
echo "  Starting server at http://localhost:3456"
echo ""
cd "$(dirname "$0")"
(sleep 3 && open "http://localhost:3456/explore/united-states/intelligence" 2>/dev/null || xdg-open "http://localhost:3456/explore/united-states/intelligence" 2>/dev/null) &
PORT=3456 node server.js
`);

// Patch server.js to use port 3456
const serverPath = path.join(OUT, 'server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');
if (!serverCode.includes('3456')) {
  // Add port override at the top
  serverCode = serverCode.replace(
    /const port\s*=\s*.*?;/,
    'const port = parseInt(process.env.PORT, 10) || 3456;'
  );
  // If that didn't match, try another pattern
  if (!serverCode.includes('3456')) {
    serverCode = `process.env.PORT = process.env.PORT || '3456';\n` + serverCode;
  }
  fs.writeFileSync(serverPath, serverCode);
}

// Create README
fs.writeFileSync(path.join(OUT, 'README.txt'), `
  AccSense Intelligence — Accenture Compass
  ==========================================

  REQUIREMENTS:
    Node.js 18+ (https://nodejs.org)

  HOW TO RUN:
    Windows:  Double-click "Start AccSense.bat"
    macOS:    chmod +x start.sh && ./start.sh

  Opens at: http://localhost:3456

  NOTE: Robin AI requires Claude CLI. All other
  features work without external dependencies.
`);

// Calculate size
function getTotalSize(dir) {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) total += getTotalSize(p);
      else total += fs.statSync(p).size;
    }
  } catch { /* */ }
  return total;
}

const sizeMB = (getTotalSize(OUT) / 1024 / 1024).toFixed(0);
console.log(`\n✅ Package created!`);
console.log(`   📁 dist-portable/AccSense-Intelligence/`);
console.log(`   📊 Size: ~${sizeMB} MB`);
console.log(`\n   → Zip the folder and send to your colleague.`);
console.log(`   → They need Node.js installed.`);
console.log(`   → Double-click "Start AccSense.bat" to run.\n`);
