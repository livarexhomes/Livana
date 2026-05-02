/**
 * Tests for validateImageFiles (landlord-properties.ts).
 *
 * Covers the MIME-type allowlist and per-file size cap introduced to prevent
 * arbitrary file uploads (stored XSS via SVG/HTML, server-side path confusion).
 */
import { describe, it, expect } from 'vitest'
import { validateImageFiles } from './landlord-properties'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string, sizeBytes: number): File {
  // File constructor accepts an array of BlobPart — use a typed ArrayBuffer
  // so the size is accurate without allocating real memory.
  const buf = new ArrayBuffer(sizeBytes)
  return new File([buf], name, { type })
}

const MB = 1024 * 1024

// ---------------------------------------------------------------------------
// Empty / zero-size files are skipped
// ---------------------------------------------------------------------------

describe('validateImageFiles — zero-size files', () => {
  it('ignores files with size 0', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 0)
    expect(validateImageFiles([file])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Allowed MIME types
// ---------------------------------------------------------------------------

describe('validateImageFiles — allowed types', () => {
  const allowed: [string, string][] = [
    ['photo.jpg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
    ['photo.gif', 'image/gif'],
  ]

  for (const [name, type] of allowed) {
    it(`accepts ${type}`, () => {
      const file = makeFile(name, type, 1 * MB)
      expect(validateImageFiles([file])).toHaveLength(0)
    })
  }
})

// ---------------------------------------------------------------------------
// Blocked MIME types
// ---------------------------------------------------------------------------

describe('validateImageFiles — blocked types', () => {
  const blocked: [string, string][] = [
    ['shell.php', 'application/x-php'],
    ['page.html', 'text/html'],
    ['script.svg', 'image/svg+xml'],   // SVG can contain <script> tags
    ['data.json', 'application/json'],
    ['binary.exe', 'application/octet-stream'],
    ['doc.pdf', 'application/pdf'],
  ]

  for (const [name, type] of blocked) {
    it(`rejects ${type} (${name})`, () => {
      const file = makeFile(name, type, 1 * MB)
      const errors = validateImageFiles([file])
      expect(errors).toHaveLength(1)
      expect(errors[0].index).toBe(0)
      expect(errors[0].reason).toMatch(/not an allowed image type/)
    })
  }
})

// ---------------------------------------------------------------------------
// Size cap (5 MB)
// ---------------------------------------------------------------------------

describe('validateImageFiles — size cap', () => {
  it('accepts a file exactly at the 5 MB limit', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 5 * MB)
    expect(validateImageFiles([file])).toHaveLength(0)
  })

  it('rejects a file one byte over the 5 MB limit', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 5 * MB + 1)
    const errors = validateImageFiles([file])
    expect(errors).toHaveLength(1)
    expect(errors[0].reason).toMatch(/5 MB/)
  })

  it('rejects a 10 MB file', () => {
    const file = makeFile('big.png', 'image/png', 10 * MB)
    const errors = validateImageFiles([file])
    expect(errors).toHaveLength(1)
    expect(errors[0].index).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Multiple files — all errors reported
// ---------------------------------------------------------------------------

describe('validateImageFiles — multiple files', () => {
  it('returns no errors when all files are valid', () => {
    const files = [
      makeFile('a.jpg', 'image/jpeg', 1 * MB),
      makeFile('b.png', 'image/png', 2 * MB),
      makeFile('c.webp', 'image/webp', 500 * 1024),
    ]
    expect(validateImageFiles(files)).toHaveLength(0)
  })

  it('reports errors for each invalid file with correct indices', () => {
    const files = [
      makeFile('ok.jpg', 'image/jpeg', 1 * MB),          // index 0 — valid
      makeFile('bad.svg', 'image/svg+xml', 1 * MB),       // index 1 — wrong type
      makeFile('ok.png', 'image/png', 1 * MB),            // index 2 — valid
      makeFile('huge.webp', 'image/webp', 10 * MB),       // index 3 — too large
    ]
    const errors = validateImageFiles(files)
    expect(errors).toHaveLength(2)
    expect(errors[0].index).toBe(1)
    expect(errors[1].index).toBe(3)
  })

  it('skips zero-size entries mixed with valid files', () => {
    const files = [
      makeFile('empty.jpg', 'image/jpeg', 0),
      makeFile('real.png', 'image/png', 1 * MB),
    ]
    expect(validateImageFiles(files)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Filename extension is irrelevant — MIME type is authoritative
// ---------------------------------------------------------------------------

describe('validateImageFiles — filename cannot bypass MIME check', () => {
  it('rejects a file named .jpg but with SVG MIME type', () => {
    // Attacker renames shell.svg to photo.jpg — MIME type still betrays it
    const file = makeFile('photo.jpg', 'image/svg+xml', 1 * MB)
    const errors = validateImageFiles([file])
    expect(errors).toHaveLength(1)
    expect(errors[0].reason).toMatch(/not an allowed image type/)
  })

  it('accepts a file named .svg but with jpeg MIME type', () => {
    // Unusual but valid — MIME wins
    const file = makeFile('photo.svg', 'image/jpeg', 1 * MB)
    expect(validateImageFiles([file])).toHaveLength(0)
  })
})
