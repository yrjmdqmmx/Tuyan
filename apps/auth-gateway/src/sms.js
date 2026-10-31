import DysmsModule, { SendSmsRequest } from '@alicloud/dysmsapi20170525';

// Disabled by default. No SDK/client is constructed until delivery is explicitly enabled.
export function loadSmsConfig(env = process.env) {
  const enabled = env.AUTH_SMS_ENABLED === 'true';
  const deliveryEnabled = env.AUTH_SMS_DELIVERY_ENABLED === 'true';
  if (deliveryEnabled && !enabled) throw Error('AUTH_SMS_ENABLED is required for SMS delivery');
  const required = name => { const value = String(env[name] || '').trim(); if (!value) throw Error(`${name} is required`); return value; };
  const limit = (name, fallback, max) => {
    const value = env[name] === undefined ? fallback : Number(env[name]);
    if (!Number.isInteger(value) || value < 1 || value > max) throw Error(`${name} is invalid`);
    return value;
  };
  return { enabled, deliveryEnabled,
    dailyMax: limit('AUTH_SMS_GLOBAL_DAILY_MAX', 200, 100000),
    monthlyMax: limit('AUTH_SMS_GLOBAL_MONTHLY_MAX', 5000, 3000000),
    ...(deliveryEnabled ? { accessKeyId: required('ALIBABA_SMS_ACCESS_KEY_ID'), accessKeySecret: required('ALIBABA_SMS_ACCESS_KEY_SECRET'),
      signName: required('ALIBABA_SMS_SIGN_NAME'), templateCode: required('ALIBABA_SMS_TEMPLATE_CODE'),
      codeVariable: String(env.ALIBABA_SMS_CODE_VARIABLE || 'code').trim() } : {}),
  };
}

export function createSmsTransport(config, clientFactory = settings => new DysmsModule.default(settings)) {
  if (!config?.enabled || !config.deliveryEnabled) return null;
  if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(config.codeVariable) || !/^SMS_[A-Za-z0-9]+$/.test(config.templateCode)) throw Error('SMS_TEMPLATE_CONFIGURATION_INVALID');
  const client = clientFactory({ accessKeyId: config.accessKeyId, accessKeySecret: config.accessKeySecret,
    endpoint: 'dysmsapi.aliyuncs.com', regionId: 'cn-hangzhou', protocol: 'https', readTimeout: 10000, connectTimeout: 5000 });
  return { async send({ phone, code, requestId }) {
    if (!/^\+861[3-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(code)) throw Error('SMS_INVALID_MESSAGE');
    // Never automatically retry a timed-out, possibly billed request.
    const response = await client.sendSmsWithOptions(new SendSmsRequest({ phoneNumbers: phone.slice(3), signName: config.signName,
      templateCode: config.templateCode, templateParam: JSON.stringify({ [config.codeVariable]: code }), outId: requestId }),
    { autoretry: false, maxAttempts: 1, readTimeout: 10000, connectTimeout: 5000 });
    if (response?.body?.code !== 'OK') throw Error('SMS_DELIVERY_UNCONFIRMED');
    return { accepted: true };
  } };
}
