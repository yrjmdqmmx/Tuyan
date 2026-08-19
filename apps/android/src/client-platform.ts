export type ClientPlatform = 'web' | 'miniprogram' | 'android' | 'ios' | 'windows' | 'macos' | 'harmony';

export const CLIENT_PLATFORM: ClientPlatform = 'android';

const CLIENT_PLATFORM_LABELS: Record<ClientPlatform, string> = {
  web: 'Web 网页',
  miniprogram: '微信小程序',
  android: 'Android',
  ios: 'iOS',
  windows: 'Windows',
  macos: 'macOS',
  harmony: 'HarmonyOS',
};

export function normalizeClientPlatform(value: unknown): ClientPlatform | '' {
  const platform = String(value || '').trim().toLowerCase();
  return Object.hasOwn(CLIENT_PLATFORM_LABELS, platform) ? platform as ClientPlatform : '';
}

export function formatClientPlatform(value: unknown): string {
  const platform = normalizeClientPlatform(value);
  return platform ? CLIENT_PLATFORM_LABELS[platform] : '未记录';
}
