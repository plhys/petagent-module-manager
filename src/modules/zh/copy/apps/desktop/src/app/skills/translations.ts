/**
 * Bilingual Chinese-English display names for skills, categories, and descriptions.
 *
 * These mappings are intentionally independent of the active i18n locale so that
 * the skills page can always show both languages for the portable edition.
 */

export interface SkillTranslation {
  /** Chinese display name (primary). */
  cnName: string
  /** English display name (secondary, shown smaller). */
  enName?: string
  /** Chinese description shown in place of the English SKILL.md description. */
  cnDescription?: string
}

/** Category translations: key is the lower-case category folder name. */
export const skillCategoryTranslations: Record<string, SkillTranslation> = {

  "autonomous-ai-agents": {
    cnName: "AI 智能体",
    enName: "AI Agents",
  },
  "blockchain": {
    cnName: "区块链",
    enName: "Blockchain",
  },
  "communication": {
    cnName: "沟通协作",
    enName: "Communication",
  },
  "creative": {
    cnName: "创意生成",
    enName: "Creative",
  },
  "data-science": {
    cnName: "数据科学",
    enName: "Data Science",
  },
  "devops": {
    cnName: "运维开发",
    enName: "DevOps",
  },
  "dogfood": {
    cnName: "产品自测",
    enName: "Dogfood",
  },
  "email": {
    cnName: "邮件",
    enName: "Email",
  },
  "evolution": {
    cnName: "进化迭代",
    enName: "Evolution",
  },
  "finance": {
    cnName: "金融财务",
    enName: "Finance",
  },
  "gaming": {
    cnName: "游戏",
    enName: "Gaming",
  },
  "github": {
    cnName: "GitHub",
    enName: "GitHub",
  },
  "health": {
    cnName: "健康",
    enName: "Health",
  },
  "inference": {
    cnName: "推理生成",
    enName: "Inference",
  },
  "mcp": {
    cnName: "MCP 服务",
    enName: "MCP",
  },
  "media": {
    cnName: "媒体",
    enName: "Media",
  },
  "migration": {
    cnName: "迁移导入",
    enName: "Migration",
  },
  "mlops": {
    cnName: "MLOps",
    enName: "MLOps",
  },
  "note-taking": {
    cnName: "笔记记录",
    enName: "Note-Taking",
  },
  "productivity": {
    cnName: "效率工具",
    enName: "Productivity",
  },
  "red-teaming": {
    cnName: "红队测试",
    enName: "Red Teaming",
  },
  "research": {
    cnName: "研究搜索",
    enName: "Research",
  },
  "security": {
    cnName: "安全",
    enName: "Security",
  },
  "smart-home": {
    cnName: "智能家居",
    enName: "Smart Home",
  },
  "software-development": {
    cnName: "软件开发",
    enName: "Software Development",
  },
  "training": {
    cnName: "模型训练",
    enName: "Training",
  },
  "web-development": {
    cnName: "Web 开发",
    enName: "Web Development",
  },
}

