<template>
  <article
    class="border border-gray-100 bg-white shadow-none"
    :class="depth ? 'mt-4 rounded-none' : 'mt-6 rounded-lg'"
    :id="anchorId"
  >
    <CommentHeader
      :name="comment.user_name"
      :created-at="comment.created_at"
      :avatar="avatar"
      :score="score"
      :bookmark-active="bookmarkActive"
      :user-vote="userVote"
      @copy-link="copyPermalink"
      @bookmark="handleBookmark"
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
      class="mt-3 border-l border-gray-200 border-t-0 space-y-4"
      :style="repliesStyle"
    >
      <CommentItem
        v-for="child in comment.replies"
        :key="child.id"
        :comment="child"
        :depth="depth + 1"
        @reply="emit('reply', $event)"
        @updated="emit('updated', $event)"
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
import { computed, onBeforeUnmount, ref, type CSSProperties } from 'vue'
import CommentHeader from './CommentHeader.vue'
import type { CommentNode, CommentRecord } from '../types/comment'
import { toggleBookmark, voteComment } from '../services/comments'
import { useAuth } from '../stores/auth'

const props = defineProps<{
  comment: CommentNode
  depth?: number
}>()

const emit = defineEmits<{
  (e: 'reply', comment: CommentNode): void
  (e: 'updated', comment: CommentRecord): void
}>()

const auth = useAuth()

const depth = computed(() => props.depth ?? 0)
const MAX_THREAD_DEPTH = 5

const repliesStyle = computed<CSSProperties>(() => {
  if (depth.value >= MAX_THREAD_DEPTH) {
    return {
      paddingLeft: '0px',
      borderLeftColor: 'rgba(101, 113, 255, 0.35)',
      borderLeftStyle: 'dashed'
    }
  }
  return {
    paddingLeft: '24px',
    borderLeftColor: '#e5e7eb',
    borderLeftStyle: 'solid'
  }
})
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
const score = computed(() => props.comment.score ?? 0)
const bookmarkActive = computed(() => props.comment.is_bookmarked ?? false)
const userVote = computed(() => props.comment.user_vote ?? 0)

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

const ensureAuth = () => {
  if (!auth.isAuthenticated.value) {
    setFeedback('Нужно войти, чтобы выполнить действие', 'error')
    return false
  }
  return true
}

const applyUpdate = (record: CommentRecord) => {
  Object.assign(props.comment, {
    text: record.text,
    score: record.score,
    user_vote: record.user_vote,
    is_bookmarked: record.is_bookmarked
  })
  emit('updated', record)
}

const handleBookmark = async () => {
  if (!ensureAuth()) return
  try {
    const updated = await toggleBookmark(props.comment.id, bookmarkActive.value)
    applyUpdate(updated)
    setFeedback(
      updated.is_bookmarked ? 'Комментарий сохранён в закладках' : 'Комментарий удалён из закладок',
      updated.is_bookmarked ? 'success' : 'info'
    )
  } catch (error) {
    console.warn('Не удалось обновить закладку', error)
    setFeedback('Не удалось обновить закладку', 'error')
  }
}

const copyPermalink = async () => {
  if (typeof window === 'undefined') return
  const hash = `#${anchorId.value}`
  const url = `${window.location.origin}${window.location.pathname}${hash}`
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
    if (window.location.hash !== hash) {
      window.location.hash = anchorId.value
    } else {
      const el = window.document.getElementById(anchorId.value)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    setFeedback('Ссылка на комментарий скопирована', 'success')
  } catch (err) {
    console.warn('Не удалось скопировать ссылку', err)
    setFeedback('Не получилось скопировать ссылку', 'error')
  }
}

const showHistory = () => {
  setFeedback(`Комментарий опубликован ${createdAtLabel.value}`, 'info')
}

const handleVote = async (direction: number) => {
  if (!ensureAuth()) return
  const normalized = direction > 0 ? 1 : -1
  const target = userVote.value === normalized ? 0 : normalized
  try {
    const updated = await voteComment(props.comment.id, target)
    applyUpdate(updated)
    if (target === 0) {
      setFeedback('Ваш голос сброшен', 'info')
    } else {
      setFeedback(target === 1 ? 'Вы поддержали комментарий' : 'Вы пожаловались на комментарий', 'success')
    }
  } catch (error) {
    console.warn('Не удалось обновить голос', error)
    setFeedback('Не удалось обновить голос', 'error')
  }
}

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