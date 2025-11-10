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

export const createComment = async (payload: CommentCreatePayload) =>
  http<CommentRecord>('comments/', { method: 'POST', json: payload })
