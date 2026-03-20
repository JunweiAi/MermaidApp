# AI 贴图 / 视觉：常见问题

若模型回复「无法识别图片」「看不到图片」等，常见原因如下。

## 1. 模型必须支持视觉（多模态）

- **OpenAI**：`gpt-4o`、`gpt-4o-mini`、`gpt-4-turbo` 等支持 `chat/completions` 里的 `image_url`。
- **不要用**纯文本模型（如部分 `gpt-3.5-turbo`、仅文本的本地模型），否则上游会忽略图片或胡乱回答。

请在 **AI Settings** 里把 **Model** 换成官方文档标明支持 **Vision** 的型号。

## 2. 第三方「OpenAI 兼容」网关

很多自建网关 **只转发文本**，不会把 `content: [{ type: "image_url", ... }]` 传给真实多模态模型，表现为「模型说看不见图」。

- 向网关提供方确认：**是否支持** OpenAI Chat Completions 的 **vision / multimodal**。
- 若只支持文本，需要换网关或直连官方 API。

## 3. 请求体过大被截断

图片以 **base64 data URL** 放在 JSON 里，体积会膨胀。若网关、Nginx、Serverless 有 **请求体大小限制**，整段 JSON 可能被截断，模型收不到完整图片字段。

- 应用内已对 **过大的粘贴图** 做浏览器端压缩（见 `lib/compress-image-data-url.ts`）。
- 若仍失败，可换更小的截图或检查部署环境的 **body size limit**。

## 4. 实现细节（本仓库）

- 请求里使用 OpenAI 风格的 `image_url`，并带 **`detail: "high"`**（有利于截图、小字、流程图），见 `lib/ai/build-user-content.ts`。
- 仅允许 `data:image/...` 形式的 URL，见 `lib/ai/normalize-conversation.ts`。

若以上都排除仍失败，请抓一条 **上游 API 的原始错误响应**（或联系网关方）继续排查。