/** Skill translations: key is the lower-case skill name/id. */
export const skillTranslations: Record<string, SkillTranslation> = {

  "1password": {
    cnName: "1Password 密码管理",
    enName: "1Password",
    cnDescription: "设置并使用 1Password CLI，安装、登录、读取与注入密钥。",
  },
  "3-statement-model": {
    cnName: "三表财务模型",
    enName: "3-Statement Model",
    cnDescription: "在 Excel 中构建联动的利润表、资产负债表、现金流量表模型。",
  },
  "adversarial-ux-test": {
    cnName: "对抗性 UX 测试",
    cnDescription: "扮演最难搞的用户，发现 UX 痛点并生成可执行工单。",
  },
  "agentmail": {
    cnName: "AgentMail 邮箱",
    cnDescription: "为 Agent 分配独立邮箱地址，自主收发邮件。",
  },
  "ai-safe-audit": {
    cnName: "AI 安全审计",
    enName: "AI Safe Audit",
    cnDescription: "构建、修改、审查或审计 AI 代理/智能体/LLM 系统，处理外部或不可信数据时触发，涵盖提示注入、工具投毒、越狱、RAG/向量库安全、MCP 服务器风险、敏感数据泄露、钱包耗尽等。",
  },
  "airtable": {
    cnName: "Airtable",
    enName: "Airtable",
    cnDescription: "通过 curl 使用 Airtable REST API：记录增删改查、过滤、upsert。",
  },
  "antigravity-cli": {
    cnName: "Antigravity CLI 管理",
    cnDescription: "操作 Antigravity CLI（agy）：插件、认证、沙箱。",
  },
  "architecture-diagram": {
    cnName: "架构图",
    enName: "Architecture Diagram",
    cnDescription: "生成暗色主题 SVG 架构/云/基础设施图，以 HTML 呈现。",
  },
  "ascii-art": {
    cnName: "ASCII 艺术",
    enName: "ASCII Art",
    cnDescription: "ASCII 艺术：pyfiglet、cowsay、boxes、图片转 ASCII。",
  },
  "ascii-video": {
    cnName: "ASCII 视频",
    enName: "ASCII Video",
    cnDescription: "将视频/音频转换为彩色 ASCII MP4/GIF。",
  },
  "axolotl": {
    cnName: "Axolotl 微调",
    cnDescription: "Axolotl：YAML 配置的大模型微调（LoRA、DPO、GRPO）。",
  },
  "baoyu-article-illustrator": {
    cnName: "暴雨文章配图",
    enName: "Baoyu Article Illustrator",
    cnDescription: "为文章生成类型、风格、配色统一的插图。",
  },
  "baoyu-comic": {
    cnName: "暴雨知识漫画",
    enName: "Baoyu Comic",
    cnDescription: "生成教育、传记、教程类知识漫画。",
  },
  "baoyu-infographic": {
    cnName: "暴雨信息图",
    enName: "Baoyu Infographic",
    cnDescription: "信息图：21 种版式 × 21 种风格（信息图、可视化）。",
  },
  "bioinformatics": {
    cnName: "生物信息学",
    cnDescription: "连接 400+ 生物信息学技能，涵盖基因组、转录组、单细胞、结构生物学等。",
  },
  "blackbox": {
    cnName: "Blackbox AI 编程代理",
    cnDescription: "将编码任务委托给 Blackbox AI CLI 代理，内置多模型评审并挑选最佳结果。",
  },
  "blender-mcp": {
    cnName: "Blender 3D 控制",
    enName: "Blender MCP",
    cnDescription: "通过 blender-mcp 插件直接控制 Blender，创建对象、材质、动画与 Python 脚本。",
  },
  "browser": {
    cnName: "浏览器自动化",
    cnDescription: "控制浏览器进行导航、点击、输入、滚动等操作。",
  },
  "canvas": {
    cnName: "Canvas LMS",
    cnDescription: "集成 Canvas LMS，获取课程与作业信息。",
  },
  "ccx-qoder-integration": {
    cnName: "CCX Qoder 集成",
    enName: "CCX Qoder Integration",
    cnDescription: "在 CCX Desktop 中将 Qoder Work CN 添加为受支持的代理平台。",
  },
  "chat-mode": {
    cnName: "闲聊模式",
    enName: "Chat Mode",
    cnDescription: "轻松愉快的闲聊模式，带 emoji 和语气词，少用工具多聊天。",
  },
  "chroma": {
    cnName: "Chroma 向量库",
    cnDescription: "开源向量数据库，支持嵌入存储、向量与全文检索。",
  },
  "clarify": {
    cnName: "澄清问题",
    cnDescription: "向用户提出澄清性问题。",
  },
  "claude-code": {
    cnName: "Claude Code",
    enName: "Claude Code",
    cnDescription: "将编码任务委托给 Claude Code CLI（功能、PR）。",
  },
  "claude-design": {
    cnName: "Claude 设计稿",
    enName: "Claude Design",
    cnDescription: "一次性 HTML 设计稿（落地页、演示稿、原型）。",
  },
  "clip": {
    cnName: "CLIP 视觉语言",
    cnDescription: "OpenAI CLIP 模型，实现零样本图像分类与图文匹配。",
  },
  "code-wiki": {
    cnName: "代码 Wiki",
    enName: "Code Wiki",
    cnDescription: "为任意代码库生成 Wiki 文档与 Mermaid 图表。",
  },
  "code_execution": {
    cnName: "代码执行",
    cnDescription: "执行代码片段。",
  },
  "codebase-inspection": {
    cnName: "代码库检查",
    enName: "Codebase Inspection",
    cnDescription: "用 pygount 检查代码库：代码行、语言、比例。",
  },
  "codex": {
    cnName: "OpenAI Codex",
    enName: "Codex",
    cnDescription: "将编码任务委托给 OpenAI Codex CLI（功能、PR）。",
  },
  "coding-agent-tools": {
    cnName: "AI 编程代理工具",
    enName: "Coding Agent Tools",
    cnDescription: "第三方 AI 编码代理工具知识（Qoder、Codex、Claude Code、OpenCode）：架构、协议、配置文件、BYOK 机制与 CCX 代理集成模式。",
  },
  "comfyui": {
    cnName: "ComfyUI",
    enName: "ComfyUI",
    cnDescription: "使用 ComfyUI 生成图像、视频与音频——安装、启动、管理节点/模型、参数注入运行工作流。",
  },
  "comps-analysis": {
    cnName: "可比公司分析",
    enName: "Comps Analysis",
    cnDescription: "在 Excel 中构建可比公司分析，含运营指标与估值倍数。",
  },
  "computer_use": {
    cnName: "Computer Use (macOS)",
    cnDescription: "通过 cua-driver 在 macOS 上进行后台桌面控制。",
  },
  "concept-diagrams": {
    cnName: "概念图示",
    enName: "Concept Diagrams",
    cnDescription: "生成扁平极简、支持明暗模式的 SVG 教学示意图。",
  },
  "context_engine": {
    cnName: "上下文引擎",
    cnDescription: "来自活动上下文引擎的运行时工具。",
  },
  "cronjob": {
    cnName: "定时任务",
    cnDescription: "创建/列出/更新/暂停/恢复/运行定时任务，可附加技能。",
  },
  "darwinian-evolver": {
    cnName: "达尔文进化优化",
    cnDescription: "用 Imbue 进化循环优化提示词、正则、SQL 或代码。",
  },
  "dcf-model": {
    cnName: "DCF 估值模型",
    enName: "DCF Model",
    cnDescription: "在 Excel 中构建机构级 DCF 估值模型，含情景与敏感性分析。",
  },
  "debugging-hermes-tui-commands": {
    cnName: "Hermes TUI 命令调试",
    enName: "Hermes TUI Debug",
    cnDescription: "调试 Hermes TUI 斜杠命令：Python、网关、Ink UI。",
  },
  "delegation": {
    cnName: "任务委托",
    cnDescription: "将任务委托给子代理。",
  },
  "design-md": {
    cnName: "DESIGN.md 规范",
    enName: "DESIGN.md",
    cnDescription: "编写、验证并导出 Google DESIGN.md Token 规范文件。",
  },
  "discord": {
    cnName: "Discord 参与",
    cnDescription: "读取消息、搜索成员、创建话题。",
  },
  "discord_admin": {
    cnName: "Discord 服务器管理",
    cnDescription: "管理 Discord 频道、角色、置顶与分配角色。",
  },
  "distributed-llm-pretraining-torchtitan": {
    cnName: "TorchTitan 分布式预训练",
    cnDescription: "使用 torchtitan 进行 PyTorch 原生分布式 LLM 预训练。",
  },
  "docker-management": {
    cnName: "Docker 管理",
    enName: "Docker Management",
    cnDescription: "管理容器、镜像、卷、网络与 Compose 堆栈。",
  },
  "domain-intel": {
    cnName: "域名情报",
    cnDescription: "被动域名侦察：子域名发现、SSL、WHOIS、DNS、域名可用性批量分析。",
  },
  "drug-discovery": {
    cnName: "药物发现",
    cnDescription: "药物发现工作流助手：搜索化合物、计算类药性、查询药物相互作用。",
  },
  "dspy": {
    cnName: "DSPy 提示优化",
    enName: "dspy",
    cnDescription: "声明式语言模型程序，自动优化提示词与 RAG 流水线。",
  },
  "duckduckgo-search": {
    cnName: "DuckDuckGo 搜索",
    enName: "DuckDuckGo Search",
    cnDescription: "免费的 DuckDuckGo 网页搜索，支持文本、新闻、图片、视频，无需 API Key。",
  },
  "evm": {
    cnName: "EVM 链查询",
    cnDescription: "只读 EVM 客户端：跨 8 条链的钱包、代币、Gas 查询。",
  },
  "evolution-analysis": {
    cnName: "进化分析",
    enName: "Evolution Analysis",
    cnDescription: "分析 Issue 与 PR 以排定实现优先级（仅 PRIVATE 模式）。",
  },
  "evolution-implementation": {
    cnName: "进化实现",
    enName: "Evolution Implementation",
    cnDescription: "实现选定的 Issue 并自我更新（仅 PRIVATE 模式）。",
  },
  "evolution-integration": {
    cnName: "进化集成",
    enName: "Evolution Integration",
    cnDescription: "将已通过 CI 的进化 PR 合并到 main 并自我更新（仅 PRIVATE 所有者）。",
  },
  "evolution-introspection": {
    cnName: "进化内省",
    enName: "Evolution Introspection",
    cnDescription: "分析代理与用户的真实会话，找出阻碍实际任务完成的因素，并转化为改进 Issue。",
  },
  "evolution-issues": {
    cnName: "进化 Issue",
    enName: "Evolution Issues",
    cnDescription: "基于研究发现创建 GitHub Issue 与 PR。",
  },
  "evolution-research": {
    cnName: "进化研究",
    enName: "Evolution Research",
    cnDescription: "研究其他 AI 代理、论文与趋势，为 Hermes Evolution 提供改进方向。",
  },
  "evolution-upstream-sync": {
    cnName: "上游同步",
    enName: "Upstream Sync",
    cnDescription: "与上游 Hermes Agent 同步并集成相关变更。",
  },
  "excalidraw": {
    cnName: "Excalidraw 手绘图",
    enName: "Excalidraw",
    cnDescription: "手绘风格 Excalidraw JSON 图（架构、流程、时序）。",
  },
  "excel-author": {
    cnName: "Excel 自动生成",
    enName: "Excel Author",
    cnDescription: "用 openpyxl 无头生成可审计的 Excel 工作簿。",
  },
  "faiss": {
    cnName: "FAISS 向量搜索",
    cnDescription: "Facebook 高效相似度搜索库，支持十亿级向量与 GPU 加速。",
  },
  "fastmcp": {
    cnName: "FastMCP 服务",
    cnDescription: "用 FastMCP 构建、测试、部署 MCP 服务器。",
  },
  "file": {
    cnName: "文件操作",
    cnDescription: "读取、写入、修改与搜索文件。",
  },
  "fine-tuning-with-trl": {
    cnName: "TRL 微调",
    cnDescription: "TRL：SFT、DPO、PPO、GRPO 与奖励建模的 RLHF 工具包。",
  },
  "fitness-nutrition": {
    cnName: "健身与营养",
    cnDescription: "制定训练计划、查询食物营养、计算 BMI/TDEE/宏量营养素。",
  },
  "gif-search": {
    cnName: "GIF 搜索",
    enName: "GIF Search",
    cnDescription: "通过 curl + jq 从 Tenor 搜索/下载 GIF。",
  },
  "github-auth": {
    cnName: "GitHub 认证",
    enName: "GitHub Auth",
    cnDescription: "GitHub 认证设置：HTTPS Token、SSH 密钥、gh CLI 登录。",
  },
  "github-code-review": {
    cnName: "GitHub 代码审查",
    enName: "GitHub Code Review",
    cnDescription: "审查 PR：diff、通过 gh 或 REST 添加行内评论。",
  },
  "github-issues": {
    cnName: "GitHub Issue",
    enName: "GitHub Issues",
    cnDescription: "通过 gh 或 REST 创建、分类、打标签、分配 GitHub Issue。",
  },
  "github-pr-workflow": {
    cnName: "GitHub PR 工作流",
    enName: "GitHub PR Workflow",
    cnDescription: "GitHub PR 全生命周期：分支、提交、打开、CI、合并。",
  },
  "github-repo-management": {
    cnName: "GitHub 仓库管理",
    enName: "GitHub Repo Management",
    cnDescription: "克隆/创建/fork 仓库；管理远程与发布。",
  },
  "gitnexus-explorer": {
    cnName: "GitNexus 代码探索",
    cnDescription: "用 GitNexus 索引代码库并提供交互式知识图谱与隧道访问。",
  },
  "godmode": {
    cnName: "GODMODE 越狱测试",
    enName: "godmode",
    cnDescription: "使用 Parseltongue、GODMODE、ULTRAPLINIAN 等方法进行越狱测试。",
  },
  "google-workspace": {
    cnName: "Google Workspace",
    enName: "Google Workspace",
    cnDescription: "通过 gws CLI 或 Python 使用 Gmail、Calendar、Drive、Docs、Sheets。",
  },
  "grok": {
    cnName: "xAI Grok 编程",
    cnDescription: "将编码工作委托给 xAI Grok Build CLI（功能、PR）。",
  },
  "guidance": {
    cnName: "Guidance 结构化输出",
    cnDescription: "用正则与语法约束控制 LLM 输出，保证 JSON/XML/代码合法。",
  },
  "heartmula": {
    cnName: "HeartMuLa 歌曲生成",
    enName: "HeartMuLa",
    cnDescription: "HeartMuLa：根据歌词 + 标签生成 Suno 风格歌曲。",
  },
  "here.now": {
    cnName: "here.now 静态站点",
    cnDescription: "发布静态站点到 here.now，并在云盘存储私有文件。",
  },
  "hermes-agent": {
    cnName: "Hermes Agent 本体",
    enName: "Hermes Agent",
    cnDescription: "配置、扩展或为 Hermes Agent 贡献代码。",
  },
  "hermes-agent-skill-authoring": {
    cnName: "Hermes 技能编写",
    enName: "Hermes Skill Authoring",
    cnDescription: "编写仓库内 SKILL.md：frontmatter、校验器、结构。",
  },
  "hermes-client-development": {
    cnName: "Hermes 客户端开发",
    enName: "Hermes Client Development",
    cnDescription: "为 Hermes Agent 构建自定义 GUI 客户端或 Shell：架构、集成模式与协议参考。",
  },
  "hermes-s6-container-supervision": {
    cnName: "Hermes s6 容器监管",
    enName: "hermes-s6-container-supervision",
    cnDescription: "修改、调试或扩展 Hermes Agent Docker 镜像内的 s6-overlay 监管树。",
  },
  "himalaya": {
    cnName: "Himalaya 邮件 CLI",
    enName: "Himalaya",
    cnDescription: "Himalaya CLI：终端中的 IMAP/SMTP 邮件。",
  },
  "homeassistant": {
    cnName: "Home Assistant",
    cnDescription: "智能家居设备控制。",
  },
  "honcho": {
    cnName: "Honcho 记忆管理",
    cnDescription: "配置并使用 Honcho 跨会话记忆、用户建模与上下文预算。",
  },
  "huggingface-accelerate": {
    cnName: "HuggingFace Accelerate",
    cnDescription: "统一的分布式训练启动接口，支持 DeepSpeed/FSDP/Megatron/DDP。",
  },
  "huggingface-hub": {
    cnName: "HuggingFace Hub",
    enName: "HuggingFace Hub",
    cnDescription: "HuggingFace hf CLI：搜索/下载/上传模型与数据集。",
  },
  "huggingface-tokenizers": {
    cnName: "HuggingFace Tokenizers",
    cnDescription: "高性能 Rust 分词器，支持 BPE/WordPiece/Unigram 与自定义词表训练。",
  },
  "humanizer": {
    cnName: "文本人性化",
    enName: "Humanizer",
    cnDescription: "去除 AI 腔，为文本加入真实人声。",
  },
  "hyperframes": {
    cnName: "HyperFrames 视频",
    enName: "HyperFrames",
    cnDescription: "用 HTML 创建视频合成、动画标题、字幕视频与音频可视化。",
  },
  "hyperliquid": {
    cnName: "Hyperliquid 市场数据",
    cnDescription: "Hyperliquid 行情、账户历史与交易回顾。",
  },
  "ideation": {
    cnName: "创意构思",
    enName: "Creative Ideation",
    cnDescription: "基于约束条件生成项目创意。",
  },
  "image_gen": {
    cnName: "图像生成",
    cnDescription: "根据文本或图像生成图片。",
  },
  "inference-sh-cli": {
    cnName: "inference.sh CLI",
    cnDescription: "通过 inference.sh CLI 运行 150+ AI 应用，包括生图、视频、LLM、搜索等。",
  },
  "instructor": {
    cnName: "Instructor 结构化提取",
    cnDescription: "用 Pydantic 验证从 LLM 响应中提取结构化数据并自动重试。",
  },
  "jupyter-live-kernel": {
    cnName: "Jupyter 实时内核",
    enName: "Jupyter Live Kernel",
    cnDescription: "通过实时 Jupyter 内核迭代运行 Python（hamelnb）。",
  },
  "kanban-codex-lane": {
    cnName: "看板 Codex 泳道",
    enName: "Kanban Codex Lane",
    cnDescription: "当 Hermes 看板工作线程想以独立实现泳道运行 Codex CLI 时使用，Hermes 保留任务生命周期、核对、测试与交接所有权。",
  },
  "kanban-video-orchestrator": {
    cnName: "看板视频编排",
    enName: "Kanban Video Orchestrator",
    cnDescription: "通过 Hermes 看板协调多智能体完成视频制作流水线。",
  },
  "lambda-labs-gpu-cloud": {
    cnName: "Lambda Labs GPU 云",
    cnDescription: "租用预留与按需 GPU 实例，用于 ML 训练与推理。",
  },
  "lbo-model": {
    cnName: "LBO 杠杆收购模型",
    enName: "LBO Model",
    cnDescription: "在 Excel 中构建杠杆收购模型，含资本结构、现金清盘与回报测算。",
  },
  "linear": {
    cnName: "Linear",
    enName: "Linear",
    cnDescription: "Linear：通过 GraphQL + curl 管理 Issue、项目与团队。",
  },
  "llama-cpp": {
    cnName: "llama.cpp 本地推理",
    enName: "llama.cpp",
    cnDescription: "llama.cpp 本地 GGUF 推理 + HF Hub 模型发现。",
  },
  "llava": {
    cnName: "LLaVA 视觉对话",
    cnDescription: "大型视觉语言助手，支持多轮图像对话与视觉问答。",
  },
  "manim-video": {
    cnName: "Manim 数学动画",
    enName: "Manim Video",
    cnDescription: "Manim CE 动画：3Blue1Brown 风格的数学/算法视频。",
  },
  "maps": {
    cnName: "地图服务",
    enName: "Maps",
    cnDescription: "通过 OpenStreetMap/OSRM 进行地理编码、POI、路线、时区查询。",
  },
  "mcp-server-authoring": {
    cnName: "MCP 服务器编写",
    enName: "MCP Server Authoring",
    cnDescription: "将 Python 模块打包为可 pip 安装的 MCP 服务器，通过 stdio 测试并集成到 Hermes Agent 原生 MCP 客户端。",
  },
  "mcporter": {
    cnName: "MCPorter",
    cnDescription: "用 mcporter CLI 列出、配置、认证与调用 MCP 服务器/工具。",
  },
  "meme-generation": {
    cnName: "表情包生成",
    enName: "Meme Generation",
    cnDescription: "选择模板并叠加文字，生成真正的 PNG 表情包。",
  },
  "memento-flashcards": {
    cnName: "Memento 记忆卡片",
    cnDescription: "间隔重复闪卡系统，支持从文本生成卡片、自由回答评分与测验。",
  },
  "memory": {
    cnName: "记忆",
    cnDescription: "跨会话持久记忆。",
  },
  "merger-model": {
    cnName: "并购模型",
    enName: "Merger Model",
    cnDescription: "在 Excel 中构建并购增厚/稀释模型与协同效应测算。",
  },
  "messaging": {
    cnName: "跨平台消息",
    cnDescription: "发送跨平台消息。",
  },
  "minecraft-modpack-server": {
    cnName: "Minecraft 模组服务器",
    cnDescription: "托管 CurseForge / Modrinth 模组服务器。",
  },
  "moa": {
    cnName: "智能体混合",
    cnDescription: "多智能体混合（Mixture of Agents）。",
  },
  "modal-serverless-gpu": {
    cnName: "Modal 无服务器 GPU",
    cnDescription: "无服务器 GPU 云平台，按需运行 ML 工作负载并自动扩缩容。",
  },
  "nano-pdf": {
    cnName: "nano-pdf 编辑",
    enName: "nano-pdf",
    cnDescription: "通过 nano-pdf CLI 编辑 PDF 文本/错字/标题（自然语言提示）。",
  },
  "native-mcp": {
    cnName: "原生 MCP",
    enName: "Native MCP",
    cnDescription: "MCP 客户端：连接服务器、注册工具（stdio/HTTP）。",
  },
  "nemo-curator": {
    cnName: "NeMo Curator 数据策展",
    cnDescription: "GPU 加速的 LLM 训练数据清洗、去重、质量过滤与 PII 脱敏。",
  },
  "neuroskill-bci": {
    cnName: "NeuroSkill BCI",
    cnDescription: "连接 NeuroSkill 脑机接口，将实时认知与情绪状态融入回复。",
  },
  "node-inspect-debugger": {
    cnName: "Node 调试器",
    enName: "Node Inspect",
    cnDescription: "通过 --inspect + Chrome DevTools Protocol CLI 调试 Node.js。",
  },
  "notion": {
    cnName: "Notion",
    enName: "Notion",
    cnDescription: "Notion API + ntn CLI：页面、数据库、Markdown、Workers。",
  },
  "obliteratus": {
    cnName: "Obliteratus 去拒绝化",
    cnDescription: "用 diff-in-means 方法消除 LLM 拒绝回答的倾向。",
  },
  "obsidian": {
    cnName: "Obsidian 笔记",
    enName: "Obsidian",
    cnDescription: "在 Obsidian 库中读取、搜索、创建与编辑笔记。",
  },
  "ocr-and-documents": {
    cnName: "OCR 与文档",
    enName: "OCR & Documents",
    cnDescription: "从 PDF/扫描件提取文本（pymupdf、marker-pdf）。",
  },
  "one-three-one-rule": {
    cnName: "1-3-1 决策框架",
    cnDescription: "用 1-3-1 结构化框架做技术方案与权衡分析：问题、三个选项、明确推荐。",
  },
  "openclaw-migration": {
    cnName: "OpenClaw 迁移",
    cnDescription: "将 OpenClaw 的自定义配置迁移到 Hermes Agent。",
  },
  "opencode": {
    cnName: "OpenCode",
    enName: "OpenCode",
    cnDescription: "将编码任务委托给 OpenCode CLI（功能、PR 审查）。",
  },
  "openhands": {
    cnName: "OpenHands CLI",
    cnDescription: "通过 OpenHands CLI 委托编码任务（支持多模型与 LiteLLM）。",
  },
  "openhue": {
    cnName: "Philips Hue",
    enName: "OpenHue",
    cnDescription: "通过 OpenHue CLI 控制 Philips Hue 灯光、场景与房间。",
  },
  "optimizing-attention-flash": {
    cnName: "Flash Attention 优化",
    cnDescription: "用 Flash Attention 优化 Transformer 注意力，提速并降低显存占用。",
  },
  "osint-investigation": {
    cnName: "OSINT 开源调查",
    cnDescription: "公开记录开源调查框架，跨 SEC、制裁、法院、维基百科等源进行实体解析。",
  },
  "oss-forensics": {
    cnName: "开源取证",
    cnDescription: "GitHub 仓库的供应链调查、证据恢复与取证分析。",
  },
  "outlines": {
    cnName: "Outlines 结构化生成",
    cnDescription: "Outlines：结构化 JSON/正则/Pydantic LLM 生成。",
  },
  "p5js": {
    cnName: "p5.js 创意编程",
    enName: "p5.js",
    cnDescription: "p5.js 草图：生成艺术、着色器、交互、3D。",
  },
  "page-agent": {
    cnName: "Page Agent 网页助手",
    enName: "Page Agent",
    cnDescription: "将阿里巴巴 page-agent 嵌入自己的 Web 应用，让终端用户用自然语言操作页面。",
  },
  "parallel-cli": {
    cnName: "Parallel CLI",
    cnDescription: "Parallel CLI 技能：网页搜索、提取、深度研究、富化与监控。",
  },
  "peft-fine-tuning": {
    cnName: "PEFT 高效微调",
    cnDescription: "使用 LoRA/QLoRA 等参数高效微调方法微调大模型。",
  },
  "pinecone": {
    cnName: "Pinecone 向量库",
    cnDescription: "托管向量数据库，支持混合搜索、元数据过滤与低延迟查询。",
  },
  "pinggy-tunnel": {
    cnName: "Pinggy 内网穿透",
    enName: "Pinggy Tunnel",
    cnDescription: "通过 SSH 零安装建立本地主机隧道。",
  },
  "pixel-art": {
    cnName: "像素画",
    enName: "Pixel Art",
    cnDescription: "使用 NES、Game Boy、PICO-8 等复古调色板生成像素艺术。",
  },
  "plan": {
    cnName: "计划模式",
    enName: "Plan Mode",
    cnDescription: "计划模式：生成可执行的 Markdown 计划到 .hermes/plans/，不执行。任务粒度小、路径精确、代码完整。",
  },
  "pokemon-player": {
    cnName: "宝可梦自动玩家",
    enName: "pokemon-player",
    cnDescription: "通过无头模拟器与内存读取自动游玩宝可梦。",
  },
  "popular-web-designs": {
    cnName: "流行网页设计",
    enName: "Popular Web Designs",
    cnDescription: "54 套真实设计系统（Stripe、Linear、Vercel）的 HTML/CSS。",
  },
  "powerpoint": {
    cnName: "PowerPoint",
    enName: "PowerPoint",
    cnDescription: "创建、读取、编辑 .pptx 演示文稿、幻灯片、备注与模板。",
  },
  "pptx-author": {
    cnName: "PPT 自动生成",
    enName: "PPTX Author",
    cnDescription: "用 python-pptx 无头生成 PowerPoint 演示文稿。",
  },
  "pretext": {
    cnName: "Pretext 文本艺术",
    enName: "Pretext",
    cnDescription: "使用 @chenglou/pretext 构建创意浏览器演示：无 DOM 文本布局、ASCII 艺术、排版流、文本几何与生成艺术。",
  },
  "pytorch-fsdp": {
    cnName: "PyTorch FSDP",
    cnDescription: "PyTorch FSDP 全分片数据并行训练指导。",
  },
  "pytorch-lightning": {
    cnName: "PyTorch Lightning",
    cnDescription: "高层 PyTorch 训练框架，内置分布式与回调系统。",
  },
  "qdrant-vector-search": {
    cnName: "Qdrant 向量搜索",
    cnDescription: "高性能向量相似度搜索引擎，适用于 RAG 与语义检索。",
  },
  "qmd": {
    cnName: "qmd 本地搜索",
    cnDescription: "使用 qmd 本地混合检索引擎搜索笔记、文档与会议转录。",
  },
  "requesting-code-review": {
    cnName: "提交前审查",
    enName: "Requesting Code Review",
    cnDescription: "提交前审查：安全扫描、质量门禁、自动修复。",
  },
  "rest-graphql-debug": {
    cnName: "API 调试",
    enName: "REST/GraphQL Debug",
    cnDescription: "调试 REST/GraphQL API：状态码、认证、Schema 与复现。",
  },
  "scrapling": {
    cnName: "Scrapling 网页抓取",
    cnDescription: "网页抓取、隐身浏览器自动化、Cloudflare 绕过与爬虫。",
  },
  "searxng-search": {
    cnName: "SearXNG 聚合搜索",
    enName: "SearXNG Search",
    cnDescription: "免费元搜索，聚合 70+ 搜索引擎结果，无需 API Key。",
  },
  "segment-anything-model": {
    cnName: "SAM 图像分割",
    enName: "Segment Anything",
    cnDescription: "SAM：通过点、框、掩码进行零样本图像分割。",
  },
  "session_search": {
    cnName: "会话搜索",
    cnDescription: "搜索历史对话。",
  },
  "sherlock": {
    cnName: "Sherlock 社交账号搜索",
    cnDescription: "在 400+ 社交网络中按用户名搜索账号。",
  },
  "shop-app": {
    cnName: "Shop.app",
    cnDescription: "Shop.app 商品搜索、订单跟踪、退货与复购。",
  },
  "shopify": {
    cnName: "Shopify 管理",
    cnDescription: "通过 GraphQL API 管理 Shopify 商品、订单、客户与库存。",
  },
  "simplify-code": {
    cnName: "简化代码",
    enName: "Simplify Code",
    cnDescription: "三代理并行清理最近代码变更。",
  },
  "simpo-training": {
    cnName: "SimPO 偏好优化",
    cnDescription: "无需参考模型的简单偏好优化，用于 LLM 对齐。",
  },
  "siyuan": {
    cnName: "思源笔记",
    cnDescription: "通过 API 在思源笔记中搜索、读取、创建和管理文档块。",
  },
  "sketch": {
    cnName: "快速原型草图",
    enName: "Sketch",
    cnDescription: "一次性 HTML 原型：2-3 个设计变体供比较。",
  },
  "skills": {
    cnName: "技能管理",
    cnDescription: "列出、查看与管理技能。",
  },
  "slime-rl-training": {
    cnName: "Slime RL 训练",
    cnDescription: "基于 Megatron+SGLang 的 LLM 强化学习后训练框架。",
  },
  "solana": {
    cnName: "Solana 链查询",
    cnDescription: "查询 Solana 链上数据与美元计价，支持余额、代币组合、NFT、巨鲸检测。",
  },
  "songsee": {
    cnName: "Songsee 音频分析",
    enName: "Songsee",
    cnDescription: "通过 CLI 提取音频频谱/特征（mel、chroma、MFCC）。",
  },
  "songwriting-and-ai-music": {
    cnName: "歌曲创作与 AI 音乐",
    enName: "Songwriting & AI Music",
    cnDescription: "歌曲创作技巧与 Suno AI 音乐提示词。",
  },
  "sparse-autoencoder-training": {
    cnName: "SAELens 稀疏自编码器",
    cnDescription: "训练与分析稀疏自编码器，分解神经网络激活为可解释特征。",
  },
  "spike": {
    cnName: "技术预研",
    enName: "Spike",
    cnDescription: "在正式构建前做一次性实验验证想法。",
  },
  "spotify": {
    cnName: "Spotify",
    enName: "spotify",
    cnDescription: "播放、搜索、播放列表与曲库管理。",
  },
  "stable-diffusion-image-generation": {
    cnName: "Stable Diffusion 生图",
    cnDescription: "通过 HuggingFace Diffusers 使用 Stable Diffusion 进行文生图与图生图。",
  },
  "stocks": {
    cnName: "股票行情",
    cnDescription: "通过 Yahoo 获取股票报价、历史数据、对比与加密货币信息。",
  },
  "subagent-driven-development": {
    cnName: "子代理驱动开发",
    enName: "subagent-driven-development",
    cnDescription: "通过 delegate_task 子代理执行计划并做两阶段评审。",
  },
  "systematic-debugging": {
    cnName: "系统化调试",
    enName: "Systematic Debugging",
    cnDescription: "四阶段根因调试：先理解 bug 再修复。",
  },
  "teams-meeting-pipeline": {
    cnName: "Teams 会议流水线",
    enName: "Teams Meeting Pipeline",
    cnDescription: "通过 Hermes CLI 操作 Teams 会议总结流水线：总结会议、检查流水线状态、重放任务、管理 Microsoft Graph 订阅。",
  },
  "telephony": {
    cnName: "电话与短信",
    cnDescription: "配置 Twilio 号码，收发短信、拨打电话并通过 AI 进行外呼。",
  },
  "tensorrt-llm": {
    cnName: "TensorRT-LLM 推理优化",
    cnDescription: "用 NVIDIA TensorRT 优化 LLM 推理，实现高吞吐与低延迟。",
  },
  "terminal": {
    cnName: "终端与进程",
    cnDescription: "使用终端命令与管理进程。",
  },
  "test-driven-development": {
    cnName: "测试驱动开发",
    enName: "TDD",
    cnDescription: "TDD：坚持 RED-GREEN-REFACTOR，先写测试再写代码。",
  },
  "todo": {
    cnName: "任务规划",
    cnDescription: "待办事项与任务规划。",
  },
  "touchdesigner-mcp": {
    cnName: "TouchDesigner MCP",
    enName: "TouchDesigner MCP",
    cnDescription: "通过 twozero MCP 控制运行中的 TouchDesigner：创建算子、设置参数、连接、执行 Python、构建实时视觉。",
  },
  "tts": {
    cnName: "文本转语音",
    cnDescription: "将文本转换为语音。",
  },
  "unsloth": {
    cnName: "Unsloth 微调加速",
    cnDescription: "Unsloth：2-5 倍更快的 LoRA/QLoRA 微调，显存占用更低。",
  },
  "video": {
    cnName: "视频分析",
    cnDescription: "分析视频内容（需支持视频的模型）。",
  },
  "video_gen": {
    cnName: "视频生成",
    cnDescription: "文本/图像生成视频。",
  },
  "vision": {
    cnName: "视觉与图像分析",
    cnDescription: "分析图像内容。",
  },
  "watchers": {
    cnName: "监控观察者",
    cnDescription: "轮询 RSS、JSON API 与 GitHub，并做去重。",
  },
  "web": {
    cnName: "网页搜索与抓取",
    cnDescription: "网络搜索与网页内容提取。",
  },
  "web-pentest": {
    cnName: "Web 渗透测试",
    cnDescription: "授权 Web 应用渗透测试：侦察、漏洞分析、验证性利用与专业报告。",
  },
  "webhook-subscriptions": {
    cnName: "Webhook 订阅",
    enName: "Webhook Subscriptions",
    cnDescription: "Webhook 订阅：事件驱动的代理运行。",
  },
  "weights-and-biases": {
    cnName: "Weights & Biases",
    enName: "W&B",
    cnDescription: "W&B：记录 ML 实验、超参搜索、模型注册与看板。",
  },
  "whisper": {
    cnName: "Whisper 语音识别",
    cnDescription: "OpenAI 通用语音识别模型，支持 99 种语言与转录翻译。",
  },
  "work-mode": {
    cnName: "工作模式",
    enName: "Work Mode",
    cnDescription: "专业高效的工作模式，精炼直接、结果导向。",
  },
  "writing-plans": {
    cnName: "编写计划",
    enName: "Writing Plans",
    cnDescription: "编写实现计划：小任务、精确路径、代码。",
  },
  "x_search": {
    cnName: "X (Twitter) 搜索",
    cnDescription: "搜索 X（Twitter）内容（需 xAI OAuth 或 XAI_API_KEY）。",
  },
  "youtube-content": {
    cnName: "YouTube 内容",
    enName: "YouTube Content",
    cnDescription: "将 YouTube 字幕转为摘要、线索、博客。",
  },
  "yuanbao": {
    cnName: "腾讯元宝",
    enName: "yuanbao",
    cnDescription: "获取群信息、成员查询与私信。",
  },
}

