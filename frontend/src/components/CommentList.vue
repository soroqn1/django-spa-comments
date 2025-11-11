<template>
  <div>
    <p v-if="!items.length" class="text-center text-slate-500 py-12">Пока нет комментариев</p>
    <div v-else class="space-y-4">
      <CommentItem
        v-for="comment in items"
        :key="comment.id"
        :comment="comment"
        @reply="emit('reply', $event)"
        @updated="emit('updated', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CommentItem from './CommentItem.vue'
import type { CommentNode, CommentRecord } from '../types/comment'

const props = defineProps<{ comments: CommentNode[] }>()

const emit = defineEmits<{
  (e: 'reply', comment: CommentNode): void
  (e: 'updated', comment: CommentRecord): void
}>()

const items = computed(() => props.comments)
</script>
