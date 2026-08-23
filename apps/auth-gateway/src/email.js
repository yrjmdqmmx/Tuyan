import { createHmac } from 'node:crypto';

import DmModule, { SingleSendMailRequest } from '@alicloud/dm20151123';
import { APIError } from 'better-auth/api';

const DAY_SECONDS = 24 * 60 * 60;

export function emailFingerprint(value, secret) {
  return createHmac('sha256', secret)
    .update(String(value || '').trim().toLowerCase())
    .digest('hex');
}

export function renderAccountEmail(type, actionUrl) {
  const verification = type === 'verification';
  const title = verification ? '验证图研邮箱 / Verify your Tuyan email' : '重置图研密码 / Reset your Tuyan password';
  const action = verification ? '验证邮箱' : '重置密码';
  const englishAction = verification ? 'Verify email' : 'Reset password';
  const escapedUrl = escapeHtml(actionUrl);
  return {
    subject: `图研 Tuyan｜${title}`,
    htmlBody: `<!doctype html><html lang="zh-CN"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033;line-height:1.6"><main style="max-width:560px;margin:32px auto;padding:28px;border:1px solid #e6e9ef;border-radius:18px"><h1 style="font-size:22px">${title}</h1><h2 style="font-size:16px">简体中文</h2><p>请在 1 小时内完成${action}。如果不是你发起的操作，请忽略本邮件。</p><p><a href="${escapedUrl}" style="display:inline-block;padding:12px 18px;background:#5b5bd6;color:white;text-decoration:none;border-radius:10px">${action}</a></p><h2 style="font-size:16px">English</h2><p>Please ${englishAction.toLowerCase()} within one hour. If you did not request this, ignore this email.</p><p><a href="${escapedUrl}">${englishAction}</a></p><p style="color:#6b7280;font-size:13px">This is an account-security message from Tuyan. No marketing or tracking is used.</p></main></body></html>`,
    textBody: `图研 Tuyan\n\n简体中文：请在 1 小时内完成${action}。如果不是你发起的操作，请忽略本邮件。\n${actionUrl}\n\nEnglish: Please ${englishAction.toLowerCase()} within one hour. If you did not request this, ignore this email.\n${actionUrl}\n\nAccount security only. No marketing or tracking.`,
  };
}

export function createDirectMailTransport(config, client) {
  if (!client) throw new Error('DirectMail client is required');
  return {
    async send(message) {
      const request = new SingleSendMailRequest({
        accountName: config.accountName,
        addressType: 1,
        replyToAddress: false,
        fromAlias: config.fromAlias,
        toAddress: message.toAddress,
        subject: message.subject,
        htmlBody: message.htmlBody,
        textBody: message.textBody,
        clickTrace: '0',
      });
      const response = await client.singleSendMail(request);
      return { requestId: String(response?.body?.requestId || '') };
    },
  };
}

export function createDirectMailClient(config) {
  const Client = DmModule.default;
  return new Client({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    endpoint: config.endpoint,
    regionId: config.regionId,
  });
}

export function createDatabaseMailLimiter({ collection, secret, windowSeconds, windowMax, dailyMax, now = () => new Date() }) {
  return {
    async ensureIndexes() {
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'auth_mail_rate_limit_ttl' });
    },
    async consume({ kind, value, template }) {
      const fingerprint = emailFingerprint(value, secret);
      const current = now();
      const seconds = Math.floor(current.getTime() / 1000);
      await consumeBucket(collection, `${kind}:${fingerprint}:${template}:window:${Math.floor(seconds / windowSeconds)}`, windowMax, new Date((seconds + windowSeconds * 2) * 1000), windowSeconds);
      await consumeBucket(collection, `${kind}:${fingerprint}:${template}:day:${Math.floor(seconds / DAY_SECONDS)}`, dailyMax, new Date((seconds + DAY_SECONDS * 2) * 1000), DAY_SECONDS);
    },
  };
}

export function createAccountEmailService({ config, fingerprintSecret, limiter, transport, logger = console }) {
  async function send(template, { email, url, token, request }) {
    if (!config.deliveryEnabled) return { skipped: true };
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const fingerprint = emailFingerprint(normalizedEmail, fingerprintSecret);
    const ip = clientIp(request);
    await limiter.consume({ kind: 'email', value: normalizedEmail, template });
    if (ip) await limiter.consume({ kind: 'ip', value: ip, template });
    const actionUrl = fixedActionUrl(config, template, { url, token });
    const message = renderAccountEmail(template, actionUrl);
    try {
      const result = await transport.send({ toAddress: normalizedEmail, ...message });
      logger.info?.('account email sent', { template, fingerprint, requestId: result.requestId, result: 'sent' });
      return result;
    } catch (error) {
      logger.warn?.('account email failed', {
        template,
        fingerprint,
        requestId: String(error?.data?.requestId || ''),
        result: 'failed',
        providerCode: String(error?.code || error?.name || 'DirectMailError'),
      });
      throw new APIError(
        'SERVICE_UNAVAILABLE',
        { code: 'ACCOUNT_EMAIL_DELIVERY_FAILED', message: 'Account email delivery is temporarily unavailable' },
      );
    }
  }
  return {
    sendVerification(input) { return send('verification', input); },
    sendPasswordReset(input) { return send('password-reset', input); },
  };
}

async function consumeBucket(collection, id, maximum, expiresAt, retryAfterSeconds) {
  const document = await collection.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: 'after' },
  );
  if (Number(document?.count || 0) > maximum) {
    throw new APIError(
      'TOO_MANY_REQUESTS',
      { code: 'ACCOUNT_EMAIL_RATE_LIMITED', message: 'Too many account email requests' },
      { 'X-Retry-After': String(retryAfterSeconds) },
    );
  }
}

function fixedActionUrl(config, template, { url, token }) {
  if (!token) return String(url || '');
  if (template === 'password-reset') {
    const target = new URL(config.resetPasswordUrl);
    target.searchParams.set('token', token);
    return target.toString();
  }
  const target = new URL('/api/auth/verify-email', config.authBaseUrl);
  target.searchParams.set('token', token);
  target.searchParams.set('callbackURL', config.verificationCallbackUrl);
  return target.toString();
}

function clientIp(request) {
  const forwarded = request?.headers?.get?.('x-forwarded-for') || '';
  return String(forwarded).split(',')[0].trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}
