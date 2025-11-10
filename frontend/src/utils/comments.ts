import type { CommentNode, CommentRecord, SortDirection, SortField } from '../types/comment'

export const buildTree = (records: CommentRecord[]): CommentNode[] => {
  const map = new Map<number, CommentNode>()
  const roots: CommentNode[] = []

  for (const record of records) {
    map.set(record.id, { ...record, replies: [] })
  }

  for (const node of map.values()) {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

const compare = (field: SortField, direction: SortDirection) => {
  const multiplier = direction === 'asc' ? 1 : -1
  return (a: CommentNode, b: CommentNode) => {
    if (field === 'created_at') {
      const t1 = new Date(a.created_at).getTime()
      const t2 = new Date(b.created_at).getTime()
      return (t1 - t2) * multiplier
    }

    const v1 = a[field].toLowerCase()
    const v2 = b[field].toLowerCase()
    if (v1 === v2) return 0
    return v1 > v2 ? multiplier : -multiplier
  }
}

const sortReplies = (branch: CommentNode[]): CommentNode[] =>
  branch
    .map((node) => ({ ...node, replies: sortReplies(node.replies) }))
    .sort(compare('created_at', 'asc'))

export const sortTree = (
  nodes: CommentNode[],
  field: SortField,
  direction: SortDirection
): CommentNode[] =>
  nodes
    .map((node) => ({ ...node, replies: sortReplies(node.replies) }))
    .sort(compare(field, direction))
