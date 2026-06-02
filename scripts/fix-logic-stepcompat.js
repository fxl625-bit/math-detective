/**
 * Batch fix: Remove 'find_numbers' from stepCompatibility for logic_reasoning questions.
 * Reads TS files, identifies logic_reasoning Q blocks, edits stepCompatibility.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'questions');
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.ts'));

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Strategy: find each question block by matching `id:` ... `stepCompatibility:`
  // We need to identify questions with domain: 'logic_reasoning'
  // The pattern: find `domain: 'logic_reasoning',` then in the same question block,
  // find `stepCompatibility:` and remove `'find_numbers', ` or `'find_numbers'`

  // Simpler approach: process the file in blocks
  // Split by `{` and track depth to find question objects
  // But that's fragile. Instead, use a targeted regex approach.

  // Find all stepCompatibility arrays that contain 'find_numbers'
  // and are preceded by domain: 'logic_reasoning' within the same question object

  // Step 1: Find all question blocks
  // Each question block starts with `{` after a variable/export declaration
  // and ends with `},` followed by a new question or export end

  const blocks = splitIntoQuestionBlocks(content);
  let newContent = content;

  for (const block of blocks) {
    if (block.domain === 'logic_reasoning' && block.stepCompat) {
      const oldCompat = block.stepCompat;
      // Remove 'find_numbers' entries
      const newCompat = oldCompat
        .replace(/'find_numbers',\s*/g, '')
        .replace(/,\s*'find_numbers'/g, '')
        .replace(/'find_numbers'/g, '')
        .replace(/\[\s*,?\s*\]/g, '[]') // clean up empty arrays
        .replace(/\[\s*,\s*/g, '[')     // clean up leading commas
        .replace(/,\s*,/g, ',');        // clean up double commas

      if (newCompat !== oldCompat) {
        newContent = newContent.replace(oldCompat, newCompat);
        totalFixed++;
        console.log(`  [${block.id}] ${file}: 'find_numbers' removed from stepCompatibility`);
      }
    }
  }

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Updated: ${file}`);
  }
}

console.log(`\n📊 Total questions fixed: ${totalFixed}`);

/**
 * Split TS file content into question block descriptors.
 */
function splitIntoQuestionBlocks(content) {
  const blocks = [];
  // Handle both multi-line and compact (one-line) question formats
  const questionRegex = /\{\s*id:\s*'([^']+)'[\s\S]*?domain:\s*'([^']+)'[\s\S]*?stepCompatibility:\s*(\[[^\]]*\])/g;
  let match;
  while ((match = questionRegex.exec(content)) !== null) {
    blocks.push({
      id: match[1],
      domain: match[2],
      stepCompat: match[3],
    });
  }
  return blocks;
}
