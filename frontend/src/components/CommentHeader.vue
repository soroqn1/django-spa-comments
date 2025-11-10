<template>
  <header class="flex items-center justify-between bg-[#f7f9fc] px-5 py-2.5 border-b border-gray-100 rounded-t-lg">
    <div class="flex items-center gap-3">
      <span class="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 overflow-hidden ring-3 ring-white">
        <img v-if="avatar" :src="avatar" :alt="name" class="w-full h-full object-cover" />
        <span v-else>{{ initials }}</span>
      </span>

      <div class="flex items-center gap-3 leading-none">
        <span class="font-semibold text-[#1a1d24] text-[15px]">{{ name }}</span>
        <time class="text-[14px] text-[#7d8697]" :datetime="createdAt">{{ formattedDate }}</time>
        <div class="flex items-center gap-3 text-[#9aa2b4] text-[16px] leading-none ml-3">
          <button class="action-button" type="button" aria-label="link" @click="emit('copy-link')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <path d="M10 13a5 5 0 0 1 0-7l1.17-1.17a5 5 0 0 1 7.07 7.07l-1.17 1.17" />
              <path d="M14 11a5 5 0 0 1 0 7l-1.17 1.17a5 5 0 0 1-7.07-7.07L7 11" />
            </svg>
          </button>
          <button :class="['action-button', { active: bookmarkActive }]" type="button" aria-label="bookmark" @click="emit('bookmark')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
            </svg>
          </button>
          <button class="action-button" type="button" aria-label="reply" @click="emit('reply')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <path d="M9 10V6l-7 6 7 6v-4c8 0 11 3 13 8-1-9-4-14-13-14z" />
            </svg>
          </button>
          <button class="action-button" type="button" aria-label="time" @click="emit('show-history')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
              <path d="M21 13a9 9 0 1 1-9-9" />
              <polyline points="21 3 21 9 15 9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1 text-[#5e6677] leading-none">
      <button :class="['vote-button', { active: userVote === 1 }]" type="button" aria-label="vote up" @click="emit('vote', 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>
      <span class="font-medium text-[14px] mx-1">{{ score }}</span>
      <button :class="['vote-button', { active: userVote === -1 }]" type="button" aria-label="vote down" @click="emit('vote', -1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
          <path d="M18 9l-6 6-6-6" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  createdAt: string
  avatar: string | null
  score?: number
  bookmarkActive?: boolean
  userVote?: number
}>()

const emit = defineEmits<{
  (event: 'copy-link'): void
  (event: 'bookmark'): void
  (event: 'reply'): void
  (event: 'show-history'): void
  (event: 'vote', value: number): void
}>()

const formattedDate = computed(() => new Date(props.createdAt).toLocaleString())
const initials = computed(() => props.name.trim().slice(0, 2).toUpperCase())
const score = computed(() => props.score ?? 0)
const bookmarkActive = computed(() => !!props.bookmarkActive)
const userVote = computed(() => props.userVote ?? 0)
</script>

<style scoped>
.action-button,
.vote-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.action-button:hover,
.vote-button:hover {
  color: #6571ff;
  background-color: rgba(101, 113, 255, 0.08);
}

.action-button.active,
.vote-button.active {
  color: #6571ff;
  background-color: rgba(101, 113, 255, 0.16);
}
</style>