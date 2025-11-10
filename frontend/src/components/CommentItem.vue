<template>
  <article
    class="border border-gray-100 bg-white shadow-none"
    :class="depth ? 'ml-10 mt-4 rounded-none' : 'mt-6 rounded-lg'"
    style="border-radius: 0 !important;"
  >
    <CommentHeader
      :name="comment.user_name"
      :created-at="comment.created_at"
      :avatar="avatar"
      @reply="emit('reply', comment)"
    />

    <div class="px-5 pb-5 pt-3 space-y-2">
      <div class="text-xs text-indigo-500 flex flex-wrap items-center gap-3">
        <a :href="`mailto:${comment.email}`" class="hover:underline">{{ comment.email }}</a>
        <a v-if="comment.home_page" :href="comment.home_page" class="hover:underline" rel="nofollow noopener noreferrer" target="_blank">{{ comment.home_page }}</a>
      </div>
      <div class="text-gray-800 leading-relaxed text-[15px] whitespace-pre-wrap" v-html="comment.text" />
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
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const avatar = computed(() => {
  const seed = props.comment.email || props.comment.user_name || 'anon'
  return `https://api.dicebear.com/7.x/avataaars/svg?radius=50&seed=${encodeURIComponent(seed)}`
})
</script>