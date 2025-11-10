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
          <button class="hover:text-[#6571ff] transition" type="button" aria-label="link">#</button>
          <button class="hover:text-[#6571ff] transition" type="button" aria-label="bookmark">🔖</button>
          <button class="hover:text-[#6571ff] transition" type="button" aria-label="reply" @click="$emit('reply')">↩</button>
          <button class="hover:text-[#6571ff] transition" type="button" aria-label="time">🕓</button>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1 text-[#5e6677] leading-none">
      <button class="hover:text-[#6571ff]" type="button">↑</button>
      <span class="font-medium text-[14px] mx-1">0</span>
      <button class="hover:text-[#6571ff]" type="button">↓</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  createdAt: string
  avatar: string | null
}>()

const formattedDate = computed(() => new Date(props.createdAt).toLocaleString())
const initials = computed(() => props.name.trim().slice(0, 2).toUpperCase())
</script>