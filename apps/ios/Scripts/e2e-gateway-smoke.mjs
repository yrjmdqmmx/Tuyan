#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_API_BASE = "https://api.paperbanana.asia";
const DEFAULT_WEB_ORIGIN = "https://www.paperbanana.asia";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  printHelp();
  process.exit(0);
}

const config = {
  apiBase: trimTrailingSlash(process.env.PB_API_BASE || DEFAULT_API_BASE),
  webOrigin: trimTrailingSlash(process.env.PB_WEB_ORIGIN || DEFAULT_WEB_ORIGIN),
  email: process.env.PB_EMAIL || "",
  password: process.env.PB_PASSWORD || "",
  bailianKey: process.env.PB_BAILIAN_API_KEY || "",
  referenceImagePath: process.env.PB_REFERENCE_IMAGE || "",
  timeoutMs: numberFromEnv("PB_E2E_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
  pollIntervalMs: numberFromEnv("PB_E2E_POLL_INTERVAL_MS", DEFAULT_POLL_INTERVAL_MS)
};

const missing = [
  ["PB_EMAIL", config.email],
  ["PB_PASSWORD", config.password],
  ["PB_BAILIAN_API_KEY", config.bailianKey],
  ["PB_REFERENCE_IMAGE", config.referenceImagePath]
].filter(([, value]) => !value);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.map(([key]) => key).join(", ")}`);
  console.error("Run with --help for a copy/paste-safe example.");
  process.exit(2);
}

const referenceStat = fs.statSync(config.referenceImagePath);
const referenceMimeType = mimeTypeForPath(config.referenceImagePath);
if (!isAcceptedReference(referenceMimeType, referenceStat.size)) {
  console.error("Reference image must be PNG, JPG, WebP, or SVG, and no larger than 5MB.");
  process.exit(2);
}

const cookieJar = new Map();

try {
  await runSmokeTest();
} catch (error) {
  console.error(`[ios-e2e] ERROR ${sanitize(error.message)}`);
  process.exit(1);
}

async function runSmokeTest() {
  console.log(`[ios-e2e] apiBase=${config.apiBase}`);
  console.log(`[ios-e2e] reference=${path.basename(config.referenceImagePath)} bytes=${referenceStat.size} mime=${referenceMimeType}`);

  await requestJSON("/api/auth/sign-in/email", {
    email: config.email,
    password: config.password
  });

  await requestJSON("/api/auth/get-session", undefined, "GET");
  console.log("[ios-e2e] signed in: session present");

  const health = await requestJSON("/paperbanana-api", { action: "health" });
  const runtime = health.runtime || health?.laf?.runtime || "unknown";
  const mockEnabled = health.mockEnabled ?? health.mock_enabled ?? health?.laf?.mock_enabled ?? "unknown";
  console.log(`[ios-e2e] health runtime=${runtime} mock=${mockEnabled}`);

  const clientId = `ios-e2e-${Date.now()}:original`;
  const uploadEnvelope = await requestJSON("/paperbanana-api", {
    action: "prepareReferenceUpload",
    files: [
      {
        clientId,
        role: "original",
        filename: path.basename(config.referenceImagePath),
        mimeType: referenceMimeType,
        size: referenceStat.size
      }
    ]
  });

  const upload = uploadEnvelope.uploads?.[0];
  const uploadURL = upload?.uploadUrl || upload?.uploadURL || upload?.upload_url;
  const objectKey = upload?.objectKey || upload?.object_key;
  const uploadToken = upload?.uploadToken || upload?.upload_token;
  if (!uploadURL || !objectKey) {
    throw new Error(`prepareReferenceUpload response missing upload URL/object key: ${JSON.stringify(redact(uploadEnvelope))}`);
  }

  const referenceData = fs.readFileSync(config.referenceImagePath);
  const putResponse = await fetch(uploadURL, {
    method: "PUT",
    headers: { "content-type": referenceMimeType },
    body: referenceData
  });
  if (!putResponse.ok) {
    throw new Error(`reference upload failed with HTTP ${putResponse.status}`);
  }
  console.log(`[ios-e2e] uploaded reference objectKey=${objectKey}`);

  const create = await requestJSON("/paperbanana-api", {
    action: "createJob",
    configurationMode: "advanced",
    provider: "bailian",
    apiKeys: {
      bailian: config.bailianKey,
      openrouter: "",
      gemini: "",
      openai: ""
    },
    taskName: "diagram",
    methodContent: "We propose a compact research workflow for testing PaperBanana iOS native reference-image generation. The system accepts one reference image, plans a clear academic diagram layout, and generates a publication-friendly visual with simple nodes, arrows, and readable labels.",
    caption: "Figure 1: PaperBanana iOS reference image generation smoke test.",
    infographicCategory: "方法框架图",
    outputFormat: "png",
    imageSize: "1K",
    mainModelName: "qwen3.7-max",
    imageModelName: "wan2.7-image-pro",
    referenceVisionModelName: "qwen3.7-plus",
    referenceImageMode: "vision_model",
    referenceImages: [
      {
        filename: path.basename(config.referenceImagePath),
        mimeType: referenceMimeType,
        size: referenceStat.size,
        objectKey,
        uploadToken
      }
    ],
    pipelineMode: "planner_critic",
    retrievalSetting: "none",
    manualReferenceIds: [],
    aspectRatio: "16:9",
    numCandidates: 1,
    maxCriticRounds: 1
  });

  const jobId = create.jobId || create.jobID || create.id;
  if (!jobId) {
    throw new Error(`createJob response missing job id: ${JSON.stringify(redact(create))}`);
  }
  console.log(`[ios-e2e] job=${jobId} status=${create.status || "unknown"}`);

  const deadline = Date.now() + config.timeoutMs;
  let poll = 0;
  let lastJob;
  while (Date.now() < deadline) {
    poll += 1;
    const detail = await requestJSON("/paperbanana-api", { action: "getJob", jobId });
    lastJob = detail.job || detail;
    const status = lastJob.status || "unknown";
    const resultCount = lastJob.resultImages?.length ?? lastJob.result_image_count ?? lastJob.resultImageCount ?? 0;
    const stageCount = lastJob.stages?.length ?? 0;
    console.log(`[ios-e2e] poll=${poll} status=${status} stages=${stageCount} results=${resultCount}`);

    if (status === "succeeded") {
      if (!resultCount) {
        throw new Error("job succeeded but did not include result images");
      }
      console.log(`[ios-e2e] succeeded job=${jobId} results=${resultCount}`);
      return;
    }

    if (status === "failed") {
      const message = lastJob.error || lastJob.logsTail || lastJob.logs?.slice?.(-3)?.join("\n") || "unknown job failure";
      throw new Error(`job failed: ${String(message).slice(0, 1200)}`);
    }

    await sleep(config.pollIntervalMs);
  }

  throw new Error(`job did not finish before timeout: ${lastJob?.status || "unknown"}`);
}

async function requestJSON(pathname, body, method = "POST") {
  const url = pathname.startsWith("http") ? pathname : `${config.apiBase}${pathname}`;
  const headers = {
    accept: "application/json",
    origin: config.webOrigin,
    referer: `${config.webOrigin}/`
  };
  const cookies = cookieHeader();
  if (cookies) {
    headers.cookie = cookies;
  }
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  applySetCookie(response.headers);

  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  const isEnvelopeError = json.ok === false || json.success === false || (json.code !== undefined && String(json.code) !== "0");
  if (!response.ok || isEnvelopeError) {
    throw new Error(`${method} ${pathname} failed: HTTP ${response.status} ${JSON.stringify(redact(json)).slice(0, 1000)}`);
  }

  return json;
}

function applySetCookie(headers) {
  let values = [];
  if (typeof headers.getSetCookie === "function") {
    values = headers.getSetCookie();
  } else {
    const raw = headers.get("set-cookie");
    if (raw) {
      values = raw.split(/,(?=\s*[^;,]+=)/g);
    }
  }

  for (const value of values) {
    const pair = value.split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) {
      cookieJar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function mimeTypeForPath(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "";
  }
}

function isAcceptedReference(mimeType, size) {
  return size > 0 && size <= 5 * 1024 * 1024 && new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]).has(mimeType);
}

function numberFromEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitize(value) {
  return String(value)
    .replaceAll(config.password, "***")
    .replaceAll(config.bailianKey, "***")
    .replaceAll(config.email, "***")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-***");
}

function redact(value) {
  if (typeof value === "string") {
    return sanitize(value);
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        /key|password|token|cookie/i.test(key) ? "***" : redact(nested)
      ])
    );
  }
  return value;
}

function printHelp() {
  console.log(`
PaperBanana iOS gateway smoke test

Required environment variables:
  PB_EMAIL              PaperBanana login email
  PB_PASSWORD           PaperBanana login password
  PB_BAILIAN_API_KEY    Bailian BYOK key used for the generation request
  PB_REFERENCE_IMAGE    Local PNG/JPG/WebP/SVG reference image path

Optional environment variables:
  PB_API_BASE           Defaults to ${DEFAULT_API_BASE}
  PB_WEB_ORIGIN         Defaults to ${DEFAULT_WEB_ORIGIN}
  PB_E2E_TIMEOUT_MS     Defaults to ${DEFAULT_TIMEOUT_MS}
  PB_E2E_POLL_INTERVAL_MS Defaults to ${DEFAULT_POLL_INTERVAL_MS}

Example:
  read -s PB_PASSWORD
  export PB_EMAIL="you@example.com"
  export PB_PASSWORD
  export PB_BAILIAN_API_KEY="sk-..."
  export PB_REFERENCE_IMAGE="/path/to/reference.png"
  node apps/ios/Scripts/e2e-gateway-smoke.mjs
`);
}
