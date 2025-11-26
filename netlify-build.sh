#!/bin/bash
set -e

echo "🔧 Preparing package.json for Netlify build..."

# Backup original package.json
cp package.json package.json.backup

# Remove workspaces field from package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.workspaces;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Removed workspaces from package.json');
"

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🏗️  Building frontend..."
npx vite build

echo "✅ Build complete!"
