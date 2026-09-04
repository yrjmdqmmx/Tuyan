import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REVISION = 'a876264bcd1e826a0320f805f8fb1cd705cf510f';
const ARCHIVE_BYTES = 265846711;
const ARCHIVE_SHA256 = 'a980d23954c0cb47017cdaa8a9029dbea3598791fd269a457482033821927e37';
const DIAGRAM_IDS = Object.freeze([
  240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256,
  257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273,
  274, 275, 276, 278, 279, 280, 281, 282, 283, 285, 286, 287, 288, 289, 290, 291, 292,
  293, 294, 295, 296, 297, 298, 299, 301, 302, 303, 304, 305, 306, 307, 308,
].map((index) => `ref_${index}`));

function invalid(reason) {
  const error = new Error(`DATASET_VALIDATION_FAILED: ${reason}`);
  error.code = 'DATASET_VALIDATION_FAILED';
  throw error;
}

function indexRows(rows, label, expectedCount) {
  if (!Array.isArray(rows) || rows.length !== expectedCount) invalid(`${label} source count`);
  const index = new Map();
  for (const row of rows) {
    const id = String(row?.id || '');
    if (!id || index.has(id)) invalid(`${label} missing or duplicate id`);
    index.set(id, row);
  }
  return index;
}

export function validateReferenceRows({ plotRows, diagramRows } = {}) {
  const plots = indexRows(plotRows, 'plot', 240);
  const diagrams = indexRows(diagramRows, 'diagram', 298);
  const plotIds = Array.from({ length: 240 }, (_, index) => `ref_${index}`);
  const missing = [...plotIds.filter((id) => !plots.has(id)), ...DIAGRAM_IDS.filter((id) => !diagrams.has(id))];
  if (missing.length) invalid(`missing selected ids: ${missing.join(', ')}`);
  return [
    ...plotIds.map((id) => ({ ...plots.get(id), taskName: 'plot' })),
    ...DIAGRAM_IDS.map((id) => ({ ...diagrams.get(id), taskName: 'diagram' })),
  ];
}

async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

function archiveJson(path, member) {
  try {
    return JSON.parse(execFileSync('unzip', ['-p', path, member], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }));
  } catch {
    invalid(`cannot read ${member}`);
  }
}

export async function verifyPaperBananaBenchArchive(path) {
  const file = await stat(path).catch(() => null);
  if (!file?.isFile()) invalid('archive not found');
  if (file.size !== ARCHIVE_BYTES) invalid(`archive byte length ${file.size}`);
  const sha256 = await sha256File(path);
  if (sha256 !== ARCHIVE_SHA256) invalid(`archive sha256 ${sha256}`);
  const diagramRows = archiveJson(path, 'PaperBananaBench/diagram/ref.json');
  const plotRows = archiveJson(path, 'PaperBananaBench/plot/ref.json');
  const selected = validateReferenceRows({ plotRows, diagramRows });
  return {
    retrieverStatus: 'enabled',
    revision: REVISION,
    archiveBytes: file.size,
    archiveSha256: sha256,
    selectedReferenceCount: selected.length,
    selectedCounts: { diagram: 66, plot: 240 },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const archive = process.argv[2];
  if (!archive) {
    console.error('Usage: node verify-paperbanana-bench.mjs <PaperBananaBench.zip>');
    process.exitCode = 2;
  } else {
    verifyPaperBananaBenchArchive(archive)
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(String(error?.message || error));
        process.exitCode = 1;
      });
  }
}
