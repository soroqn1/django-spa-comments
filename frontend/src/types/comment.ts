export interface CommentRecord {
  id: number
  user: number | null
  user_name: string
  email: string
  home_page: string | null
  text: string
  created_at: string
  parent: number | null
  attachment_url: string | null
  attachment_name: string
  attachment_type: 'image' | 'text' | ''
  attachment_size: number
  attachment_width: number
  attachment_height: number
  attachment_text_preview: string
}

export interface CommentNode extends CommentRecord {
  replies: CommentNode[]
}

export type SortField = 'created_at' | 'user_name' | 'email'
export type SortDirection = 'asc' | 'desc'
