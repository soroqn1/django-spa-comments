<template>
  <div
    :class="[
      'p-5 mb-4 transition border-gray-100 bg-white shadow-none border',
      isReply ? 'border-t-0' : 'border-none'
    ]"
    style="border-radius: 0 !important;"
  >
    <!-- Header -->
    <CommentHeader :avatar="avatar" :name="name" :date="date" />

    <!-- Text -->
    <div class="px-5 pb-5 pt-2 text-gray-800 leading-relaxed text-[15px]">
      {{ text }}
    </div>

    <!-- Replies -->
    <div
      v-if="replies && replies.length"
      class="mt-3 ml-10 border-l border-gray-200 border-t-0 pl-5 space-y-4"
      style="border-radius: 0 !important;"
    >
      <CommentItem
        v-for="(reply, i) in replies"
        :key="i"
        v-bind="reply"
        :isReply="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentHeader from './CommentHeader.vue'

withDefaults(
  defineProps<{
    avatar: string
    name: string
    date: string
    text: string
    replies?: {
      avatar: string
      name: string
      date: string
      text: string
      replies?: any[]
    }[]
    isReply?: boolean
  }>(),
  {
    isReply: false,
  }
)
</script>

<style scoped>
div {
  border-radius: 0 !important;
}
</style>