import fs from 'node:fs';
import path from 'node:path';
import { allQuestions, transferCatalog } from '@/data/questions';
import { buildLegacyTransfers } from '@/data/questions/transfers/legacy';
import { buildProgressionTransfers } from '@/data/questions/transfers/progression';
import { auditTransferExpansion } from '@/tests/content/transferOracle';

const sources = allQuestions.filter(question => /^G[1-6]$/.test(question.gradeBand));
const proposed = [...buildProgressionTransfers(sources).entries, ...buildLegacyTransfers(sources).entries];
const report = {
  ...auditTransferExpansion(sources, proposed, transferCatalog.gaps),
  registeredCount: transferCatalog.entries.length,
  registryErrors: transferCatalog.validationErrors,
};
report.passed = report.passed && report.registryErrors.length === 0;
const outputArg = process.argv.indexOf('--output');
if (outputArg !== -1) {
  const output = path.resolve(process.argv[outputArg + 1] || '');
  const workspace = path.resolve(process.cwd());
  if (!output.toLowerCase().startsWith(`${workspace.toLowerCase()}${path.sep}`)) throw new Error('audit output must remain in the project workspace');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
}
// Keep routine terminal output compact while the saved audit retains all 625 rows.
console.log(JSON.stringify(outputArg === -1 ? report : { ...report, coverageRows: `${report.coverageRows.length} rows saved in the output JSON` }, null, 2));
if (!report.passed) process.exitCode = 1;
