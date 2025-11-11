<template>
  <main class="min-h-screen bg-[#eef2f7] py-10">
    <div class="mx-auto max-w-3xl px-4 space-y-10">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Комментарии</h1>
          <p class="text-sm text-slate-500">Просмотр и добавление сообщений с поддержкой веток</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-500 hover:text-indigo-600"
            type="button"
            @click="load"
          >Обновить</button>
        </div>
      </header>

      <section v-if="isAuthenticated" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div>
          <p class="text-sm font-semibold text-slate-800">{{ auth.state.username }}</p>
          <p v-if="auth.state.email" class="text-xs text-indigo-500">{{ auth.state.email }}</p>
        </div>
        <button
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-rose-500 hover:text-rose-500"
          type="button"
          @click="logout"
        >Выйти</button>
      </section>
      <AuthPanel v-else />

      <CommentForm
        :reply-to="replyTarget"
        :loading="submitting"
        :prefill="commentPrefill"
        :locked="lockForm"
        @submit="submit"
        @cancel-reply="replyTarget = null"
      />
      <p v-if="formError" class="text-sm text-rose-500">{{ formError }}</p>
  <p v-else-if="pendingAttachment" class="text-xs text-slate-500">Загружаем вложение…</p>

      <section class="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div class="flex items-center gap-3">
            <label class="text-sm text-slate-500">Сортировка</label>
            <select
              v-model="sortField"
              class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring"
            >
              <option value="created_at">По дате</option>
              <option value="user_name">По имени</option>
              <option value="email">По email</option>
            </select>
            <button
              class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
              type="button"
              @click="toggleDirection"
            >{{ sortDirection === 'asc' ? '↑' : '↓' }}</button>
          </div>
          <div class="text-sm text-slate-500">Всего: {{ total }} · Страница {{ page }} из {{ totalPages }}</div>
        </div>

    <div v-if="loading" class="py-16 text-center text-slate-500">Загрузка…</div>
    <p v-else-if="error" class="py-16 text-center text-rose-500">{{ error }}</p>
  <CommentList v-else :comments="currentPage" @reply="setReply" @updated="mergeComment" />

  <footer class="flex items-center justify-between border-t border-gray-100 px-5 py-4 text-sm text-slate-600">
          <button
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50"
            type="button"
            :disabled="page === 1"
            @click="page--"
          >Назад</button>
          <div class="flex items-center gap-2">
            <template v-for="p in totalPages" :key="p">
              <button
                class="h-9 w-9 rounded-lg border"
                :class="p === page ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-500 hover:text-indigo-600'"
                type="button"
                @click="page = p"
              >{{ p }}</button>
            </template>
          </div>
          <button
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50"
            type="button"
            :disabled="page === totalPages"
            @click="page++"
          >Вперёд</button>
        </footer>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import CommentForm, { type Attachment } from './components/CommentForm.vue'
import CommentList from './components/CommentList.vue'
import AuthPanel from './components/AuthPanel.vue'
import { fetchComments, createComment } from './services/comments'
import { buildTree, sortTree } from './utils/comments'
import type { CommentNode, CommentRecord, SortDirection, SortField } from './types/comment'
import { sanitizeHtml } from './utils/sanitizeHtml'
import { useAuth } from './stores/auth'

const auth = useAuth()
const isAuthenticated = auth.isAuthenticated

const toSafeRecord = (record: CommentRecord): CommentRecord => ({
  ...record,
  text: sanitizeHtml(record.text),
  score: record.score ?? 0,
  user_vote: record.user_vote ?? 0,
  is_bookmarked: record.is_bookmarked ?? false
})

const raw = ref<CommentRecord[]>([])
const loading = ref(false)
const error = ref('')
const formError = ref('')
const submitting = ref(false)
const replyTarget = ref<CommentNode | null>(null)
const sortField = ref<SortField>('created_at')
const sortDirection = ref<SortDirection>('desc')
const page = ref(1)
const pageSize = 25
const pendingAttachment = ref<Attachment | null>(null)

const socket = ref<WebSocket | null>(null)
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

const commentPrefill = computed(() => {
  if (!isAuthenticated.value) return undefined
  return {
    user_name: auth.state.username,
    email: auth.state.email,
    home_page: auth.state.homePage
  }
})

const lockForm = computed(() => {
  if (!isAuthenticated.value) return false
  return Boolean(auth.state.username && auth.state.email)
})

