import { http } from './http'
import type { CommentRecord } from '../types/comment'

export interface CommentCreatePayload {
  user_name: string
  email: string
  home_page?: string
  text: string
  parent?: number | null
}

export const fetchComments = async () =>
  http<CommentRecord[]>('comments/')

export const createComment = async (
  payload: CommentCreatePayload,
  attachment?: File | null
) => {
  if (attachment) {
    const formData = new FormData()
    formData.append('user_name', payload.user_name)
    formData.append('email', payload.email)
    if (payload.home_page) formData.append('home_page', payload.home_page)
    formData.append('text', payload.text)
    if (payload.parent) formData.append('parent', String(payload.parent))
    formData.append('attachment', attachment)
    return http<CommentRecord>('comments/', { method: 'POST', body: formData })
  }

  const jsonPayload: CommentCreatePayload = {
    ...payload,
    home_page: payload.home_page || undefined
  }

  return http<CommentRecord>('comments/', { method: 'POST', json: jsonPayload })
}
