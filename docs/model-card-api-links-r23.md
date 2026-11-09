# R23 Phase E — visible API/JSON source audit

Offline scan of all **1,064** Web and Mini cards at `42ee9ffd`, compared with the R23 working tree. Inspected Web sources/channelSources/vendorSources/lifecycleSources and dialog rows, plus compiled Mini specSources and copy-dialog rows. No HTTP requests were made. Raw field evidence is retained; this report covers links shown to users.

**Before:** 1 affected Web card / 1 unique machine URL; 0 Mini cards. **After:** 0 affected cards and 0 visible machine URLs on either client.

| Card | Before URL | Surface and reason | After |
| --- | --- | --- | --- |
| stability/sd3.5-flash | https://api.stability.ai/v2alpha/openapi | Web sources, channelSources and evidence dialog; api.* host and /openapi machine schema endpoint. Mini did not expose this secondary URL. | Both clients retain https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post as the primary human documentation link; the machine row is removed. |

All other human documentation links remain, including fal.ai/models/…/api, docs.* API guides, developers.openai.com/api/docs/…, and api.volcengine.com/api-docs/view. OpenAPI, Swagger, JSON/YAML suffixes, root /api/ routes and machine endpoints on api.* hosts are filtered; captured JSON/YAML MIME types and redirect targets are also checked. When no human source remains, the card displays 官方文档待确认. The new tests pin both machine and human examples and exercise all 1,064 rendered Web dialogs and compiled Mini copy dialogs.
