<template>
  <section class="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6">
    <div class="flex gap-3">
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium"
        :class="mode === 'login' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'"
        type="button"
        @click="setMode('login')"
      >Войти</button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium"
        :class="mode === 'register' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'"
        type="button"
        @click="setMode('register')"
      >Регистрация</button>
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-600" for="auth-username">Имя пользователя</label>
        <input
          id="auth-username"
          v-model.trim="form.username"
          type="text"
          required
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-600" for="auth-email">Email</label>
        <input
          id="auth-email"
          v-model.trim="form.email"
          :type="mode === 'login' ? 'email' : 'email'"
          :required="mode === 'register'"
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-600" for="auth-password">Пароль</label>
        <input
          id="auth-password"
          v-model.trim="form.password"
          type="password"
          required
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring"
        />
      </div>

      <div v-if="mode === 'register'" class="space-y-2">
        <label class="text-sm font-medium text-gray-600" for="auth-confirm">Повтор пароля</label>
        <input
          id="auth-confirm"
          v-model.trim="form.confirm"
          type="password"
          required
          class="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring"
        />
      </div>

      <p v-if="error" class="text-sm text-rose-500">{{ error }}</p>

      <button
        type="submit"
        class="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-500 transition disabled:bg-indigo-300"
        :disabled="loading"
      >{{ loading ? 'Обработка…' : submitLabel }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAuth } from '../stores/auth'

const auth = useAuth()

const mode = ref<'login' | 'register'>('login')

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirm: ''
})

const submitLabel = computed(() => (mode.value === 'login' ? 'Войти' : 'Зарегистрироваться'))

const loading = computed(() => auth.state.loading)
const error = computed(() => auth.state.error)

const reset = () => {
  form.password = ''
  form.confirm = ''
}

const setMode = (next: 'login' | 'register') => {
  mode.value = next
  reset()
}

watch(
  () => auth.state.username,
  (username) => {
    if (!username) return
    form.username = username
    form.email = auth.state.email
  },
  { immediate: true }
)

const handleSubmit = async () => {
  auth.state.error = ''
  if (mode.value === 'register' && form.password !== form.confirm) {
    auth.state.error = 'Пароли не совпадают'
    return
  }

  try {
    if (mode.value === 'login') {
      await auth.login({ username: form.username, password: form.password, email: form.email || undefined })
    } else {
      await auth.register({ username: form.username, email: form.email, password: form.password })
    }
    reset()
  } catch (_) {}
}
</script>
