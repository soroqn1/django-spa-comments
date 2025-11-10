<template>
  <form class="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6" @submit.prevent="handleSubmit">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800">Новый комментарий</h2>
      <button v-if="replyTo" type="button" class="text-sm text-indigo-600 hover:text-indigo-500" @click="emit('cancel-reply')">Отменить ответ</button>
    </div>

    <div v-if="replyTo" class="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
      Ответ на сообщение от <strong>{{ replyTo.user_name }}</strong>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-600" for="name">Имя</label>
        <input
          id="name"
          v-model.trim="form.user_name"
          type="text"
          maxlength="100"
          placeholder="Иван"
          :disabled="locked"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring disabled:bg-slate-100"
        />
        <p v-if="errors.user_name" class="text-xs text-rose-500">{{ errors.user_name }}</p>
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-600" for="email">Email</label>
        <input
          id="email"
          v-model.trim="form.email"
          type="email"
          placeholder="you@example.com"
          :disabled="locked"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring disabled:bg-slate-100"
        />
        <p v-if="errors.email" class="text-xs text-rose-500">{{ errors.email }}</p>
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-600" for="home_page">Домашняя страница</label>
        <input
          id="home_page"
          v-model.trim="form.home_page"
          type="url"
          placeholder="https://example.com"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring"
        />
        <p v-if="errors.home_page" class="text-xs text-rose-500">{{ errors.home_page }}</p>
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-600">Файл</label>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/gif,text/plain" class="block w-full text-sm text-slate-600" @change="onFileChange" />
        <p v-if="fileError" class="text-xs text-rose-500">{{ fileError }}</p>
        <div v-if="attachment" class="rounded-lg border border-slate-200 p-3 flex items-center gap-3">
          <img v-if="attachment.type === 'image'" :src="attachment.preview" :alt="attachment.name" class="h-16 w-16 object-cover rounded" />
          <div class="text-sm text-slate-600">
            <p class="font-medium text-slate-700">{{ attachment.name }}</p>
            <p v-if="attachment.type === 'image'">{{ attachment.width }}×{{ attachment.height }} px</p>
            <p v-else class="max-h-32 overflow-hidden whitespace-pre-wrap">{{ attachment.textPreview }}</p>
          </div>
          <button type="button" class="ml-auto text-sm text-rose-500 hover:text-rose-400" @click="removeFile">Удалить</button>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-slate-600">Разметка</span>
        <button v-for="action in actions" :key="action.label" type="button" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 hover:border-indigo-500 hover:text-indigo-600" @click="applyTag(action.tag)">
          {{ action.label }}
        </button>
      </div>
      <textarea
        ref="textarea"
        v-model="form.text"
        rows="6"
        placeholder="Поделитесь мнением..."
        class="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring"
      />
      <p v-if="errors.text" class="text-xs text-rose-500">{{ errors.text }}</p>
    </div>

    <div class="space-y-2">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-28 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img
            v-if="captcha.image"
            :src="captcha.image"
            :alt="`Код ${captcha.value}`"
            class="h-full w-full select-none object-cover"
            draggable="false"
          />
          <span v-else class="font-mono text-sm tracking-[0.4em] text-slate-700">{{ captcha.value }}</span>
        </div>
        <button type="button" class="text-sm text-indigo-600 hover:text-indigo-500" @click="refreshCaptcha">Обновить</button>
      </div>
      <input
        v-model.trim="captcha.input"
        type="text"
        placeholder="Введите код"
        class="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring"
      />
      <p v-if="errors.captcha" class="text-xs text-rose-500">{{ errors.captcha }}</p>
    </div>

    <button
      type="submit"
      class="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-500 transition disabled:bg-indigo-300"
      :disabled="loading"
    >{{ loading ? 'Отправка…' : 'Опубликовать' }}</button>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRefs, watch } from 'vue'
import { createCaptcha } from '../utils/captcha'
import type { CommentNode } from '../types/comment'

interface AttachmentImage {
  type: 'image'
  name: string
  preview: string
  file: File
  width: number
  height: number
}

interface AttachmentText {
  type: 'text'
  name: string
  preview: string
  textPreview: string
  file: File
}

export type Attachment = AttachmentImage | AttachmentText

interface Prefill {
  user_name: string
  email: string
  home_page: string
}

const props = defineProps<{
  replyTo: CommentNode | null
  loading: boolean
  prefill?: Prefill
  locked?: boolean
}>()
const { replyTo, loading } = toRefs(props)
const locked = computed(() => props.locked ?? false)

const emit = defineEmits<{
  (e: 'submit', payload: {
    user_name: string
    email: string
    home_page: string
    text: string
    attachment: Attachment | null
  }): void
  (e: 'cancel-reply'): void
}>()