const FALLBACK_CATEGORY: SkillTranslation = { cnName: '其他', enName: 'Other' }

/** Get the bilingual display translation for a category key. */
export function getCategoryTranslation(category: string | undefined | null): SkillTranslation {
  if (!category) {
    return FALLBACK_CATEGORY
  }

  const key = category.toLowerCase()
  return skillCategoryTranslations[key] ?? { cnName: prettyNameFallback(category), enName: category }
}

/** Get the bilingual display translation for a skill name. */
export function getSkillTranslation(name: string | undefined | null): SkillTranslation | undefined {
  if (!name) {
    return undefined
  }

  return skillTranslations[name.toLowerCase()]
}

/** Build a bilingual label string like "中文名 · EnglishName". */
export function bilingualLabel(translation: SkillTranslation | undefined, original: string): string {
  if (!translation) {
    return original
  }

  const en = translation.enName ?? original
  if (translation.cnName === en) {
    return translation.cnName
  }

  return `${translation.cnName} · ${en}`
}

/** Pick a Chinese description if available, otherwise fall back to the original. */
export function bilingualDescription(
  translation: SkillTranslation | undefined,
  original: string | undefined | null
): string {
  if (translation?.cnDescription) {
    return translation.cnDescription
  }

  return original?.trim() || ''
}

/** Split a bilingual label into its Chinese and English parts. */
export function getBilingualParts(
  translation: SkillTranslation | undefined,
  original: string
): { cnName: string; enName: string; hasTranslation: boolean } {
  if (!translation) {
    return { cnName: original, enName: original, hasTranslation: false }
  }

  const en = translation.enName ?? original
  if (translation.cnName === en) {
    return { cnName: translation.cnName, enName: '', hasTranslation: false }
  }

  return { cnName: translation.cnName, enName: en, hasTranslation: true }
}

/** Convert snake/kebab-case to a readable fallback name. */
function prettyNameFallback(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
