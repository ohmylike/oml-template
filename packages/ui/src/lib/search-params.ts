import { parseAsStringLiteral } from 'nuqs'
import { defaultStyleFlavorId, styleFlavorIds } from '../ui-matrix'

export const styleFlavorParser = parseAsStringLiteral(styleFlavorIds).withDefault(
  defaultStyleFlavorId,
)
