#!/usr/bin/env node
// Augment the auto-extracted messages/<locale>.json with the small UI strings
// the Next.js front-end adds on top of the legacy i18n bundles.

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = resolve(__dirname, '..', 'messages')

const ADDITIONS = {
  fr: {
    nav: {
      mainNav: 'Navigation principale',
      openMenu: 'Ouvrir le menu',
    },
    lang: {
      label: 'Langue',
    },
    fr: {
      favorite: 'Favori',
      showMore: 'Voir plus ({n})',
    },
    pw: {
      reqLen: '8 caractères minimum',
      reqDigit: 'Au moins un chiffre',
      reqSpecial: 'Au moins un caractère spécial',
    },
    a11y: {
      skip: 'Aller au contenu',
    },
  },
  en: {
    nav: {
      mainNav: 'Main navigation',
      openMenu: 'Open menu',
    },
    lang: {
      label: 'Language',
    },
    fr: {
      favorite: 'Favorite',
      showMore: 'Show more ({n})',
    },
    pw: {
      reqLen: '8 characters minimum',
      reqDigit: 'At least one digit',
      reqSpecial: 'At least one special character',
    },
    a11y: {
      skip: 'Skip to content',
    },
  },
  es: {
    nav: {
      mainNav: 'Navegación principal',
      openMenu: 'Abrir menú',
    },
    lang: {
      label: 'Idioma',
    },
    fr: {
      favorite: 'Favorito',
      showMore: 'Ver más ({n})',
    },
    pw: {
      reqLen: '8 caracteres mínimo',
      reqDigit: 'Al menos un dígito',
      reqSpecial: 'Al menos un carácter especial',
    },
  },
  pt: {
    nav: {
      mainNav: 'Navegação principal',
      openMenu: 'Abrir menu',
    },
    lang: {
      label: 'Idioma',
    },
    fr: {
      favorite: 'Favorito',
      showMore: 'Ver mais ({n})',
    },
    pw: {
      reqLen: '8 caracteres no mínimo',
      reqDigit: 'Pelo menos um dígito',
      reqSpecial: 'Pelo menos um caractere especial',
    },
  },
  de: {
    nav: {
      mainNav: 'Hauptnavigation',
      openMenu: 'Menü öffnen',
    },
    lang: {
      label: 'Sprache',
    },
    fr: {
      favorite: 'Favorit',
      showMore: 'Mehr anzeigen ({n})',
    },
    pw: {
      reqLen: 'Mindestens 8 Zeichen',
      reqDigit: 'Mindestens eine Ziffer',
      reqSpecial: 'Mindestens ein Sonderzeichen',
    },
  },
  it: {
    nav: {
      mainNav: 'Navigazione principale',
      openMenu: 'Apri menu',
    },
    lang: {
      label: 'Lingua',
    },
    fr: {
      favorite: 'Preferito',
      showMore: 'Mostra altro ({n})',
    },
    pw: {
      reqLen: 'Almeno 8 caratteri',
      reqDigit: 'Almeno una cifra',
      reqSpecial: 'Almeno un carattere speciale',
    },
  },
  ru: {
    nav: {
      mainNav: 'Главная навигация',
      openMenu: 'Открыть меню',
    },
    lang: {
      label: 'Язык',
    },
    fr: {
      favorite: 'Избранное',
      showMore: 'Показать ещё ({n})',
    },
    pw: {
      reqLen: 'Минимум 8 символов',
      reqDigit: 'Хотя бы одна цифра',
      reqSpecial: 'Хотя бы один спецсимвол',
    },
  },
  zh: {
    nav: {
      mainNav: '主导航',
      openMenu: '打开菜单',
    },
    lang: {
      label: '语言',
    },
    fr: {
      favorite: '收藏',
      showMore: '查看更多 ({n})',
    },
    pw: {
      reqLen: '至少 8 个字符',
      reqDigit: '至少一位数字',
      reqSpecial: '至少一个特殊字符',
    },
  },
  ja: {
    nav: {
      mainNav: 'メインナビゲーション',
      openMenu: 'メニューを開く',
    },
    lang: {
      label: '言語',
    },
    fr: {
      favorite: 'お気に入り',
      showMore: 'もっと見る ({n})',
    },
    pw: {
      reqLen: '8文字以上',
      reqDigit: '数字を1つ以上',
      reqSpecial: '特殊文字を1つ以上',
    },
  },
  ar: {
    nav: {
      mainNav: 'التنقل الرئيسي',
      openMenu: 'فتح القائمة',
    },
    lang: {
      label: 'اللغة',
    },
    fr: {
      favorite: 'مفضلة',
      showMore: 'عرض المزيد ({n})',
    },
    pw: {
      reqLen: '8 أحرف على الأقل',
      reqDigit: 'رقم واحد على الأقل',
      reqSpecial: 'رمز خاص واحد على الأقل',
    },
  },
}

function deepMerge(target, additions) {
  for (const [key, value] of Object.entries(additions)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value)
    } else {
      target[key] = value
    }
  }
  return target
}

async function main() {
  const files = (await readdir(MESSAGES_DIR)).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    const code = file.replace('.json', '')
    const additions = ADDITIONS[code]
    if (!additions) {
      console.warn(`! no additions for ${code}`)
      continue
    }
    const path = join(MESSAGES_DIR, file)
    const data = JSON.parse(await readFile(path, 'utf8'))
    deepMerge(data, additions)
    await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    console.log(`✓ ${code}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