const upsertComment = (record: CommentRecord, preserveUserState = false) => {
  const safe = toSafeRecord(record)
  const index = raw.value.findIndex((item) => item.id === safe.id)
  if (index === -1) {
    raw.value = [...raw.value, safe]
  } else {
  const current = raw.value[index]!
    const next = preserveUserState
      ? {
          ...current,
          ...safe,
          user_vote: current.user_vote,
          is_bookmarked: current.is_bookmarked
        }
      : { ...current, ...safe }
    raw.value = raw.value.map((item, idx) => (idx === index ? next : item))
  }
}

const removeComment = (id: number) => {
  const toRemove = new Set<number>([id])
  let expanded = true
  while (expanded) {
    expanded = false
    for (const item of raw.value) {
      if (item.parent && toRemove.has(item.parent) && !toRemove.has(item.id)) {
        toRemove.add(item.id)
        expanded = true
      }
    }
  }
  raw.value = raw.value.filter((item) => !toRemove.has(item.id))
}

const resolveWebSocketUrl = () => {
  const override = import.meta.env.VITE_WS_BASE_URL
  if (override) {
    return `${override.replace(/\/$/, '')}/ws/comments/`
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase) {
    try {
      const url = new URL(apiBase.replace(/\/$/, ''))
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${url.origin}/ws/comments/`
    } catch (_) {
      // ignore malformed URLs
    }
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${window.location.host}/ws/comments/`
  }

  return 'ws://localhost:8000/ws/comments/'
}

const scheduleReconnect = () => {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectSocket()
  }, 2000)
}

const handleSocketEvent = (data: unknown) => {
  if (!data || typeof data !== 'object') return
  const payload = data as { type?: string; comment?: CommentRecord; comment_id?: number }
  if (payload.type === 'comment_update' && payload.comment) {
    upsertComment(payload.comment, true)
  } else if (payload.type === 'comment_delete' && typeof payload.comment_id === 'number') {
    removeComment(payload.comment_id)
  }
}

const connectSocket = () => {
  if (typeof window === 'undefined') return

  const url = resolveWebSocketUrl()
  try {
    const ws = new WebSocket(url)
    socket.value = ws

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        handleSocketEvent(parsed)
      } catch (err) {
        console.warn('Не удалось разобрать сообщение WebSocket', err)
      }
    }
    ws.onclose = () => {
      scheduleReconnect()
    }
    ws.onerror = () => {
      ws.close()
    }
  } catch (err) {
    console.warn('Не удалось подключиться к WebSocket', err)
    scheduleReconnect()
  }
}

const teardownSocket = () => {
  if (socket.value) {
    socket.value.close()
    socket.value = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchComments()
    raw.value = data.map(toSafeRecord)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить данные'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  connectSocket()
})

onUnmounted(() => {
  teardownSocket()
})

const sanitized = computed(() => raw.value)

const tree = computed(() => buildTree(sanitized.value))
const sorted = computed(() => sortTree(tree.value, sortField.value, sortDirection.value))
const total = computed(() => sorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const currentPage = computed(() => {
  const start = (page.value - 1) * pageSize
  return sorted.value.slice(start, start + pageSize)
})

watch([sortField, sortDirection], () => {
  page.value = 1
})

watch(totalPages, (next) => {
  if (page.value > next) page.value = next
})

const toggleDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const setReply = (comment: CommentNode) => {
  replyTarget.value = comment
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const mergeComment = (updated: CommentRecord) => {
  upsertComment(updated)
}

const logout = () => {
  auth.logout()
}

const submit = async ({ user_name, email, home_page, text, attachment }: {
  user_name: string
  email: string
  home_page: string
  text: string
  attachment: Attachment | null
}) => {
  formError.value = ''
  submitting.value = true
  pendingAttachment.value = attachment
  try {
    const payload = {
      user_name,
      email,
      home_page: home_page || undefined,
      text: sanitizeHtml(text),
      parent: replyTarget.value?.id ?? null
    }
    const saved = await createComment(payload, attachment?.file ?? null)
    upsertComment(saved)
    replyTarget.value = null
    page.value = 1
    if (isAuthenticated.value) {
      auth.setProfile({ email, homePage: home_page })
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Не удалось сохранить комментарий'
  } finally {
    submitting.value = false
    pendingAttachment.value = null
  }
}

</script>