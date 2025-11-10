export interface CommentRecord {
  id: number
  user_name: string
  email: string
  home_page: string | null
  text: string
  created_at: string
  parent: number | null
}

export interface CommentNode extends CommentRecord {
  replies: CommentNode[]
}

export type SortField = 'created_at' | 'user_name' | 'email'
export type SortDirection = 'asc' | 'desc'
