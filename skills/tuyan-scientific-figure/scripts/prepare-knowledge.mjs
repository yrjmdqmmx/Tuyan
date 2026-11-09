import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureKnowledge } from './knowledge-runtime.mjs';
export { captureKnowledge } from './knowledge-runtime.mjs';

async function main(argv) {
  const [directory, ...args] = argv;
  if (!directory) throw new Error('Usage: prepare-knowledge.mjs <output-directory> --source offline|mcp [--operation create --category bar --format svg --locale zh-CN] [--manifest file --workflow file] [--journal-selection file --journal-operation generate|generative-refine|non-generative-edit|evaluate]');
  const allowed = new Set(['source', 'operation', 'category', 'format', 'locale', 'manifest', 'workflow', 'journal-selection', 'journal-operation']);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    if (!args[i].startsWith('--') || !allowed.has(key) || !args[i + 1] || Object.hasOwn(options, key)) throw new Error('Invalid or duplicate option');
    options[key] = args[i + 1];
  }
  const json = async path => path ? JSON.parse(await readFile(path, 'utf8')) : undefined;
  const evidence = captureKnowledge({
    source: options.source,
    input: { operation: options.operation || 'evaluate', visualCategory: options.category || 'method_framework', outputFormat: options.format || 'png', locale: options.locale || 'zh-CN', knowledgeMajor: 1 },
    manifest: await json(options.manifest), workflow: await json(options.workflow),
    journalSelection: await json(options['journal-selection']), journalOperation: options['journal-operation'],
  });
  await mkdir(resolve(directory), { recursive: true });
  const destination = join(resolve(directory), 'knowledge-used.json');
  await writeFile(destination, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
  console.log(destination);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
