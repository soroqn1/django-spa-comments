<template>
  <div class="flex items-center justify-between bg-[#f7f9fc] px-5 py-2.5 border-b border-gray-100 rounded-t-lg">
    <!-- Left section: avatar + name/date + 4 buttons -->
    <div class="flex items-center gap-3">
      <img
        :src="avatar"
        alt="avatar"
        class="w-9 h-9 rounded-full object-cover ring-3 ring-white bg-white"
        />

      <!-- name + date -->
      <div class="flex items-center gap-2 leading-none">
        <span class="font-semibold text-[#1a1d24] text-[15px]">{{ name }}</span>
        <span class="text-[14px] text-[#7d8697]">{{ date }}</span>
      </div>

      <!-- 4 buttons immediately after the date -->
      <div class="flex items-center gap-3 text-[#9aa2b4] text-[16px] leading-none ml-3">
        <button class="hover:text-[#6571ff] transition" aria-label="link">#</button>
        <button class="hover:text-[#6571ff] transition" aria-label="bookmark">🔖</button>
        <button class="hover:text-[#6571ff] transition" aria-label="reply">↩</button>
        <button class="hover:text-[#6571ff] transition" aria-label="time">🕓</button>
      </div>
    </div>

    <!-- Right section: voting -->
    <div class="flex items-center gap-1 text-[#5e6677] leading-none">
      <button class="hover:text-[#6571ff]">↑</button>
      <span class="font-medium text-[14px] mx-1">0</span>
      <button class="hover:text-[#6571ff]">↓</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ avatar: string; name: string; date: string }>()
</script>