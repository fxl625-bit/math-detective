#!/usr/bin/env node

/**
 * Post-build script: strip @layer wrappers from CSS output
 * for compatibility with browsers that don't support @layer
 * (e.g. older Android System WebView).
 *
 * Run: node scripts/postbuild-css.js
 */

const fs = require('fs');
const path = require('path');

const staticDir = path.join(__dirname, '..', '.next', 'static');

function processCssFile(filePath) {
  let css = fs.readFileSync(filePath, 'utf-8');
  const originalSize = css.length;

  // Strategy: find each @layer <name> { ... } block and unwrap it.
  // We need to track brace depth because @layer blocks can be nested
  // inside @media, @supports, etc.

  let result = '';
  let i = 0;

  while (i < css.length) {
    // Look for @layer
    const layerIdx = css.indexOf('@layer', i);
    if (layerIdx === -1) {
      result += css.slice(i);
      break;
    }

    // Copy everything before @layer
    result += css.slice(i, layerIdx);
    i = layerIdx;

    // Skip "@layer" and the layer name
    let j = layerIdx + 6; // length of "@layer"
    // Skip whitespace
    while (j < css.length && (css[j] === ' ' || css[j] === '\t' || css[j] === '\n')) j++;
    // Skip layer name (identifier, may include -)
    while (j < css.length && /[a-zA-Z0-9_-]/.test(css[j])) j++;
    // Skip whitespace
    while (j < css.length && (css[j] === ' ' || css[j] === '\t' || css[j] === '\n')) j++;

    if (j >= css.length || css[j] !== '{') {
      // Not a block @layer (e.g. @layer name;), just copy
      result += css.slice(layerIdx, j);
      i = j;
      continue;
    }

    // Find the matching closing brace
    const openIdx = j;
    let depth = 1;
    j = openIdx + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const closeIdx = j - 1;

    // Extract inner content (skip the outer braces)
    const inner = css.slice(openIdx + 1, closeIdx).trim();
    if (inner.length > 0) {
      result += inner;
    }

    i = closeIdx + 1;
  }

  if (result.length !== originalSize) {
    fs.writeFileSync(filePath, result, 'utf-8');
    console.log(`  Processed: ${path.basename(filePath)} (${originalSize} → ${result.length} bytes)`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith('.css')) {
      processCssFile(fullPath);
    }
  }
}

console.log('[postbuild-css] Stripping @layer wrappers for browser compatibility...');
walk(staticDir);
console.log('[postbuild-css] Done.');
