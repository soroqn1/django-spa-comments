<template>
  <article
    class="border border-gray-100 bg-white shadow-none"
    :class="depth ? 'ml-10 mt-4 rounded-none' : 'mt-6 rounded-lg'"
    style="border-radius: 0 !important;"
    :id="anchorId"
  >
    <CommentHeader
      :name="comment.user_name"
      :created-at="comment.created_at"
      :avatar="avatar"
      :score="displayScore"
      :bookmark-active="bookmarked"
      :user-vote="userVote"
      @copy-link="copyPermalink"
      @bookmark="toggleBookmark"
      @reply="emit('reply', comment)"
      @show-history="showHistory"
      @vote="handleVote"
    />

    <transition name="fade">
      <div v-if="feedbackMessage" :class="['mx-5 mt-2 rounded-md px-3 py-2 text-sm', feedbackClass]">
        {{ feedbackMessage }}
      </div>
    </transition>

    <div class="px-5 pb-5 pt-3 space-y-3">
      <div class="text-xs text-indigo-500 flex flex-wrap items-center gap-3">
        <a :href="`mailto:${comment.email}`" class="hover:underline">{{ comment.email }}</a>
        <a v-if="comment.home_page" :href="comment.home_page" class="hover:underline" rel="nofollow noopener noreferrer" target="_blank">{{ comment.home_page }}</a>
      </div>
      <div class="text-gray-800 leading-relaxed text-[15px] whitespace-pre-wrap" v-html="comment.text" />

      <div v-if="hasAttachment" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span class="font-medium text-slate-700 truncate">{{ comment.attachment_name }}</span>
          <div class="flex items-center gap-2">
            <span v-if="sizeLabel" class="text-slate-500">{{ sizeLabel }}</span>
            <span v-if="dimensions" class="text-slate-400">{{ dimensions }}</span>
            <a
              v-if="downloadUrl"
              :href="downloadUrl"
              class="text-indigo-600 hover:text-indigo-500"
              target="_blank"
              rel="noopener"
            >Скачать</a>
          </div>
        </div>

        <div v-if="isImage && downloadUrl" class="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition"
            @click="openPreview"
          >
            <img :src="downloadUrl" :alt="comment.attachment_name" class="h-36 w-36 object-cover transition duration-200 group-hover:scale-105" />
          </button>
        </div>

        <div v-else-if="isText" class="mt-3 max-h-48 overflow-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
          {{ comment.attachment_text_preview }}
        </div>
      </div>
    </div>

    <div
      v-if="comment.replies.length"
      class="mt-3 ml-10 border-l border-gray-200 border-t-0 pl-5 space-y-4"
      style="border-radius: 0 !important;"
    >
      <CommentItem
        v-for="child in comment.replies"
        :key="child.id"
        :comment="child"
        :depth="depth + 1"
        @reply="emit('reply', $event)"
      />
    </div>

    <Teleport to="body">
      <transition name="preview" appear>
        <div
          v-if="previewOpen && isImage && downloadUrl"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          @click.self="closePreview"
        >
          <div class="relative max-h-[90vh] max-w-[90vw]">
            <button
              type="button"
              class="absolute -top-10 right-0 text-sm text-slate-200 hover:text-white"
              @click="closePreview"
            >Закрыть ✕</button>
            <img :src="downloadUrl" :alt="comment.attachment_name" class="max-h-[90vh] max-w-full rounded-lg object-contain" />
          </div>
        </div>
      </transition>
    </Teleport>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CommentHeader from './CommentHeader.vue'
import type { CommentNode } from '../types/comment'

const props = defineProps<{
  comment: CommentNode
  depth?: number
}>()

const emit = defineEmits<{
  (e: 'reply', comment: CommentNode): void
}>()

const depth = computed(() => props.depth ?? 0)
const anchorId = computed(() => `comment-${props.comment.id}`)

const avatar = computed(() => {
  const seed = props.comment.email || props.comment.user_name || 'anon'
  return `https://api.dicebear.com/7.x/avataaars/svg?radius=50&seed=${encodeURIComponent(seed)}`
})

const hasAttachment = computed(() => props.comment.attachment_type !== '' && !!props.comment.attachment_name)
const isImage = computed(() => props.comment.attachment_type === 'image')
const isText = computed(() => props.comment.attachment_type === 'text')
const downloadUrl = computed(() => props.comment.attachment_url || '')

const sizeLabel = computed(() => {
  const size = props.comment.attachment_size
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
})

const dimensions = computed(() => {
  if (!isImage.value) return ''
  const { attachment_width: w, attachment_height: h } = props.comment
  if (!w || !h) return ''
  return `${w}×${h} px`
})

