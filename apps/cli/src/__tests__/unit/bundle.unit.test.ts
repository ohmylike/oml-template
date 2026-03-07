import { describe, expect, it } from 'vitest'
import { createBundle, parseBundle } from '../../bundle'

describe('bundle contract', () => {
  it('creates a versioned JSON bundle', () => {
    const bundle = createBundle({
      service: 'oml-__SERVICE_NAME__',
      schema: {
        source: 'drizzle',
        tables: [],
      },
      data: {
        posts: [],
      },
    })

    expect(bundle).toMatchObject({
      formatVersion: 1,
      service: 'oml-__SERVICE_NAME__',
      schema: {
        source: 'drizzle',
      },
      data: {
        posts: [],
      },
    })
    expect(bundle.exportedAt).toEqual(expect.any(String))
  })

  it('rejects invalid row payloads', () => {
    expect(() =>
      parseBundle(
        JSON.stringify({
          formatVersion: 1,
          service: 'oml-__SERVICE_NAME__',
          exportedAt: '2026-03-08T00:00:00.000Z',
          schema: {
            source: 'drizzle',
            tables: [],
          },
          data: {
            posts: ['invalid'],
          },
        }),
      ),
    ).toThrow('data.posts[0] must be an object')
  })
})
