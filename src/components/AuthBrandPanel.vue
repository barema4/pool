<script setup lang="ts">
// The art + pitch panel shown alongside the form on every auth page
// (login, register, forgot password) — kept in one place so the three
// pages can't drift out of sync with each other.
</script>

<template>
  <div
    class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-babyblue-600 via-babyblue-500 to-babyblue-700 p-12 text-white lg:flex"
  >
    <div class="flex items-center gap-2">
      <span
        class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold backdrop-blur-sm"
      >
        OP
      </span>
      <span class="text-lg font-semibold">OpenPool</span>
    </div>

    <div class="relative z-10 max-w-md">
      <h2 class="text-3xl font-bold leading-tight text-balance">
        Collect and track money together, without the spreadsheet chaos.
      </h2>
      <p class="mt-4 text-base leading-relaxed text-babyblue-50">
        OpenPool gives churches, chamas, SACCOs, and event organizers one shared place to raise
        funds, invoice contributors, track every pledge, and know exactly what's been collected —
        all in one link you can share anywhere.
      </p>
      <ul class="mt-8 space-y-3 text-sm text-babyblue-50">
        <li class="flex items-center gap-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">✓</span>
          Shareable payment links for events, weddings, and fundraisers
        </li>
        <li class="flex items-center gap-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">✓</span>
          Live contributor and budget tracking, no manual reconciliation
        </li>
        <li class="flex items-center gap-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">✓</span>
          Card and mobile money payouts straight to your organization
        </li>
      </ul>
    </div>

    <!-- Decorative art: layered soft circles, purely CSS, no external assets. -->
    <svg
      class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 opacity-30"
      viewBox="0 0 400 400"
      fill="none"
    >
      <circle cx="200" cy="200" r="200" fill="white" fill-opacity="0.15" />
      <circle cx="200" cy="200" r="140" fill="white" fill-opacity="0.15" />
      <circle cx="200" cy="200" r="80" fill="white" fill-opacity="0.2" />
    </svg>
    <svg
      class="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 opacity-20"
      viewBox="0 0 400 400"
      fill="none"
    >
      <circle cx="200" cy="200" r="200" fill="white" fill-opacity="0.2" />
      <circle cx="200" cy="200" r="120" fill="white" fill-opacity="0.2" />
    </svg>

    <p class="relative z-10 text-xs text-babyblue-100">© {{ new Date().getFullYear() }} OpenPool</p>
  </div>
</template>
