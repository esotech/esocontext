<script setup lang="ts">
import { computed } from 'vue';
import { useMonitorStore } from '../stores/monitor';

const store = useMonitorStore();

const mode = computed(() => store.mode);
const isConnected = computed(() => store.connectionStatus === 'connected');
</script>

<template>
  <div class="flex items-center space-x-2">
    <!-- Mode Badge -->
    <span
      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      :class="{
        'bg-blue-900 text-blue-200': mode === 'local',
        'bg-purple-900 text-purple-200': mode === 'redis'
      }"
    >
      <svg
        v-if="mode === 'local'"
        class="w-3 h-3 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <svg
        v-else
        class="w-3 h-3 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
        />
      </svg>
      {{ mode === 'local' ? 'Local' : 'Redis' }}
    </span>

    <!-- Connection indicator -->
    <span
      v-if="isConnected"
      class="inline-flex items-center text-xs text-monitor-text-muted"
    >
      <svg class="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
      </svg>
      Connected
    </span>
  </div>
</template>
