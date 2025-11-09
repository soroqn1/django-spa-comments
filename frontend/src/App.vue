<template>
  <main class="min-h-screen bg-white p-10">
    <div class="max-w-3xl mx-auto space-y-6">
      <CommentItem
        :avatar="'https://randomuser.me/api/portraits/men/1.jpg'"
        name="Anonymous"
        date="22.05.22 at 22:30"
  text="Each of us understands an obvious truth: the semantic analysis of external countermeasures offers broad opportunities.

Undoubtedly, the continual information and propaganda support of our activities predetermines the high demand for the positions held by participants with regard to the tasks set."
        :replies="[
          {
            avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
            name: 'Rum_8',
            date: '22.05.22 at 22:43',
            text: 'Suddenly, thorough competitor research, which represents a vivid example of the continental European type of political culture, will be associatively distributed across industries.',
            replies: [
              {
                avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
                name: 'Anonymous',
                date: '22.05.22 at 23:21',
                text: 'Suddenly, thorough competitor research, which represents a vivid example of the continental European type of political culture...\n\nHigh-level ideological considerations and an understanding of the essence of resource-saving technologies play a decisive role in forming new principles for building the material, technical, and staffing base!\n\nThe preliminary conclusions are discouraging: the conviction of certain opponents, along with the organization’s structure, makes it possible to evaluate the significance of the development model.'
              }
            ]
          }
        ]"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import CommentItem from './components/CommentItem.vue'
</script>