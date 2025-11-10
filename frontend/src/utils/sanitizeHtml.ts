const allowed = new Set(['A', 'CODE', 'I', 'STRONG'])
const allowedAttrs: Record<string, Set<string>> = {
  A: new Set(['href', 'title'])
}

const safeLink = (href: string) => /^(https?:\/\/|mailto:)/i.test(href)

const traverse = (node: Node) => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement

    if (!allowed.has(el.tagName)) {
      const parent = el.parentNode
      if (parent) {
        const children = Array.from(el.childNodes)
        for (const child of children) {
          parent.insertBefore(child, el)
          traverse(child)
        }
        parent.removeChild(el)
        return
      }
    } else {
      const attrs = allowedAttrs[el.tagName] ?? new Set<string>()
      for (const attr of Array.from(el.attributes)) {
        if (!attrs.has(attr.name.toLowerCase())) el.removeAttribute(attr.name)
      }

      if (el.tagName === 'A') {
        const href = el.getAttribute('href') ?? ''
        if (!safeLink(href)) {
          el.removeAttribute('href')
        }
        const title = el.getAttribute('title')
        if (title && title.length > 255) el.setAttribute('title', title.slice(0, 255))
        el.setAttribute('rel', 'nofollow noopener noreferrer')
        el.setAttribute('target', '_blank')
      }
    }
  }

  for (const child of Array.from(node.childNodes)) traverse(child)
}

export const sanitizeHtml = (value: string) => {
  const template = document.createElement('template')
  template.innerHTML = value
  traverse(template.content)
  return template.innerHTML
}
