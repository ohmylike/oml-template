import { describe, expect, it } from 'vitest'
import { defaultStyleFlavorId } from '../ui-matrix'
import { styleFlavorParser } from './search-params'

describe('styleFlavorParser', () => {
  it('falls back to the template preview default when the placeholder is unresolved', () => {
    expect(defaultStyleFlavorId).toBe('neutral')
    expect(styleFlavorParser.parseServerSide(undefined)).toBe('neutral')
    expect(styleFlavorParser.parseServerSide('unknown')).toBe('neutral')
  })

  it('accepts each supported style override', () => {
    expect(styleFlavorParser.parseServerSide('terra')).toBe('terra')
    expect(styleFlavorParser.parseServerSide('neutral')).toBe('neutral')
    expect(styleFlavorParser.parseServerSide('vivid')).toBe('vivid')
  })
})