const previewOpen = ref(false)
const openPreview = () => {
  previewOpen.value = true
}
const closePreview = () => {
  previewOpen.value = false
}

const createdAtLabel = computed(() => new Date(props.comment.created_at).toLocaleString())

const feedbackMessage = ref('')
const feedbackTone = ref<'info' | 'success' | 'error'>('info')
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const setFeedback = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
  feedbackMessage.value = message
  feedbackTone.value = tone
  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
  }
  feedbackTimer = setTimeout(() => {
    feedbackMessage.value = ''
  }, 2400)
}

const feedbackClass = computed(() => {
  if (feedbackTone.value === 'success') return 'bg-[#eef6ff] text-[#1c3faa] border border-[#c8dcff]'
  if (feedbackTone.value === 'error') return 'bg-[#fff1f0] text-[#a8071a] border border-[#ffccc7]'
  return 'bg-[#f5f7fb] text-[#3b4256] border border-[#e2e8f5]'
})

const bookmarksKey = 'comments:bookmarks'
const votesKey = 'comments:votes'

const bookmarked = ref(false)
const userVote = ref(0)
const baseScore = computed(() => {
  const maybe = (props.comment as unknown as { vote_score?: number }).vote_score
  return typeof maybe === 'number' ? maybe : 0
})
const displayScore = computed(() => baseScore.value + userVote.value)

const loadBookmarks = () => {
  if (typeof window === 'undefined') return [] as number[]
  try {
    const raw = window.localStorage.getItem(bookmarksKey)
    if (!raw) return [] as number[]
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is number => typeof id === 'number')
    }
  } catch (err) {
    console.warn('Не удалось прочитать закладки', err)
  }
  return [] as number[]
}

const persistBookmarks = (ids: number[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(bookmarksKey, JSON.stringify(ids))
  } catch (err) {
    console.warn('Не удалось сохранить закладки', err)
  }
}

const loadVotes = () => {
  if (typeof window === 'undefined') return {} as Record<number, number>
  try {
    const raw = window.localStorage.getItem(votesKey)
    if (!raw) return {} as Record<number, number>
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(
        Object.entries(parsed).map(([id, value]) => [Number(id), typeof value === 'number' ? value : 0])
      ) as Record<number, number>
    }
  } catch (err) {
    console.warn('Не удалось прочитать голоса', err)
  }
  return {} as Record<number, number>
}

const persistVotes = (votes: Record<number, number>) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(votesKey, JSON.stringify(votes))
  } catch (err) {
    console.warn('Не удалось сохранить голос', err)
  }
}

const toggleBookmark = () => {
  const ids = loadBookmarks()
  if (bookmarked.value) {
    const next = ids.filter(id => id !== props.comment.id)
    bookmarked.value = false
    persistBookmarks(next)
    setFeedback('Комментарий удалён из закладок', 'info')
    return
  }
  if (!ids.includes(props.comment.id)) {
    ids.push(props.comment.id)
    persistBookmarks(ids)
  }
  bookmarked.value = true
  setFeedback('Комментарий сохранён в закладках', 'success')
}

const copyPermalink = async () => {
  if (typeof window === 'undefined') return
  const url = `${window.location.origin}${window.location.pathname}#${anchorId.value}`
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = window.document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      window.document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      window.document.execCommand('copy')
      window.document.body.removeChild(textarea)
    }
    window.history.replaceState({}, '', `#${anchorId.value}`)
    setFeedback('Ссылка на комментарий скопирована', 'success')
  } catch (err) {
    console.warn('Не удалось скопировать ссылку', err)
    setFeedback('Не получилось скопировать ссылку', 'error')
  }
}

const showHistory = () => {
  setFeedback(`Комментарий опубликован ${createdAtLabel.value}`, 'info')
}

const handleVote = (direction: number) => {
  const normalized = direction > 0 ? 1 : -1
  const votes = loadVotes()
  if (userVote.value === normalized) {
    userVote.value = 0
    votes[props.comment.id] = 0
    persistVotes(votes)
    setFeedback('Ваш голос сброшен', 'info')
    return
  }
  userVote.value = normalized
  votes[props.comment.id] = normalized
  persistVotes(votes)
  setFeedback(normalized === 1 ? 'Вы поддержали комментарий' : 'Вы пожаловались на комментарий', 'success')
}

onMounted(() => {
  const ids = loadBookmarks()
  bookmarked.value = ids.includes(props.comment.id)

  const votes = loadVotes()
  userVote.value = votes[props.comment.id] ?? 0
})

onBeforeUnmount(() => {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
  }
})
</script>

<style scoped>
.preview-enter-active,
.preview-leave-active {
  transition: opacity 0.2s ease;
}

.preview-enter-from,
.preview-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>