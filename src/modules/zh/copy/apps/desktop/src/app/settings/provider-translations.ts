/**
 * Bilingual Chinese-English display for provider names, API-key options,
 * OAuth providers and individual env-var labels used in Settings → Tools & Keys.
 *
 * Titles are shown as "English · 中文" so documentation/tutorials that refer to
 * the English name still match, while descriptions are shown in Chinese only.
 */

export interface ProviderTranslation {
  /** Original English display name. */
  enName: string
  /** Chinese display name (shown after the English name). */
  cnName: string
  /** Chinese description shown in place of the English description. */
  cnDescription?: string
}

/** Provider API-key groups shown in Settings → Tools & Keys → API keys. */
export const providerGroupTranslations: Record<string, ProviderTranslation> = {
  'Nous Portal': {
    enName: 'Nous Portal',
    cnName: 'Nous 门户',
    cnDescription: 'Hosted Hermes 与 Nous 自研模型托管服务。'
  },
  'OpenRouter': {
    enName: 'OpenRouter',
    cnName: 'OpenRouter 模型聚合',
    cnDescription: '聚合数百种前沿模型的统一 API 入口。'
  },
  'Anthropic': {
    enName: 'Anthropic',
    cnName: 'Anthropic Claude',
    cnDescription: 'Claude API 访问（Sonnet、Opus、Haiku）。'
  },
  'xAI': {
    enName: 'xAI',
    cnName: 'xAI Grok',
    cnDescription: 'Grok 模型（SuperGrok / Premium+ 建议用 OAuth）。'
  },
  'Gemini': {
    enName: 'Gemini',
    cnName: 'Google Gemini',
    cnDescription: 'Google AI Studio（Gemini 1.5 / 2.0 / 2.5）。'
  },
  'DeepSeek': {
    enName: 'DeepSeek',
    cnName: 'DeepSeek',
    cnDescription: 'DeepSeek 官方 API（V3.x、R1）。'
  },
  'DashScope (Qwen)': {
    enName: 'DashScope (Qwen)',
    cnName: '阿里云 DashScope（通义千问）',
    cnDescription: '阿里云 DashScope —— 通义千问及多厂商模型。'
  },
  'GLM / Z.AI': {
    enName: 'GLM / Z.AI',
    cnName: '智谱 GLM / Z.AI',
    cnDescription: '智谱 GLM-4.6 与 Z.AI 托管端点。'
  },
  'Kimi / Moonshot': {
    enName: 'Kimi / Moonshot',
    cnName: '月之暗面 Kimi',
    cnDescription: 'Moonshot Kimi K2 / 编程端点。'
  },
  'Kimi (China)': {
    enName: 'Kimi (China)',
    cnName: '月之暗面 Kimi（国内端点）',
    cnDescription: 'Moonshot 国内端点。'
  },
  'MiniMax': {
    enName: 'MiniMax',
    cnName: 'MiniMax 国际版',
    cnDescription: 'MiniMax-M2 与海螺国际端点。'
  },
  'MiniMax (China)': {
    enName: 'MiniMax (China)',
    cnName: 'MiniMax（国内端点）',
    cnDescription: 'MiniMax 中国大陆端点。'
  },
  'Hugging Face': {
    enName: 'Hugging Face',
    cnName: 'Hugging Face',
    cnDescription: 'Inference Providers —— 通过 router.huggingface.co 调用 20+ 开源模型。'
  },
  'OpenCode Zen': {
    enName: 'OpenCode Zen',
    cnName: 'OpenCode Zen',
    cnDescription: '按量付费的精选编程模型接入。'
  },
  'OpenCode Go': {
    enName: 'OpenCode Go',
    cnName: 'OpenCode Go',
    cnDescription: '每月 10 美元的开放编程模型订阅。'
  },
  'NVIDIA NIM': {
    enName: 'NVIDIA NIM',
    cnName: 'NVIDIA NIM',
    cnDescription: 'build.nvidia.com 或本地 NIM 端点。'
  },
  'Ollama Cloud': {
    enName: 'Ollama Cloud',
    cnName: 'Ollama Cloud',
    cnDescription: 'ollama.com 云托管开源模型。'
  },
  'LM Studio': {
    enName: 'LM Studio',
    cnName: 'LM Studio',
    cnDescription: '本地 LM Studio 服务器（OpenAI 兼容）。'
  },
  'StepFun': {
    enName: 'StepFun',
    cnName: '阶跃星辰 StepFun',
    cnDescription: '阶跃星辰 Step 系列编程模型。'
  },
  'Xiaomi MiMo': {
    enName: 'Xiaomi MiMo',
    cnName: '小米 MiMo',
    cnDescription: 'MiMo-V2.5 与小米自研模型。'
  },
  'Arcee AI': {
    enName: 'Arcee AI',
    cnName: 'Arcee AI',
    cnDescription: 'Arcee 托管的小型与中型模型。'
  },
  'GMI Cloud': {
    enName: 'GMI Cloud',
    cnName: 'GMI Cloud',
    cnDescription: 'GMI Cloud GPU + 模型推理服务。'
  },
  'Azure Foundry': {
    enName: 'Azure Foundry',
    cnName: 'Azure AI Foundry',
    cnDescription: 'Azure AI Foundry 自定义端点（OpenAI / Anthropic 兼容）。'
  },
  'AWS Bedrock': {
    enName: 'AWS Bedrock',
    cnName: 'AWS Bedrock',
    cnDescription: '通过 AWS 配置文件 + 区域进行身份验证。'
  },
  'Other': {
    enName: 'Other',
    cnName: '其他',
    cnDescription: '未归类的密钥或配置项。'
  }
}

