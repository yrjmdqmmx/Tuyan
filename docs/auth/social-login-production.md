# GitHub / Google production login

This release preserves email and Watcha authentication, existing account IDs and all workspace data. Phone login and SMS delivery remain explicitly disabled pending carrier registration. WeChat and Plus are not enabled. OAuth identities are linked only by the provider's stable ID; an existing account must explicitly bind an identity. Matching email addresses never merge accounts.

GitHub production OAuth application: 3980252, named `图研 Tuyan`. Google production Web client: `图研 Tuyan 正式网站`, in the existing Google project. Google brand is `图研 Tuyan`, External / Production, requesting only `openid profile`. GitHub requests basic identity without repository or email scopes. Both providers accept these gateway callback bases:

- `https://tuyansci.cn/api/auth/oauth2/callback/{github|google}`
- `https://api.paperbanana.asia/api/auth/oauth2/callback/{github|google}`

Credentials reside in the operator's owner-only private files and `/opt/paperbanana/secrets/gateway.env`; the CN gateway inherits that environment while retaining its own origin and Watcha overrides. Never copy credentials into this repository or diagnostic output. The initial Google production key was rotated and disabled before any server installation.

## Restricted identity transport

`AUTH_IDENTITY_PROXY_URL=http://10.78.0.1:3129` selects the dedicated WireGuard CONNECT listener. The gateway transport permits only four exact HTTPS URLs, rejects redirects and does not retry exchanges on another route. Squid restricts port 3129 to `github.com`, `api.github.com`, `oauth2.googleapis.com`, and `www.googleapis.com`. Its existing port 3128 model allowlist is unchanged; model and other destinations are denied on 3129. The gateway firewall permits only the private listener in addition to its existing DirectMail/Watcha destinations.

Production configuration changes use `deploy/hangzhou/release.sh`: all five current image digests are guarded, the production lock and idle/maintenance gates apply, modified configuration receives root-only backups, and health failure restores configuration. The preparatory rollout establishes the restricted proxy environment on the current image before CI records its protected-environment baseline. The new code then follows the normal `codex/hangzhou-production` CI path, including immutable images, maintenance, backups and both websites.

## Validation and rollback

Gateway and Web unit/regression suites, isolated Mongo GitHub/Google flows and the deployment/firewall suite run without real model or SMS calls. Production checks compare public revisions, flags, gateway health, real browser OAuth flows, and read-only workspace collection digests. Provider readiness or a health endpoint alone is not authenticated browser acceptance; store that evidence separately.

The preparatory environment backup is `/var/backups/hangzhou-social-auth-prepare-20261031`; identity network backups are `/var/backups/tuyan-identity-egress-20261031` on the corresponding hosts. Normal CI retains image and release receipts. Restore only the scoped gateway environment/image and proxy configuration when rolling back; do not restore or delete user databases. No account or workspace data migration is part of this release.
