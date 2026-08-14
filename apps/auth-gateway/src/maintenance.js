import { existsSync as nodeExistsSync } from 'node:fs';

export function createMaintenanceCheck({
  env = process.env,
  markerFile,
  existsSync = nodeExistsSync,
}) {
  return () => {
    const enabled = ['1', 'true', 'yes', 'on'].includes(
      String(env.PAPERBANANA_MAINTENANCE_MODE || '').trim().toLowerCase(),
    );
    return enabled || Boolean(markerFile && existsSync(markerFile));
  };
}