/** OAuth providers shown in Settings → Tools & Keys → Accounts. */
export const oauthProviderTranslations: Record<string, ProviderTranslation> = {
  nous: {
    enName: 'Nous Portal',
    cnName: 'Nous 门户',
    cnDescription: 'Nous 托管模型与订阅入口。'
  },
  'openai-codex': {
    enName: 'OpenAI OAuth (ChatGPT)',
    cnName: 'OpenAI OAuth（ChatGPT）',
    cnDescription: '使用 OpenAI / ChatGPT 账户登录授权。'
  },
  'minimax-oauth': {
    enName: 'MiniMax',
    cnName: 'MiniMax',
    cnDescription: 'MiniMax 账户 OAuth 登录。'
  },
  'qwen-oauth': {
    enName: 'Qwen Code',
    cnName: '通义千问 Code',
    cnDescription: '通义千问 Code OAuth 登录。'
  },
  'xai-oauth': {
    enName: 'xAI Grok',
    cnName: 'xAI Grok',
    cnDescription: 'xAI Grok OAuth 登录（SuperGrok / Premium+）。'
  },
  anthropic: {
    enName: 'Anthropic API Key',
    cnName: 'Anthropic API 密钥',
    cnDescription: '使用 Anthropic API Key 访问 Claude。'
  },
  'claude-code': {
    enName: 'Anthropic OAuth: Required Extra Usage Credits to Use Subscription',
    cnName: 'Anthropic OAuth：需额外使用额度才能使用订阅',
    cnDescription: 'Anthropic OAuth 订阅路径，需要账户具备额外使用额度。'
  }
}

/** Curated API-key options shown in the onboarding/settings key picker. */
export const apiKeyOptionTranslations: Record<string, ProviderTranslation> = {
  'custom-openai': {
    enName: 'Custom API (OpenAI compatible)',
    cnName: '自定义 API（OpenAI 兼容）',
    cnDescription: '通过名称、基础 URL 和可选 API Key 添加任意 OpenAI 兼容端点。'
  },
  openrouter: {
    enName: 'OpenRouter',
    cnName: 'OpenRouter 模型聚合',
    cnDescription: '聚合数百种前沿模型的统一 API 入口。'
  },
  openai: {
    enName: 'OpenAI',
    cnName: 'OpenAI',
    cnDescription: 'OpenAI 官方 API（GPT-4o、o1 等）。'
  },
  gemini: {
    enName: 'Google Gemini',
    cnName: 'Google Gemini',
    cnDescription: 'Google AI Studio Gemini API。'
  },
  xai: {
    enName: 'xAI Grok',
    cnName: 'xAI Grok',
    cnDescription: 'xAI Grok API，支持 OAuth 或 API Key。'
  },
  local: {
    enName: 'Local / custom endpoint',
    cnName: '本地 / 自定义端点',
    cnDescription: '本地 vLLM、Ollama 或其他 OpenAI 兼容端点。'
  }
}

