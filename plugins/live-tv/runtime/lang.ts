/**
 * Språkval för pluginets egna texter. Värden kan ge en av de fem inbyggda
 * koderna (en, sv, de, fr, es) eller en egen `x-…`-kod; allt utom de fem
 * faller tillbaka på engelska.
 */
export type TextLang = 'en' | 'sv' | 'de' | 'fr' | 'es'

export interface LocalizedText { en: string; sv: string; de: string; fr: string; es: string }

const LOCALES: Record<TextLang, string> = { en: 'en-GB', sv: 'sv-SE', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' }

/** Den inbyggda språkkoden för `lang`, annars 'en'. */
export function textLang(lang: string | undefined): TextLang {
  return lang === 'sv' || lang === 'de' || lang === 'fr' || lang === 'es' ? lang : 'en'
}

/** Intl-locale för språkkoden (en-GB för allt okänt). */
export function localeFor(lang: string | undefined): string {
  return LOCALES[textLang(lang)]
}

/** Väljer texten för språket; engelska för allt annat. */
export function pickText(lang: string | undefined, text: LocalizedText): string {
  return text[textLang(lang)] ?? text.en
}
