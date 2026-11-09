# R24 Phase I1 — qwen3.5-plus evidence

The unchanged displayed maximum output is **65,536 tokens**, with vendor provenance. Its currently selected fact URL is the retirement-mechanism page. That page does **not** substantiate the value in this fetch. The archived R6A integer review points to a different, model-specific vendor page, whose fetched HTML does contain the exact integer. No numeric, provenance, lifecycle, execution or 15-model image-input decision was changed.

## Repository fact chain

| Layer | Exact repository evidence | Finding |
| --- | --- | --- |
| Channel input | `config/channel-audit/input-20261109.json`, `pairs[955]`, `mappings[55]` | `tokendance/qwen3.5-plus`: maxOutputTokens 65536, inherited-from-vendor, canonicalId qwen3.5-plus, sourceUrl `https://help.aliyun.com/zh/model-studio/model-depreciation`. Gateway listing supplies context, not this maximum-output fact. |
| Vendor records | Same file, `canonical["qwen3.5-plus"]` and `pairs[174]` (Bailian) | Canonical and vendor-channel records both store 65536; the canonical record has no URL of its own, while the Bailian row also points to model-depreciation. This is stored inheritance, not independent corroboration. |
| Integer evidence review | `config/channel-audit/review-r6a-20261109.json`, `integerReview` entry with key tokendance/qwen3.5-plus and field maxOutputTokens | 65536; sourceUrl `https://help.aliyun.com/zh/model-studio/qwen3-5-plus`; integerEvidence `最大输出长度 65536`; decision vendor-integer-reference. |
| Generated facts | `config/model-audit.generated.json`, decoded through `packages/api/src/model-audit.ts` | The chosen maximum-output fact remains 65536 / known / vendor / model-depreciation. |
| Individual provider details | `packages/api/src/provider-model-details.ts` and `exactModelDetails` in provider-catalog.ts | No key containing qwen3.5-plus exists in the individual-page archive. The resolved exact model adds channel modalityFacts but no maximum-output value. This archive is not evidence for 65536. |
| Curated card specifications | `apps/web/src/data/model-card-specifications.json`, C0178; package-local copy in `packages/api/src/card-data/reviewed-models.json` | Qwen3.5 Plus has context 1M and modality text, with vision-model and text-generation-model URLs; no maximum-output field. |
| Final Web/Mini display | `modelCardSpecifications("tokendance", {id:"qwen3.5-plus"})`; compiled Mini audit | Known vendor maximum remains 65536. Web exact text is 65,536 tokens (compact text ≈ 66K tokens); the vendor notice link now correctly says 下线公告. |

Full, reproducible local values: [qwen35plus-fact-chain.json](qwen35plus-fact-chain.json). The two direct integer-attribution URLs are **model-depreciation** (selected fact) and **qwen3-5-plus** (R6A integer review). The two curated-card URLs and the channel model page were fetched as supporting context, not claimed as independent integer evidence.

## Public GET capture manifest

All requests used curl with `-q`, HTTPS-only redirects, no authentication, no cookies and no custom credentials. No API, gateway, portal, inference or paid endpoint was requested. SHA-256 is over the saved raw response body. Times reflect the actual fetch clock, not the older audit date.

| Requested URL | HTTP | Final URL | Fetch start UTC | Asia/Shanghai | SHA-256 | Raw bytes |
| --- | ---: | --- | --- | --- | --- | ---: |
| https://help.aliyun.com/zh/model-studio/model-depreciation | 200 | https://help.aliyun.com/zh/model-studio/model-depreciation | 2026-11-09T22:06:44.580962+00:00 | 2026-11-10T06:06:44.580962+08:00 | 0ae8de8cf993fdb5fa59ecc49da53de99976c6e0cb0f7bd03ea74cf237eef253 | 60657 |
| https://help.aliyun.com/zh/model-studio/qwen3-5-plus | 200 | https://help.aliyun.com/zh/model-studio/qwen3-5-plus | 2026-11-09T22:06:44.581091+00:00 | 2026-11-10T06:06:44.581091+08:00 | fef9a14c34dfb54263e27b777ab906970f17f98e0fb8d6dc26583d276a7a845e | 121613 |
| https://tokendance.space/models/qwen3.5-plus | 200 | https://tokendance.space/models/qwen3.5-plus | 2026-11-09T22:06:44.582476+00:00 | 2026-11-10T06:06:44.582476+08:00 | 71bbeddbb1dd3e547180ae7af16234b118459290d78cafacc7377f652dd3dbb2 | 2122 |
| https://help.aliyun.com/zh/model-studio/text-generation-model | 200 | https://help.aliyun.com/zh/model-studio/text-generation-model | 2026-11-09T22:06:44.581217+00:00 | 2026-11-10T06:06:44.581217+08:00 | 2384521c94e45bee14ccf50481d89867618e4a507c009f67f52efc5aae688c61 | 117360 |
| https://tokendance.space/llms-full.txt | 200 | https://tokendance.space/llms-full.txt | 2026-11-09T22:12:23.205206+00:00 | 2026-11-10T06:12:23.205206+08:00 | 46b344b1fd51f0364ce562c3fc56c9db18ffe7836736938e26901326593fa046 | 331710 |
| https://tokendance.space/llms.txt | 200 | https://tokendance.space/llms.txt | 2026-11-09T22:07:05.618601+00:00 | 2026-11-10T06:07:05.618601+08:00 | aff7c6f09e11dc8c8c81017603a6132202e1f7500d1344a7008be0689275acae | 12485 |
| https://tokendance.space/models/qwen3.5-plus.md | 404 | https://tokendance.space/models/qwen3.5-plus.md | 2026-11-09T22:07:05.728604+00:00 | 2026-11-10T06:07:05.728604+08:00 | cf9be91f18e11cf4bf9caf1181753266a2b7f159327bb3d0081bcc02260d27c2 | 153 |
| https://help.aliyun.com/zh/model-studio/vision-model | 200 | https://help.aliyun.com/zh/model-studio/text-generation-model/ | 2026-11-09T22:06:44.581155+00:00 | 2026-11-10T06:06:44.581155+08:00 | adc25eaf8c9c845236ba17e2437a075403c7137669c7f1b9323632d585c8086b | 117360 |

