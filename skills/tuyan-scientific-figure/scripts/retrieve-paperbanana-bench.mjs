import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { validateReferenceRows, verifyPaperBananaBenchArchive } from './verify-paperbanana-bench.mjs';

function searchableText(row) {
  return [row.id, row.category, row.original_category, row.visual_intent, row.content, row.additional_info]
    .map((value) => typeof value === 'string' ? value : JSON.stringify(value || ''))
    .join(' ')
    .toLowerCase();
}

function terms(value) {
  return [...new Set(String(value || '').toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [])];
}

export function rankReferences(rows, { query, limit }) {
  if (!Array.isArray(rows)) throw new TypeError('RETRIEVAL_INVALID: rows must be an array');
  const queryText = String(query || '').trim();
  const queryTerms = terms(queryText);
  if (!queryTerms.length) throw new TypeError('RETRIEVAL_INVALID: query must contain searchable terms');
  const boundedLimit = Number(limit);
  if (!Number.isInteger(boundedLimit) || boundedLimit < 1 || boundedLimit > 20) {
    throw new TypeError('RETRIEVAL_INVALID: limit must be an integer from 1 to 20');
  }
  return rows
    .map((row, index) => {
      const haystack = searchableText(row);
      const matchedTerms = queryTerms.filter((term) => haystack.includes(term));
      const phraseBonus = haystack.includes(queryText.toLowerCase()) ? 2 : 0;
      return {
        ...row,
        retrieval: { score: matchedTerms.length + phraseBonus, matchedTerms },
        _sourceIndex: index,
      };
    })
    .sort((left, right) => right.retrieval.score - left.retrieval.score || left._sourceIndex - right._sourceIndex)
    .slice(0, boundedLimit)
    .map(({ _sourceIndex, ...row }) => row);
}

function archiveJson(path, member) {
  return JSON.parse(execFileSync('unzip', ['-p', path, member], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }));
}

function parseArgs(argv) {
  const archive = argv[0];
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--task') options.task = argv[++index];
    else if (flag === '--query-file') options.queryFile = argv[++index];
    else if (flag === '--limit') options.limit = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!archive || !['diagram', 'plot'].includes(options.task) || !options.queryFile || !options.limit) {
    throw new Error('Usage: node retrieve-paperbanana-bench.mjs <archive> --task <diagram|plot> --query-file <path> --limit <1-20>');
  }
  return { archive, ...options };
}

export async function retrieveFromArchive({ archive, task, queryFile, limit }) {
  await verifyPaperBananaBenchArchive(archive);
  const plotRows = archiveJson(archive, 'PaperBananaBench/plot/ref.json');
  const diagramRows = archiveJson(archive, 'PaperBananaBench/diagram/ref.json');
  const selected = validateReferenceRows({ plotRows, diagramRows }).filter((row) => row.taskName === task);
  const query = await readFile(queryFile, 'utf8');
  return rankReferences(selected, { query, limit });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  Promise.resolve()
    .then(() => parseArgs(process.argv.slice(2)))
    .then(retrieveFromArchive)
    .then((results) => console.log(JSON.stringify(results, null, 2)))
    .catch((error) => {
      console.error(String(error?.message || error));
      process.exitCode = 1;
    });
}
