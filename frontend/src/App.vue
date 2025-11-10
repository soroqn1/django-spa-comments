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

      <CommentForm
        :reply-to="replyTarget"
        :loading="submitting"
        @submit="submit"
        @cancel-reply="replyTarget = null"
      />
      <p v-if="formError" class="text-sm text-rose-500">{{ formError }}</p>
      <p v-else-if="pendingAttachment" class="text-xs text-slate-500">Вложение сохранено локально и пока не отправляется на сервер.</p>

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
  <CommentList v-else :comments="currentPage" @reply="setReply" />

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
import { computed, onMounted, ref, watch } from 'vue'
import CommentForm, { type Attachment } from './components/CommentForm.vue'
import CommentList from './components/CommentList.vue'
import { fetchComments, createComment } from './services/comments'
import { buildTree, sortTree } from './utils/comments'
import type { CommentNode, CommentRecord, SortDirection, SortField } from './types/comment'
import { sanitizeHtml } from './utils/sanitizeHtml'

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

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchComments()
    raw.value = data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить данные'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const sanitized = computed(() =>
  raw.value.map((record) => ({ ...record, text: sanitizeHtml(record.text) }))
)

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
    const saved = await createComment(payload)
    raw.value = [{ ...saved, text: sanitizeHtml(saved.text) }, ...raw.value]
    replyTarget.value = null
    page.value = 1
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Не удалось сохранить комментарий'
  } finally {
    submitting.value = false
  }
}

</script>