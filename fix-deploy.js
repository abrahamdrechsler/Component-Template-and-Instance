#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Copy files from dist/public to dist (root level)
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory ${src} does not exist`);
    return;
  }
  
  // Create destination if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

console.log('Fixing deployment structure...');
console.log('Copying files from dist/public to dist...');

try {
  copyDir('./dist/public', './dist');
  console.log('✅ Files copied successfully! Deployment structure fixed.');
  console.log('Your app can now be deployed with publicDir = "dist"');
} catch (error) {
  console.error('❌ Error fixing deployment structure:', error.message);
  process.exit(1);
}