/** Bilingual labels for individual env vars shown inside provider cards and Tools & Keys rows. */
export const envVarLabelTranslations: Record<string, string> = {
  // ── Provider API keys / endpoints ──
  NOUS_API_KEY: 'Nous API 密钥',
  NOUS_BASE_URL: 'Nous Portal Base URL',
  OPENROUTER_API_KEY: 'OpenRouter API 密钥',
  ANTHROPIC_API_KEY: 'Anthropic API 密钥',
  ANTHROPIC_TOKEN: 'Anthropic Token',
  XAI_API_KEY: 'xAI API 密钥',
  GOOGLE_API_KEY: 'Google API 密钥',
  GEMINI_API_KEY: 'Gemini API 密钥',
  GEMINI_BASE_URL: 'Gemini Base URL',
  XAI_BASE_URL: 'xAI Base URL',
  NVIDIA_API_KEY: 'NVIDIA API 密钥',
  NVIDIA_BASE_URL: 'NVIDIA Base URL',
  LM_API_KEY: 'LM Studio API 密钥',
  LM_BASE_URL: 'LM Studio Base URL',
  GLM_API_KEY: 'GLM API 密钥',
  ZAI_API_KEY: 'Z.AI API 密钥',
  Z_AI_API_KEY: 'Z.AI API 密钥',
  GLM_BASE_URL: 'GLM Base URL',
  KIMI_API_KEY: 'Kimi API 密钥',
  KIMI_BASE_URL: 'Kimi Base URL',
  KIMI_CN_API_KEY: 'Kimi 国内 API 密钥',
  STEPFUN_API_KEY: 'StepFun API 密钥',
  STEPFUN_BASE_URL: 'StepFun Base URL',
  ARCEEAI_API_KEY: 'Arcee AI API 密钥',
  ARCEE_API_KEY: 'Arcee API 密钥',
  ARCEE_BASE_URL: 'Arcee Base URL',
  GMI_API_KEY: 'GMI Cloud API 密钥',
  GMI_BASE_URL: 'GMI Cloud Base URL',
  MINIMAX_API_KEY: 'MiniMax API 密钥',
  MINIMAX_BASE_URL: 'MiniMax Base URL',
  MINIMAX_CN_API_KEY: 'MiniMax 国内 API 密钥',
  MINIMAX_CN_BASE_URL: 'MiniMax 国内 Base URL',
  DEEPSEEK_API_KEY: 'DeepSeek API 密钥',
  DEEPSEEK_BASE_URL: 'DeepSeek Base URL',
  DASHSCOPE_API_KEY: 'DashScope API 密钥',
  DASHSCOPE_BASE_URL: 'DashScope Base URL',
  HERMES_QWEN_API_KEY: '通义千问 API 密钥',
  HERMES_QWEN_BASE_URL: '通义千问 Base URL',
  HERMES_GEMINI_CLIENT_ID: 'Gemini OAuth 客户端 ID',
  HERMES_GEMINI_CLIENT_SECRET: 'Gemini OAuth 客户端密钥',
  HERMES_GEMINI_PROJECT_ID: 'Gemini GCP 项目 ID',
  OPENCODE_ZEN_API_KEY: 'OpenCode Zen API 密钥',
  OPENCODE_ZEN_BASE_URL: 'OpenCode Zen Base URL',
  OPENCODE_GO_API_KEY: 'OpenCode Go API 密钥',
  OPENCODE_GO_BASE_URL: 'OpenCode Go Base URL',
  HF_API_KEY: 'Hugging Face API 密钥',
  HF_TOKEN: 'Hugging Face Token',
  HF_BASE_URL: 'Hugging Face Base URL',
  OLLAMA_API_KEY: 'Ollama Cloud API 密钥',
  OLLAMA_BASE_URL: 'Ollama Cloud Base URL',
  XIAOMI_API_KEY: '小米 MiMo API 密钥',
  XIAOMI_BASE_URL: '小米 MiMo Base URL',
  AWS_ACCESS_KEY_ID: 'AWS 访问密钥 ID',
  AWS_SECRET_ACCESS_KEY: 'AWS 访问密钥',
  AWS_REGION: 'AWS 区域',
  AWS_PROFILE: 'AWS 配置文件',
  AZURE_FOUNDRY_API_KEY: 'Azure Foundry API 密钥',
  AZURE_FOUNDRY_BASE_URL: 'Azure Foundry Base URL',
  OPENAI_API_KEY: 'OpenAI API 密钥',
  OPENAI_BASE_URL: 'OpenAI Base URL',
  CUSTOM_OPENAI_API: '自定义 OpenAI API',

  // ── Tool API keys / endpoints ──
  EXA_API_KEY: 'Exa API 密钥',
  PARALLEL_API_KEY: 'Parallel API 密钥',
  FIRECRAWL_API_KEY: 'Firecrawl API 密钥',
  FIRECRAWL_API_URL: 'Firecrawl API URL',
  FIRECRAWL_GATEWAY_URL: 'Firecrawl Gateway URL',
  TOOL_GATEWAY_DOMAIN: '工具网关域名后缀',
  TOOL_GATEWAY_SCHEME: '工具网关 URL 协议',
  TOOL_GATEWAY_USER_TOKEN: '工具网关用户令牌',
  TAVILY_API_KEY: 'Tavily API 密钥',
  SEARXNG_URL: 'SearXNG URL',
  BRAVE_SEARCH_API_KEY: 'Brave Search API 密钥',
  BROWSERBASE_API_KEY: 'Browserbase API 密钥',
  BROWSERBASE_PROJECT_ID: 'Browserbase 项目 ID',
  BROWSER_USE_API_KEY: 'Browser Use API 密钥',
  FIRECRAWL_BROWSER_TTL: 'Firecrawl 浏览器会话 TTL',
  AGENT_BROWSER_ENGINE: 'Agent 浏览器引擎',
  CAMOFOX_URL: 'Camofox 服务器 URL',
  FAL_KEY: 'FAL API 密钥',
  KREA_API_KEY: 'Krea API 密钥',
  VOICE_TOOLS_OPENAI_KEY: '语音工具 OpenAI 密钥',
  ELEVENLABS_API_KEY: 'ElevenLabs API 密钥',
  MISTRAL_API_KEY: 'Mistral API 密钥',
  GEMINI_API_KEY_TTS: 'Gemini TTS API 密钥',
  GITHUB_TOKEN: 'GitHub Token',

  // ── Bundled skill keys ──
  NOTION_API_KEY: 'Notion API 密钥',
  LINEAR_API_KEY: 'Linear API 密钥',
  AIRTABLE_API_KEY: 'Airtable API 密钥',
  TENOR_API_KEY: 'Tenor API 密钥',

  // ── Honcho memory ──
  HONCHO_API_KEY: 'Honcho API 密钥',
  HONCHO_BASE_URL: 'Honcho Base URL',

  // ── Langfuse observability ──
  HERMES_LANGFUSE_PUBLIC_KEY: 'Langfuse Public Key',
  HERMES_LANGFUSE_SECRET_KEY: 'Langfuse Secret Key',
  HERMES_LANGFUSE_BASE_URL: 'Langfuse 服务器 URL',

  // ── Gateway / messaging-wide knobs (shown in Keys → Settings) ──
  GATEWAY_ALLOW_ALL_USERS: '网关允许所有用户',
  GATEWAY_PROXY_URL: '网关代理 URL',
  GATEWAY_PROXY_KEY: '网关代理密钥',
  GATEWAY_PROXY: '网关代理开关',
  API_SERVER_ENABLED: 'API 服务器开关',
  API_SERVER_KEY: 'API 服务器认证密钥',
  API_SERVER_PORT: 'API 服务器端口',
  API_SERVER_HOST: 'API 服务器主机',
  API_SERVER_MODEL_NAME: 'API 服务器模型名称',
  WEBHOOK_ENABLED: 'Webhook 开关',
  WEBHOOK_PORT: 'Webhook 端口',
  WEBHOOK_SECRET: 'Webhook 密钥',

  // ── Agent settings ──
  SUDO_PASSWORD: 'Sudo 密码',
  HERMES_PREFILL_MESSAGES_FILE: '预填充消息文件路径',
  HERMES_EPHEMERAL_SYSTEM_PROMPT: '临时系统提示词',
  HERMES_SIMPLEX_TEXT_BATCH_DELAY: 'Simplex 文本批处理延迟',

  // ── Messaging / home-automation fallbacks (kept for completeness) ──
  HASS_TOKEN: 'Home Assistant 长期访问令牌',
  HASS_URL: 'Home Assistant URL',
  SPOTIFY_CLIENT_ID: 'Spotify 客户端 ID',
  SPOTIFY_CLIENT_SECRET: 'Spotify 客户端密钥',
  LANGFUSE_PUBLIC_KEY: 'Langfuse Public Key',
  LANGFUSE_SECRET_KEY: 'Langfuse Secret Key'
}

