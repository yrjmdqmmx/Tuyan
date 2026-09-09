# TokenDance 全量型号覆盖核对

核对日期：2026-09-09。93 个实时型号逐一打开详情页核对；能力以精确 ID、详情 architecture、协议为准。分润、价格、创建日期均不作为接入门槛。catalog 不等于真实推理验证。

62 个不同型号接入：主模型/提示词优化 60，参考图识别/视觉评审 27（与主模型重叠），生成/直接精修 2（与前两类不重叠）；31 个未映射现有功能。

|精确 ID|输入 → 输出|官方协议|图研角色|限制 / 未接入原因|
|---|---|---|---|---|
|[bocha-web-search](https://tokendance.space/models/bocha-web-search)|text → text|bocha:web-search||网页搜索接口；现有参考库检索并非开放网页搜索，需要新增检索工具契约。|
|[deepseek-chat-v3-0324](https://tokendance.space/models/deepseek-chat-v3-0324)|text → text|openai:chat-completions|main, optimize|下线公告与实时 API、详情供应商入口冲突；真实服务状态待联调。|
|[deepseek-ocr-2](https://tokendance.space/models/deepseek-ocr-2)|text,image → text|openai:chat-completions||OCR 专用模型，不能证明支持通用图像分析及评审；且下线公告与实时目录冲突。；下线公告与实时 API、详情供应商入口冲突；真实服务状态待联调。|
|[deepseek-v3.2](https://tokendance.space/models/deepseek-v3.2)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[deepseek-v4-flash](https://tokendance.space/models/deepseek-v4-flash)|text → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[deepseek-v4-flash-0731](https://tokendance.space/models/deepseek-v4-flash-0731)|text → text|openai:chat-completions, openai:responses, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[deepseek-v4-flash-vision-exp](https://tokendance.space/models/deepseek-v4-flash-vision-exp)|text,image → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[deepseek-v4-pro](https://tokendance.space/models/deepseek-v4-pro)|text → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[deepseek-v4-pro-0813](https://tokendance.space/models/deepseek-v4-pro-0813)|text → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[deepseek-v4.1-flash](https://tokendance.space/models/deepseek-v4.1-flash)|text → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize|描述提及多模态，详情 architecture 仅 text；暂不开放视觉角色。|
|[dots-3-note-preview](https://tokendance.space/models/dots-3-note-preview)|text,image,video,audio → text|openai:chat-completions, anthropic:messages|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-4.5-air](https://tokendance.space/models/glm-4.5-air)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-4.6v](https://tokendance.space/models/glm-4.6v)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-4.7](https://tokendance.space/models/glm-4.7)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-5](https://tokendance.space/models/glm-5)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-5.1](https://tokendance.space/models/glm-5.1)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-5.2](https://tokendance.space/models/glm-5.2)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-5.3](https://tokendance.space/models/glm-5.3)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-5.3-flash](https://tokendance.space/models/glm-5.3-flash)|text,image,video → text|openai:chat-completions, anthropic:messages|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-5v-turbo](https://tokendance.space/models/glm-5v-turbo)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[glm-ocr](https://tokendance.space/models/glm-ocr)|text,image → text|zai:layout-parsing||专用文档 OCR 协议；图研视觉角色需要通用图像分析及评审，需新增文档 OCR 角色与解析能力。|
|[happyhorse-1.0-i2v](https://tokendance.space/models/happyhorse-1.0-i2v)|text,image → video|happyhorse:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[happyhorse-1.0-r2v](https://tokendance.space/models/happyhorse-1.0-r2v)|text,image → video|happyhorse:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[happyhorse-1.0-t2v](https://tokendance.space/models/happyhorse-1.0-t2v)|text → video|happyhorse:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[happyhorse-1.0-video-edit](https://tokendance.space/models/happyhorse-1.0-video-edit)|text,video → video|happyhorse:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[happyhorse-1.1-i2v](https://tokendance.space/models/happyhorse-1.1-i2v)|text,image → video|happyhorse:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[happyhorse-1.1-r2v](https://tokendance.space/models/happyhorse-1.1-r2v)|text,image → video|happyhorse:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[happyhorse-1.1-t2v](https://tokendance.space/models/happyhorse-1.1-t2v)|text → video|happyhorse:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[hy3](https://tokendance.space/models/hy3)|text → text|openai:chat-completions, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[hy3-preview](https://tokendance.space/models/hy3-preview)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[hy4-preview](https://tokendance.space/models/hy4-preview)|text → text|openai:chat-completions, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[kimi-k2.5](https://tokendance.space/models/kimi-k2.5)|text,image,video → text|openai:chat-completions, anthropic:messages|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[kimi-k2.6](https://tokendance.space/models/kimi-k2.6)|text,image,video → text|openai:chat-completions, anthropic:messages|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[kimi-k2.7-code](https://tokendance.space/models/kimi-k2.7-code)|text,image,video → text|openai:chat-completions, anthropic:messages|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[kimi-k3](https://tokendance.space/models/kimi-k3)|text,image,video → text|openai:chat-completions, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[kling-3.0](https://tokendance.space/models/kling-3.0)|text,image → video|kling:text2video, kling:image2video||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[kling-3.0-omni](https://tokendance.space/models/kling-3.0-omni)|text,image,audio,video → video|kling:omni-video||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[kling-3.0-turbo](https://tokendance.space/models/kling-3.0-turbo)|text,image → video|kling:text2video, kling:image2video||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[ling-3.0-flash](https://tokendance.space/models/ling-3.0-flash)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[longcat-2.0](https://tokendance.space/models/longcat-2.0)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[mimo-v2.5](https://tokendance.space/models/mimo-v2.5)|text,image,video,audio → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[mimo-v2.5-pro](https://tokendance.space/models/mimo-v2.5-pro)|text → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[mimo-v2.5-tts](https://tokendance.space/models/mimo-v2.5-tts)|text → audio|openai:chat-completions||audio 输出无法映射图研现有功能；本次不扩展产品范围。|
|[mimo-v2.5-tts-voiceclone](https://tokendance.space/models/mimo-v2.5-tts-voiceclone)|text → audio|openai:chat-completions||audio 输出无法映射图研现有功能；本次不扩展产品范围。|
|[mimo-v2.5-tts-voicedesign](https://tokendance.space/models/mimo-v2.5-tts-voicedesign)|text → audio|openai:chat-completions||audio 输出无法映射图研现有功能；本次不扩展产品范围。|
|[minimax-h3](https://tokendance.space/models/minimax-h3)|text,image → video|minimax:video_generation_v2||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[minimax-h3-max](https://tokendance.space/models/minimax-h3-max)|text,image → video|minimax:video_generation_v2||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[minimax-m2.5](https://tokendance.space/models/minimax-m2.5)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[minimax-m2.7](https://tokendance.space/models/minimax-m2.7)|text → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[minimax-m3](https://tokendance.space/models/minimax-m3)|text,image,video → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[minimax-speech-2.8-hd](https://tokendance.space/models/minimax-speech-2.8-hd)|text → audio|minimax:t2a_v2, minimax:t2a_v2_ws, minimax:voice_clone||audio 输出无法映射图研现有功能；本次不扩展产品范围。|
|[minimax-speech-2.8-turbo](https://tokendance.space/models/minimax-speech-2.8-turbo)|text → audio|minimax:t2a_v2, minimax:t2a_v2_ws, minimax:voice_clone||audio 输出无法映射图研现有功能；本次不扩展产品范围。|
|[qwen-text-embedding-v4](https://tokendance.space/models/qwen-text-embedding-v4)|text → embedding|openai:embeddings||embedding 输出无法映射图研现有功能；本次不扩展产品范围。|
|[qwen3-30b-a3b-instruct-2507](https://tokendance.space/models/qwen3-30b-a3b-instruct-2507)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3-max](https://tokendance.space/models/qwen3-max)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3-vl-plus](https://tokendance.space/models/qwen3-vl-plus)|text,image,video → text|openai:chat-completions, anthropic:messages|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.5-35b-a3b](https://tokendance.space/models/qwen3.5-35b-a3b)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.5-flash](https://tokendance.space/models/qwen3.5-flash)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.5-plus](https://tokendance.space/models/qwen3.5-plus)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.6-max-preview](https://tokendance.space/models/qwen3.6-max-preview)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.6-plus](https://tokendance.space/models/qwen3.6-plus)|text → text|openai:chat-completions|main, optimize|描述提及多模态，详情 architecture 仅 text；暂不开放视觉角色。|
|[qwen3.7-max](https://tokendance.space/models/qwen3.7-max)|text → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.7-plus](https://tokendance.space/models/qwen3.7-plus)|text,image,video → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.7-text-embedding](https://tokendance.space/models/qwen3.7-text-embedding)|text → embedding|openai:embeddings||embedding 输出无法映射图研现有功能；本次不扩展产品范围。|
|[qwen3.8-flash](https://tokendance.space/models/qwen3.8-flash)|text,image,video → text|openai:chat-completions, openai:responses, anthropic:messages|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.8-max](https://tokendance.space/models/qwen3.8-max)|text,image,video → text|openai:chat-completions, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[qwen3.8-max-0902](https://tokendance.space/models/qwen3.8-max-0902)|text,image,video → text|openai:chat-completions, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-2.0-code](https://tokendance.space/models/seed-2.0-code)|text,image,video → text|openai:chat-completions, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-2.0-lite](https://tokendance.space/models/seed-2.0-lite)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-2.0-mini](https://tokendance.space/models/seed-2.0-mini)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-2.0-pro](https://tokendance.space/models/seed-2.0-pro)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-2.1-pro](https://tokendance.space/models/seed-2.1-pro)|text,image,video → text|openai:chat-completions, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-2.1-turbo](https://tokendance.space/models/seed-2.1-turbo)|text,image,video → text|openai:chat-completions, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-evolving](https://tokendance.space/models/seed-evolving)|text,image,video → text|openai:chat-completions|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[seed-tts-2.0](https://tokendance.space/models/seed-tts-2.0)|text → audio|ark:tts, ark:tts_ws||audio 输出无法映射图研现有功能；本次不扩展产品范围。|
|[seedance-2.0](https://tokendance.space/models/seedance-2.0)|text,image,audio,video → video|seedance:generations||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[seedance-2.0-fast](https://tokendance.space/models/seedance-2.0-fast)|text,image,audio,video → video|seedance:generations||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[seedance-2.0-mini](https://tokendance.space/models/seedance-2.0-mini)|text,image,audio,video → video|seedance:generations||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[seedance-2.5](https://tokendance.space/models/seedance-2.5)|text,image,audio,video → video|seedance:generations||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[seedream-5.0-lite](https://tokendance.space/models/seedream-5.0-lite)|text,image → image|ark:image-generations, openai:image-generations|image, refine|按独立 Seedream profile 校验尺寸、图片与参数。|
|[seedream-5.0-pro](https://tokendance.space/models/seedream-5.0-pro)|text,image → image|ark:image-generations|image, refine|按独立 Seedream profile 校验尺寸、图片与参数。|
|[spark-x2.5-1.7b](https://tokendance.space/models/spark-x2.5-1.7b)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[spark-x2.5-4b](https://tokendance.space/models/spark-x2.5-4b)|text → text|openai:chat-completions, anthropic:messages|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[step-3.5-flash](https://tokendance.space/models/step-3.5-flash)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[step-3.7-flash](https://tokendance.space/models/step-3.7-flash)|text,image,video → text|openai:chat-completions, anthropic:messages, openai:responses|main, optimize, vision|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[unifuncs-s3](https://tokendance.space/models/unifuncs-s3)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[unifuncs-s3-pro](https://tokendance.space/models/unifuncs-s3-pro)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[unifuncs-u3](https://tokendance.space/models/unifuncs-u3)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[unifuncs-u3-pro](https://tokendance.space/models/unifuncs-u3-pro)|text → text|openai:chat-completions|main, optimize|仅发送已核对 Chat 字段；不继承其他渠道的思考/采样/结构化参数。|
|[unifuncs-web-reader](https://tokendance.space/models/unifuncs-web-reader)|text → text|unifuncs:web-reader||网页抓取接口；需要新增阅读工具与 URL 输入能力。|
|[unifuncs-web-search](https://tokendance.space/models/unifuncs-web-search)|text → text|unifuncs:web-search||网页搜索接口；需要新增搜索工具与结果引用处理。|
|[wan3.0-video](https://tokendance.space/models/wan3.0-video)|text,image,audio,video → video|wan3:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
|[wan3.0-video-prime](https://tokendance.space/models/wan3.0-video-prime)|text,image,audio,video → video|wan3:video-synthesis||video 输出无法映射图研现有功能；本次不扩展产品范围。|
