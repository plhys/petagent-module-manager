/**
 * PetAgent 语义锚点适配器 — Hermes v0.16.x
 *
 * 这是 PetAgent 中**唯一依赖 Hermes 内部 DOM 结构**的文件。
 * 当 Hermes 更新导致选择器失效时，只需修改此文件中的映射即可。
 *
 * 架构：
 *   定制清单 (customizations.json) → 引用语义锚点名称
 *          ↓
 *   适配器 (本文件) → 将锚点名称映射为 CSS 选择器
 *          ↓
 *   引擎 (petagent-engine.js) → 根据选择器执行实际的 CSS/DOM 操作
 */

window.__petagent_anchors = {
  // ─────────────────────────────────────────────────────────
  // 全局
  // ─────────────────────────────────────────────────────────
  /** 主题根元素（<html> 上的 data-hermes-theme 属性） */
  themeRoot: '[data-hermes-theme="petagent"]',
  /** 暗色模式的 CSS 类名（附加在 <html> 上） */
  darkModeClass: '.dark',

  // ─────────────────────────────────────────────────────────
  // 欢迎页（Intro / Landing）
  // ─────────────────────────────────────────────────────────
  /** 欢迎页容器 */
  welcomeContainer: '[data-slot="aui_intro"]',
  /** 欢迎页内容包裹层（第一个直接子 div） */
  welcomeInner: '[data-slot="aui_intro"] > div',
  /** Hermes 原生欢迎页内容 */
  welcomeHermes: '.intro-hermes',
  /** PetAgent 替换的欢迎页内容 */
  welcomePetagent: '.intro-petagent',
  /** PetAgent 欢迎页中的副标题 <p> 元素 */
  welcomePetagentText: '.intro-petagent p',

  // ─────────────────────────────────────────────────────────
  // 侧边栏
  // ─────────────────────────────────────────────────────────
  /** 侧边栏根元素 */
  sidebar: '.sidebar',
  /** 侧边栏内容区（collapsible="none" 模式下用 content 而非 inner） */
  sidebarContent: '[data-slot="sidebar-content"]',

  // ─────────────────────────────────────────────────────────
  // 用户消息气泡
  // ─────────────────────────────────────────────────────────
  /** 用户消息根元素 */
  userMessageRoot: '[data-slot="aui_user-message-root"]',
  /** 用户消息气泡外层（Tailwind 容器） */
  userMessageBubble: '.composer-human-message',
  /** 用户消息文本内层 */
  userMessageText: '[data-slot="aui_user-inline-text"]',
  /** 用户消息中的图片 */
  userImage: [
    '.composer-human-message [data-slot="aui_directive-image"] img',
    '.composer-human-message [data-slot="aui_embedded-image"] img',
    '.composer-human-message [data-slot="aui_zoomable-image"] img'
  ].join(', '),

  // ─────────────────────────────────────────────────────────
  // AI 回复
  // ─────────────────────────────────────────────────────────
  /** AI 消息内容区 */
  assistantMessageContent: '[data-slot="aui_assistant-message-content"]',
  /** 工具调用块 */
  toolBlock: '[data-slot="tool-block"]',
  /** 思考过程折叠块 */
  thinkingDisclosure: '[data-slot="aui_thinking-disclosure"]',

  // ─────────────────────────────────────────────────────────
  // 输入框
  // ─────────────────────────────────────────────────────────
  /** 输入框容器 */
  composer: '[data-slot="aui_composer"]',

  // ─────────────────────────────────────────────────────────
  // 版本检测（用于自动选择适配器）
  // ─────────────────────────────────────────────────────────
  /** 版本标记属性（HTML 上的 hermes 版本） */
  versionAttr: 'data-hermes-version'
};