/** Chinese descriptions for individual env vars (replaces English descriptions in the UI). */
export const envVarDescriptionTranslations: Record<string, string> = {
  // Gateway / messaging
  GATEWAY_ALLOW_ALL_USERS: '是否允许所有用户与消息机器人交互（true/false）。默认 false，未在允许列表中的用户将被拒绝。',
  GATEWAY_PROXY_URL: '远程 Hermes API 服务器地址（代理模式）。设置后网关只处理平台 I/O，实际代理工作转发到远程服务器。',
  GATEWAY_PROXY_KEY: '远程 Hermes API 服务器的 Bearer Token，必须与远程主机的 API_SERVER_KEY 一致。',
  GATEWAY_PROXY: '是否启用网关代理模式（true/false）。',

  // API server
  API_SERVER_ENABLED: '是否启用 OpenAI 兼容 API 服务器（true/false）。开启后 Open WebUI、LobeChat 等前端可以接入。',
  API_SERVER_KEY: 'API 服务器的 Bearer Token。启用 API 服务器时必填，否则服务器拒绝启动。',
  API_SERVER_PORT: 'API 服务器监听端口（默认 8642）。',
  API_SERVER_HOST: 'API 服务器绑定地址（默认 127.0.0.1）。即使绑定回环地址也需要设置 API_SERVER_KEY。',
  API_SERVER_MODEL_NAME: 'API 服务器在 /v1/models 中宣传的模型名称。默认使用当前配置名称。',

  // Webhook
  WEBHOOK_ENABLED: '是否启用 Webhook 平台适配器，用于接收 GitHub、GitLab 等事件（true/false）。',
  WEBHOOK_PORT: 'Webhook HTTP 服务器端口（默认 8644）。',
  WEBHOOK_SECRET: '全局 Webhook 签名验证 HMAC 密钥（可在 config.yaml 中按路由覆盖）。',

  // Agent settings
  SUDO_PASSWORD: '终端命令需要 root 权限时使用的 sudo 密码；设为空字符串则尝试无密码执行。',
  HERMES_PREFILL_MESSAGES_FILE: '用于 few-shot 引导的 JSON 预填充消息文件路径。',
  HERMES_EPHEMERAL_SYSTEM_PROMPT: '在 API 调用时注入的临时系统提示词，不会持久化到会话历史。',
  HERMES_SIMPLEX_TEXT_BATCH_DELAY: 'Simplex 平台文本消息批处理延迟（秒）。',

  // Tools
  EXA_API_KEY: 'Exa AI 原生搜索与内容提取 API 密钥。',
  BRAVE_SEARCH_API_KEY: 'Brave Search API 订阅 Token（免费档每月 2,000 次查询）。',
  BROWSERBASE_API_KEY: 'Browserbase 云端浏览器 API 密钥（可选，本地浏览器无需设置）。',
  BROWSERBASE_PROJECT_ID: 'Browserbase 项目 ID（仅在使用云端浏览器时需要）。',
  BROWSER_USE_API_KEY: 'Browser Use 云端浏览器 API 密钥（可选，本地浏览器无需设置）。',
  AGENT_BROWSER_ENGINE: '本地浏览器引擎：auto（默认 Chrome）、lightpanda（更快，无截图）、chrome。',
  CAMOFOX_URL: 'Camofox 反检测浏览器服务器地址（例如 http://localhost:9377）。',
  FIRECRAWL_API_KEY: 'Firecrawl 网页搜索与抓取 API 密钥。',
  FIRECRAWL_API_URL: 'Firecrawl 自建实例的 API URL（留空使用官方云）。',
  FAL_KEY: 'FAL 图像与视频生成 API 密钥。',
  ELEVENLABS_API_KEY: 'ElevenLabs 高级文本转语音与 Scribe 语音转写 API 密钥。',
  VOICE_TOOLS_OPENAI_KEY: '用于 Whisper 语音转写和 OpenAI TTS 的 OpenAI API 密钥。',
  MISTRAL_API_KEY: 'Mistral Voxtral TTS 与语音转写 API 密钥。',
  GITHUB_TOKEN: 'Skills Hub 使用的 GitHub Token（更高 API 限额、可发布 Skill）。',
  HONCHO_API_KEY: 'Honcho AI 原生持久化记忆 API 密钥。',
  HERMES_LANGFUSE_PUBLIC_KEY: 'Langfuse 项目 Public Key（pk-lf-...）。',
  HERMES_LANGFUSE_SECRET_KEY: 'Langfuse 项目 Secret Key（sk-lf-...）。',
  HERMES_LANGFUSE_BASE_URL: 'Langfuse 服务器 URL（默认 https://cloud.langfuse.com）。'
}

