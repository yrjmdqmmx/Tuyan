# R24 — qwen3.5-plus evidence

**Current result (Phase I4):** 65,536 remains, now attributed to the exact Bailian specification dated 2026-11-10. The separate TokenDance retirement citation is `llms-full.txt`, dated 2027-01-19. The I1 investigation below is preserved as history and superseded by the [real-browser verification](#real-browser-verification-2026-11-10).

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

## pending real-browser verification (I1 historical; resolved by I4)

A real browser has not been used. The current evidence establishes returned HTML/Markdown text only. Manually open the TokenDance model page and both direct vendor attribution pages, inspect the fully rendered model/limit and retirement sections, and capture screenshots with timestamps. Reconcile the selected retirement-mechanism URL with the R6A model-specific integer URL before claiming that the displayed source directly substantiates 65,536. The founder’s 15-model image-input decision remains untouched.


## Real-browser verification 2026-11-10

The operator's real-browser verification at approximately **07:05 Asia/Shanghai on 2026-11-10** is authoritative. This agent did not repeat browser automation; it fetched only public unauthenticated documentation GETs with curl.

- **a.** [Bailian model-depreciation](https://help.aliyun.com/zh/model-studio/model-depreciation), page updated **2026-10-27**: **0** matches for `qwen3.5-plus`, `Qwen3.5-Plus`, `65536` and `65,536`. It supports neither this maximum output nor this model's retirement.
- **b.** [Bailian qwen3-5-plus](https://help.aliyun.com/zh/model-studio/qwen3-5-plus), updated **2026-10-10**: `最大输出长度 65536`; `最大输出长度（思考模式下）65536`; `上下文长度 1000000`; `最大输入长度 991808`; **Text Image Video → Text**.
- **c.** [TokenDance model page](https://tokendance.space/models/qwen3.5-plus) fully renders, with the same description as Aliyun: `该模型版本功能等同于快照模型qwen3.5-plus-2026-02-15`; context **1.0M**, **文本+图像+视频→文本**. It has **no maximum-output field and no retirement notice**. Only [llms-full.txt](https://tokendance.space/llms-full.txt) contains the model's retirement heading:

> ### 北京时间 2027 年 1 月 19 日 10:00：Qwen3.5 Plus 下线

### Resulting change

Web and Mini retain **65,536**, with fact source `https://help.aliyun.com/zh/model-studio/qwen3-5-plus`, provenance **vendor**, `verifiedAt: 2026-11-10`, and label **原厂规格 · 百炼 · Qwen3.5 Plus**. Both evidence dialogs show the same short inheritance note:

> 沿用百炼同一 API ID 的原厂记录；TokenDance 模型页未标注最大输出

The distinct retirement row is **下线公告 · TokenDance · Qwen3.5 Plus 下线（2027-01-19）**, linking directly to `llms-full.txt`. The previously selected generic `model-depreciation` URL is absent from this card's specification and retirement sources. Before I4 this TokenDance card had **no audited lifecycle cutoff/date**; its catalog metadata said stable. The new human citation states **2027-01-19** (the quote specifies 10:00 Beijing time), without creating an execution cutoff. Existing Bailian schedules already said **2027-01-19**, so no date correction was needed.

`isMachineDocument` / `isApiSource` permit **only the exact TokenDance llms-full.txt document** as this human-readable citation. Other `.txt` indexes, Markdown documents and API/schema URLs remain filtered. This exception is deliberate: the fully rendered model page has no retirement notice and this public prose heading is the only confirmed channel source naming the model. It is a retirement source, never the maximum-output source.

Canonical decisions, exact quotes, per-field verification dates, operator attribution and both I1/I4 curl hashes are in `config/channel-audit/review-r24-20261110.json`. `generate-model-audit`, `sync-model-catalog` and `sync-card-display` regenerate all client/server projections. No generated file was edited manually.

### Task 2 findings (all 1,064 cards)

The initial scan found **19 field citations on eight cards** pointing to retirement URLs: 13 Qwen3.5 specifications, four unsupported image-model N/A claims and two supported MiMo input claims. It considers every rendered retirement-labelled URL plus retirement URL patterns, and all four resolved field source lists, including null/not-applicable fields.

| Card | Original fields / source | Verbatim evidence and decision |
| --- | --- | --- |
| tokendance/qwen3.5-plus | max output 65536 / model-depreciation | Original page has no model or value. Exact model page: `最大输出长度` / `65536`; retain 65536 as vendor inheritance, date 2026-11-10. Retirement: the quoted TokenDance heading above. |
| bailian/qwen3.5-plus | input, output, context 1000000, output 65536 / model-depreciation | Exact model page names `qwen3.5-plus`; `输入模态` / `Text Image Video`; `输出模态` / `Text`; `上下文长度` / `1000000`; `最大输出长度` / `65536`. Repoint all four facts, preserving values/provenance. |
| bailian/qwen3.5-plus-2026-02-15 | same four fields / model-depreciation | Exact snapshot section names `qwen3.5-plus-2026-02-15` and repeats the same four values. Repoint all four facts. |
| bailian/qwen3.5-plus-2026-04-20 | same four fields / model-depreciation | Exact snapshot section names `qwen3.5-plus-2026-04-20`; input `Image Text Video`, output `Text`, context `1000000`, max output `65536`. Repoint all four facts. |
| qianfan/qwen-image-edit | context N/A, max output N/A / model-depreciation | Retirement page names neither `qwen-image-edit` nor `Qwen-Image-Edit`. Existing [Qwen vendor model card](https://huggingface.co/Qwen/Qwen-Image-Edit): “Another standout feature of Qwen-Image-Edit is its accurate text editing capability”. It contains no context/output token limit or N/A claim. Both fields become **unknown/null**, with fallback suppressed and **未知** shown. Drop the unrelated retirement citation. |
| siliconflow/Qwen/Qwen-Image-Edit | context N/A, max output N/A / model-depreciation | Same fetched pages and finding as Qianfan. Both fields become **unknown/null**, with **未知** shown. Drop the unrelated retirement citation. No channel retirement is inferred. |
| bailian/xiaomi/mimo-v2.5-pro | text input / MiMo retirement page | [MiMo notice](https://mimo.mi.com/docs/zh-CN/updates/deprecate): `API 参数完全适配，mimo-v2.5-pro 仅支持文本输入，替换为 mimo-v2.6-pro 后将支持多模态理解`. Exact model and value are present: retain the vendor text-input citation, with the quote recorded and date 2026-11-10. |
| tokenhub/mimo-v2.5-pro | text input / MiMo retirement page | Same explicit quote; retain. This vendor retirement does not establish the aggregating channel's availability. |

For the three Bailian Plus cards, the generic retirement page also names no exact model. The linked [Aliyun notice 118728](https://www.aliyun.com/notice/118728) GET returns `【大模型服务平台百炼】部分Qwen3.5系列旧版本模型下线通知`, but its article container is empty; no individual base/snapshot ID can be confirmed. Those unsupported public notice links are therefore **removed**, not replaced by inference from a family title or a different channel. Existing execution lifecycle records (including their archived source pointers and cutoff dates) remain byte-for-byte within the main execution lock; display projections filter the unsupported source and lifecycle dialogs omit its anchor. The TokenDance citation is not used to assert Bailian snapshot retirement.

The MiMo alternative model-list GET says `mimo-v2.5-pro、mimo-v2.5 模型已于北京时间 2026.10.21 10:00 正式下线，建议尽快切换至新版模型。详见 模型下线 。`; its current specification table lists **V2.6**, not V2.5. The historical per-model URL returned a shell. Neither is needed: the original notice itself explicitly supports the text-input fact.

After correction, the full Web and compiled Mini scans each find **two supported retirement/spec citations (MiMo), zero unsupported citations**. Negative regressions reject both a wrong value on the MiMo notice and 65536 on model-depreciation. Both image-card fields are tested as unknown and null, never zero/infinity or inferred N/A. All 15 deferred image-input decisions are unchanged.

### I4 public curl capture manifest

Raw files are under `.audit-input/r24/fetches/i4-*`; checked metadata and verbatim excerpts are retained in the canonical review JSON. SHA-256 covers the raw response body. All curl exits were 0, all statuses 200, all final URLs equal the requested URLs. Extraction inserts line breaks at HTML block boundaries; `/` in the findings table denotes adjacent recorded text lines, not an invented quote.

| URL | HTTP | Start UTC | Asia/Shanghai | SHA-256 | Bytes |
| --- | ---: | --- | --- | --- | ---: |
| https://www.aliyun.com/notice/118728 | 200 | 2026-11-09T23:08:48.178489+00:00 | 2026-11-10T07:08:48.178489+08:00 | `293c75d0d08dc908619041e96ce50536221b6bd30ea273ef341b97b35ad53a0e` | 30424 |
| https://mimo.mi.com/docs/zh-CN/updates/deprecate | 200 | 2026-11-09T23:08:35.794773+00:00 | 2026-11-10T07:08:35.794773+08:00 | `0de614a2f50a5c72825facb9afe5bee561b08887f392c137437ebdf2eff94847` | 138245 |
| https://mimo.mi.com/docs/zh-CN/quick-start/summary/model | 200 | 2026-11-09T23:08:35.977145+00:00 | 2026-11-10T07:08:35.977145+08:00 | `c35ceeb4f70470151cde7b6c5243efbc0101307f08e65c2f1002dd083fd1e988` | 153919 |
| https://mimo.mi.com/models/en-US/mimo-v2.5-pro | 200 | 2026-11-09T23:08:36.112093+00:00 | 2026-11-10T07:08:36.112093+08:00 | `9db6ee29ae63eb2b55ff0a4aff7211316124fbee879e4bf839be2ada2a9e291e` | 13419 |
| https://help.aliyun.com/zh/model-studio/model-depreciation | 200 | 2026-11-09T23:08:35.792456+00:00 | 2026-11-10T07:08:35.792456+08:00 | `3e1ba6005639ae3f503cfc2dc081ce26432cd47778a5a97be7b4cc67d8ab83f6` | 60657 |
| https://huggingface.co/Qwen/Qwen-Image-Edit | 200 | 2026-11-09T23:08:36.323107+00:00 | 2026-11-10T07:08:36.323107+08:00 | `1b8d6569d2997de29e3c35d63786c2a5887218db1ececa07c3858bfd472ad529` | 235884 |
| https://help.aliyun.com/zh/model-studio/qwen3-5-plus | 200 | 2026-11-09T23:08:35.792602+00:00 | 2026-11-10T07:08:35.792602+08:00 | `047fcf99898573808c5fe9b0ca98b6828699b9fca964b91526f375bb75061777` | 121613 |
| https://tokendance.space/llms-full.txt | 200 | 2026-11-09T23:08:35.792668+00:00 | 2026-11-10T07:08:35.792668+08:00 | `46b344b1fd51f0364ce562c3fc56c9db18ffe7836736938e26901326593fa046` | 331710 |

The earlier I1 captures remain unchanged and are cited in `priorCaptures`. New Aliyun HTML body hashes differ, while the TokenDance full-text body hash remains `46b344b1fd51f0364ce562c3fc56c9db18ffe7836736938e26901326593fa046`. The saved passages, not hash equality across different fetch times, determine support.

## R25 Phase I5

**All three Bailian badges are retained, each with the verified public notice [118728](https://www.aliyun.com/notice/118728), dated 2027-01-19.** I4's empty HTML article is a retrieval limitation, not proof that the notice lacks the model list. The HTML directly loads the public page-entry script linked below. Its static `httpDatas` JSON includes `detailInfo.detailList[0].contentHtml` and `content`; these explicitly list all three IDs in the retirement table. Only JSON was decoded; no fetched script was executed.

Verbatim notice passages:

> 2027 年 01 月 19 日 10:00:00, 【以实际变更时间为准】

> 为了不断提升模型性能和服务体验，同时优化底层资源管理，大模型服务平台百炼将于 2027 年 01 月 19 日 对下表中的旧版本模型进行下线处理。

> 2027年01月19日（正式下线）：届时模型将全面停止推理服务。

| Card | Exact retirement-table model cell | Decision / public source | Displayed date |
| --- | --- | --- | --- |
| `bailian/qwen3.5-plus` | `qwen3.5-plus` | Keep badge; [notice 118728](https://www.aliyun.com/notice/118728) | 2027-01-19 |
| `bailian/qwen3.5-plus-2026-02-15` | `qwen3.5-plus-2026-02-15` | Keep badge; [notice 118728](https://www.aliyun.com/notice/118728) | 2027-01-19 |
| `bailian/qwen3.5-plus-2026-04-20` | `qwen3.5-plus-2026-04-20` | Keep badge; [notice 118728](https://www.aliyun.com/notice/118728) | 2027-01-19 |

The notice distinguishes **2026-11-18** (停止新购 EOM) from **2027-01-19** (正式下线). Both clients show the retirement date; the existing date-only execution schedule remains byte-for-byte unchanged. The notice's time is recorded above; this phase does not alter execution cutoff semantics.

TokenDance's alternative evidence says:

> ### 北京时间 2027 年 1 月 19 日 10:00：Qwen3.5 Plus 下线

> - [Qwen: Qwen3.5 Plus](/models/qwen3.5-plus)（`qwen3.5-plus`）：建议切换至 [Qwen: Qwen3.8 Flash](/models/qwen3.8-flash)（`qwen3.8-flash`）。

> [查看阿里云百炼模型下线公告](https://www.aliyun.com/notice/118728)

Neither snapshot ID occurs anywhere in the fetched TokenDance full text (zero exact matches each). That page is therefore not used to establish either Bailian snapshot retirement; the Aliyun notice itself covers them.

### Public GET investigation and capture manifest

The notice HTML has no embedded article JSON, but includes the exact `cloud-assets.alicdn.com/lowcode/entry/prod/4c06616382ae914768cb2899fcb9e7e3.js` entry. That entry's `httpDatas` is the successful evidence path. The page's public `t.aliyun.com/abs/bulletin/bulletinDetail` endpoint was also attempted without headers/cookies/authentication; its HTTP 200 body says `illegal origin, cannot access cross-origin resource` (51 bytes), so it is not used as evidence. No origin bypass or authenticated retry was performed. The notice component asset was inspected only as static text.

SHA-256 covers raw response bytes. Requested and final URLs, curl exits, exact timestamps and excerpts are retained in [canonical I5 review](../config/channel-audit/review-r25-20261110.json). Raw captures remain under `.audit-input/r24/fetches/i5-*`.

| URL | HTTP | UTC | Asia/Shanghai | SHA-256 | Bytes |
| --- | ---: | --- | --- | --- | ---: |
| https://www.aliyun.com/notice/118728 | 200 | 2026-11-09T23:47:17.776214+00:00 | 2026-11-10T07:47:17.776214+08:00 | `280ebdede0418fd532c8947ab248ed2d2ac6a9e981d13e8594144c7ebec6036f` | 30424 |
| https://cloud-assets.alicdn.com/lowcode/entry/prod/4c06616382ae914768cb2899fcb9e7e3.js | 200 | 2026-11-09T23:47:34.699702+00:00 | 2026-11-10T07:47:34.699702+08:00 | `807b38498e953446500cb611758030db542b288d068f9d3133860faf1db51f2a` | 1698313 |
| https://g.alicdn.com/code/npm/@ali/hmod-aliyundotcom-notice-detail/0.5.3/index.js | 200 | 2026-11-09T23:47:34.677437+00:00 | 2026-11-10T07:47:34.677437+08:00 | `24fd2142fee77f7c9af7346ca1375698f9f957826eb0d4e47536c1af3663cdfa` | 200110 |
| https://t.aliyun.com/abs/bulletin/bulletinDetail?id=118728&language=zh&website=cn | 200 | 2026-11-09T23:48:11.834154+00:00 | 2026-11-10T07:48:11.834154+08:00 | `5781a81c412a8d7fe135905a8073fe81423d29584196691be35ace7c787541fa` | 51 |
| https://tokendance.space/llms-full.txt | 200 | 2026-11-09T23:47:17.776324+00:00 | 2026-11-10T07:47:17.776324+08:00 | `46b344b1fd51f0364ce562c3fc56c9db18ffe7836736938e26901326593fa046` | 331710 |

### Resulting behavior and regression coverage

`model-depreciation` remains excluded for all three cards and never backs input, output, context or maximum-output fields. Each of those fields still cites the exact `qwen3-5-plus` specification page; 1,000,000 and 65,536 are unchanged. The new `lifecycleSourceUrl` is display evidence only. Shared projections carry it to Web/Mini/Core/Gateway while preserving notices, cutoff dates and execution behavior. Mini retains both specification and retirement rows; tapping the badge copies its own notice instead of the first source row.

Web and compiled Mini scan all **1,064 cards each**, including all seven displayed retirement badges, requiring a clickable/copyable non-excluded URL. Explicit tests cover all three exact IDs and dates, both spec/retirement sources, and suppression when a source is missing or excluded. The I4 all-card retirement/spec scan remains green: only the two previously supported MiMo exceptions remain. Core/Gateway tests verify the correction survives live projections; negative generator tests reject missing model/date quotes and bad captures. All changed prior expectations are recorded in the ledger.
