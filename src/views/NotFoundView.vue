<script setup lang="ts"></script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-babyblue-50 via-white to-babyblue-100 px-4 text-center"
  >
    <div>
      <p class="text-5xl">🧭</p>
      <h1 class="mt-3 text-2xl font-semibold text-slate-900">Page not found</h1>
      <RouterLink
        to="/"
        class="mt-3 inline-block rounded-lg bg-babyblue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700"
        >Go home</RouterLink
      >
    </div>
  </div>
</template>