/**
 * Build a bilingual label like "English Name · 中文名".
 * The original English title is always preserved; the Chinese part is appended
 * as a translation/explanation.
 */
export function bilingualProviderLabel(translation: ProviderTranslation | undefined, original: string): string {
  if (!translation?.cnName || translation.cnName === original) {
    return original
  }

  return `${original} · ${translation.cnName}`
}

/** Get Chinese description if available, otherwise fall back. */
export function providerDescription(
  translation: ProviderTranslation | undefined,
  original: string | undefined | null
): string {
  if (translation?.cnDescription) {
    return translation.cnDescription
  }

  return original?.trim() || ''
}

/** Look up a provider group translation by its English name. */
export function getProviderGroupTranslation(name: string | undefined | null): ProviderTranslation | undefined {
  if (!name) {
    return undefined
  }

  return providerGroupTranslations[name]
}

/** Look up an OAuth provider translation by provider id. */
export function getOAuthProviderTranslation(id: string | undefined | null): ProviderTranslation | undefined {
  if (!id) {
    return undefined
  }

  return oauthProviderTranslations[id]
}

/** Look up an API-key option translation by option id. */
export function getApiKeyOptionTranslation(id: string | undefined | null): ProviderTranslation | undefined {
  if (!id) {
    return undefined
  }

  return apiKeyOptionTranslations[id]
}

/** Look up a Chinese label for a raw env-var key. */
export function getEnvVarLabelTranslation(key: string | undefined | null): string | undefined {
  if (!key) {
    return undefined
  }

  return envVarLabelTranslations[key]
}

/** Look up a Chinese description for a raw env-var key. */
export function getEnvVarDescriptionTranslation(key: string | undefined | null): string | undefined {
  if (!key) {
    return undefined
  }

  return envVarDescriptionTranslations[key]
}
