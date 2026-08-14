const BODY_LIMIT = 1024 * 1024;

export class BodyLimitError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'BodyLimitError';
    this.type = 'entity.too.large';
    this.status = 413;
    this.statusCode = 413;
  }
}

export async function readBoundedBody(request, limit = BODY_LIMIT) {
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const value of request) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    size += chunk.byteLength;
    if (size > limit) {
      tooLarge = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) throw new BodyLimitError();
  return Buffer.concat(chunks, size);
}

export function createBoundedAuthHandler(webHandler, { limit = BODY_LIMIT } = {}) {
  if (typeof webHandler !== 'function') throw new Error('Better Auth Web handler is required');
  return async function boundedAuthHandler(request, response, next) {
    try {
      const method = String(request.method || 'GET').toUpperCase();
      const body = method === 'GET' || method === 'HEAD'
        ? Buffer.alloc(0)
        : await readBoundedBody(request, limit);
      const headers = incomingHeaders(request);
      const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
      const init = { method, headers };
      if (body.byteLength) init.body = body;
      const authResponse = await webHandler(new Request(url, init));
      await writeWebResponse(response, authResponse);
    } catch (error) {
      next(error);
    }
  };
}

function incomingHeaders(request) {
  const headers = new Headers();
  const raw = request.rawHeaders || [];
  for (let index = 0; index < raw.length; index += 2) {
    const name = raw[index];
    const value = raw[index + 1];
    if (name && value !== undefined) headers.append(name, value);
  }
  return headers;
}

async function writeWebResponse(response, webResponse) {
  response.status(webResponse.status);
  for (const [name, value] of webResponse.headers) {
    const normalized = name.toLowerCase();
    if (normalized === 'set-cookie' || normalized === 'content-length' || normalized === 'transfer-encoding') continue;
    response.setHeader(name, value);
  }
  const cookies = typeof webResponse.headers.getSetCookie === 'function'
    ? webResponse.headers.getSetCookie()
    : [];
  for (const cookie of cookies) response.append('Set-Cookie', cookie);
  if (webResponse.status === 204 || webResponse.status === 304) {
    response.end();
    return;
  }
  const bytes = Buffer.from(await webResponse.arrayBuffer());
  response.send(bytes);
}