const form = reactive({
  user_name: '',
  email: '',
  home_page: '',
  text: ''
})

const captcha = reactive({
  value: '',
  image: '',
  input: ''
})

const assignCaptcha = () => {
  const next = createCaptcha()
  captcha.value = next.value
  captcha.image = next.image
}

assignCaptcha()

const errors = reactive<Record<string, string>>({})
const attachment = ref<Attachment | null>(null)
const fileError = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const actions = [
  { label: '[i]', tag: 'i' },
  { label: '[strong]', tag: 'strong' },
  { label: '[code]', tag: 'code' },
  { label: '[a]', tag: 'a' }
] as const

type ActionTag = (typeof actions)[number]['tag']

watch(
  () => props.prefill,
  (prefill: Prefill | undefined) => {
    if (!prefill) {
      if (!locked.value) {
        form.user_name = ''
        form.email = ''
        form.home_page = ''
      }
      return
    }
    form.user_name = prefill.user_name
    form.email = prefill.email
    form.home_page = prefill.home_page
  },
  { immediate: true }
)

const validate = () => {
  errors.user_name = ''
  errors.email = ''
  errors.home_page = ''
  errors.text = ''
  errors.captcha = ''

  const nameValid = /^[\w\s-]{3,100}$/.test(form.user_name)
  if (!nameValid) errors.user_name = 'Имя должно содержать от 3 символов'

  const emailValid = /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i.test(form.email)
  if (!emailValid) errors.email = 'Введите корректный email'

  if (form.home_page) {
    try {
      const url = new URL(form.home_page)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch (_) {
      errors.home_page = 'Нужен корректный URL'
    }
  }

  if (!form.text.trim()) errors.text = 'Введите сообщение'

  if (!captcha.input || captcha.input.toUpperCase() !== captcha.value) {
    errors.captcha = 'Неверный код'
  }

  return !errors.user_name && !errors.email && !errors.home_page && !errors.text && !errors.captcha
}

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', {
    user_name: form.user_name.trim(),
    email: form.email.trim(),
    home_page: form.home_page.trim(),
    text: form.text,
    attachment: attachment.value
  })
  form.text = ''
  assignCaptcha()
  captcha.input = ''
  removeFile()
}

const refreshCaptcha = () => {
  assignCaptcha()
  captcha.input = ''
}

const applyTag = (tag: ActionTag) => {
  const area = textarea.value
  if (!area) return
  const { selectionStart, selectionEnd } = area
  const selected = form.text.slice(selectionStart, selectionEnd)
  const wrapper = tag === 'a' ? { open: '<a href="https://" title="">', close: '</a>' } : { open: `<${tag}>`, close: `</${tag}>` }
  const next =
    form.text.slice(0, selectionStart) +
    wrapper.open +
    selected +
    wrapper.close +
    form.text.slice(selectionEnd)
  form.text = next
  nextTick(() => {
    const pos = selectionStart + wrapper.open.length + selected.length
    area.focus()
    area.setSelectionRange(pos, pos)
  })
}

const onFileChange = async (event: Event) => {
  fileError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    attachment.value = null
    return
  }

  try {
    if (file.type.startsWith('image/')) {
      attachment.value = await processImage(file)
    } else {
      attachment.value = await processText(file)
    }
  } catch (error) {
    fileError.value = error instanceof Error ? error.message : 'Не удалось загрузить файл'
    attachment.value = null
  }
}

const removeFile = () => {
  attachment.value = null
  fileError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const processImage = async (file: File): Promise<AttachmentImage> => {
  if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
    throw new Error('Допустимы только JPG, PNG или GIF')
  }

  const url = URL.createObjectURL(file)
  const image = await loadImage(url)
  const maxWidth = 320
  const maxHeight = 240
  let { width, height } = image

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    URL.revokeObjectURL(url)
    throw new Error('Не удалось обработать изображение')
  }
  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.9))
  URL.revokeObjectURL(url)
  if (!blob) throw new Error('Не удалось обработать изображение')

  const resized = new File([blob], file.name, { type: file.type })
  return {
    type: 'image',
    name: resized.name,
    preview: canvas.toDataURL(file.type),
    file: resized,
    width,
    height
  }
}

const processText = async (file: File): Promise<AttachmentText> => {
  if (file.type !== 'text/plain') throw new Error('Только TXT файлы')
  if (file.size > 100 * 1024) throw new Error('Текстовый файл не должен превышать 100 КБ')
  const content = await file.text()
  return {
    type: 'text',
    name: file.name,
    preview: '',
    textPreview: content.slice(0, 400),
    file
  }
}
</script>
