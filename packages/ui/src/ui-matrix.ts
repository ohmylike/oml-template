export const styleFlavorIds = [
  /* style-flavor:terra:start */
  'terra',
  /* style-flavor:terra:end */
  /* style-flavor:neutral:start */
  'neutral',
  /* style-flavor:neutral:end */
  /* style-flavor:vivid:start */
  'vivid',
  /* style-flavor:vivid:end */
] as const

export type StyleFlavorId = (typeof styleFlavorIds)[number]

export interface StyleFlavorMeta {
  label: string
  description: string
}

export const defaultStyleFlavorId = '__DEFAULT_STYLE_FLAVOR__' as StyleFlavorId

export const styleFlavorMeta = {
  /* style-flavor:terra:start */
  terra: {
    label: 'Terra',
    description: '暖色寄りの default style flavor。',
  },
  /* style-flavor:terra:end */
  /* style-flavor:neutral:start */
  neutral: {
    label: 'Neutral',
    description: 'zinc base の実務寄り flavor。',
  },
  /* style-flavor:neutral:end */
  /* style-flavor:vivid:start */
  vivid: {
    label: 'Vivid',
    description: '強い accent を持つ high-contrast flavor。',
  },
  /* style-flavor:vivid:end */
} as const satisfies Record<StyleFlavorId, StyleFlavorMeta>
