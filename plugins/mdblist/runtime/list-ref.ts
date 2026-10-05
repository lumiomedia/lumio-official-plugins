/** En inklistrad MDBList-länk eller ett numeriskt id. */
export function parseListRef(input: string): { kind: 'id'; id: string } | { kind: 'slug'; user: string; slug: string } | null {
  const text = input.trim()
  if (/^\d+$/.test(text)) return { kind: 'id', id: text }
  const match = text.match(/^(?:https?:\/\/)?(?:www\.)?mdblist\.com\/lists\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/)
  return match ? { kind: 'slug', user: match[1], slug: match[2] } : null
}