Each adjacent `fetches/*.json` also records finish time, curl exit status and local body path. All curl exits were zero; the guessed model Markdown URL returned HTTP 404.

## Exact returned passages

### Selected retirement URL

[model-depreciation](https://help.aliyun.com/zh/model-studio/model-depreciation) returns a populated HTML article, not a JS shell. Short verbatim passages:

> 模型下线机制说明

> 模型下线指旧版本模型停止提供服务

No qwen3.5-plus, 65,536, 65536, max output or 最大输出 occurs in the extracted article text. Its general retirement policy cannot verify this model’s maximum output.

### Model-specific vendor integer URL

[qwen3-5-plus](https://help.aliyun.com/zh/model-studio/qwen3-5-plus) returns populated HTML with the base model and two snapshot sections. Verbatim heading / table passages:

> qwen3.5-plus

> 最大输出长度65536

> 最大输出长度（思考模式下）65536

The base model and snapshot sections qwen3.5-plus-2026-04-20 and qwen3.5-plus-2026-02-15 each contain those same normal/thinking maximum-output integers. The exact HTML table cells have no inserted space between the field title and number; the R6A stored quote inserts a space. There is no literal comma-formatted 65,536, English max output, or 下线 in the article text.

### Curated-card vendor table URLs

[vision-model](https://help.aliyun.com/zh/model-studio/vision-model) redirects to `https://help.aliyun.com/zh/model-studio/text-generation-model/`. [text-generation-model](https://help.aliyun.com/zh/model-studio/text-generation-model) directly returns the same visible model table. Each contains this exact row text (adjacent cells concatenated, without invented whitespace):

> qwen3.5-plus文本、图像、视频文本1M64k25664支持支持支持

The table header identifies the 64k column as 最大输出. Neither table contains literal 65536 or 65,536. A compact 64k value is not an independent exact-integer confirmation.

### Channel shell and public documentation alternatives

[TokenDance model page](https://tokendance.space/models/qwen3.5-plus) returns a 2,122-byte JS shell; body text is only whitespace. Raw HTML has no qwen3.5-plus, 65536, 65,536, max output, 最大输出 or 下线 passage. Its HTML advertises `/llms.txt` as AI documentation.

[llms.txt](https://tokendance.space/llms.txt) returns a public documentation index linking [llms-full.txt](https://tokendance.space/llms-full.txt); the index contains none of the requested terms. The guessed `/models/qwen3.5-plus.md` returns 404. No public per-model JSON documentation variant is advertised by these pages; gateway and portal API endpoints were deliberately not fetched under the documentation-only network scope.

The full public Markdown contains this exact retirement heading:

> ### 北京时间 2027 年 1 月 19 日 10:00：Qwen3.5 Plus 下线

Its associated bullet explicitly names qwen3.5-plus and recommends Qwen3.8 Flash; it links Alibaba notice 118728. Elsewhere the only 65536 occurrence is a configuration example for a different model, whose ID and field are:

> "deepseek-v4-flash-0731"

> "output": 65536

That example does not establish qwen3.5-plus output capacity. The generic documentation also mentions maximum-output configuration; those instructions are not model facts.

## pending real-browser verification

A real browser has not been used. The current evidence establishes returned HTML/Markdown text only. Manually open the TokenDance model page and both direct vendor attribution pages, inspect the fully rendered model/limit and retirement sections, and capture screenshots with timestamps. Reconcile the selected retirement-mechanism URL with the R6A model-specific integer URL before claiming that the displayed source directly substantiates 65,536. The founder’s 15-model image-input decision remains untouched.
