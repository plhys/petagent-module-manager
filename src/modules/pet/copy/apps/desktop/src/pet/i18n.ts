const zh: Record<string, string> = {
  'common.thinking': '思考中...',
}
const en: Record<string, string> = {
  'common.thinking': 'Thinking...',
}
const locales: Record<string, Record<string, string>> = { zh, en }

let _lang = 'zh'

export function setLang(lang: string) { if (locales[lang]) _lang = lang }

export function t(key: string): string {
  return locales[_lang]?.[key] || locales.zh[key] || key
}
