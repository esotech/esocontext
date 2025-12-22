<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMonitorStore } from '../stores/monitor';
import type { MonitorEventType } from '../../../../types/monitor';

const store = useMonitorStore();

const searchQuery = ref('');
const showEventTypes = ref(false);

const eventTypes: MonitorEventType[] = [
  'session_start',
  'session_end',
  'tool_call',
  'tool_result',
  'message',
  'notification',
  'thinking',
  'error',
  'agent_spawn',
  'agent_complete',
];

const activeFilters = computed(() => store.filters.eventTypes);
const hasActiveFilters = computed(() =>
  store.filters.eventTypes.length > 0 ||
  store.filters.searchQuery !== ''
);

function updateSearch() {
  store.setFilter('searchQuery', searchQuery.value);
}

function toggleEventType(type: MonitorEventType) {
  store.toggleEventTypeFilter(type);
}

function clearAllFilters() {
  searchQuery.value = '';
  store.clearFilters();
}

function getEventTypeLabel(type: MonitorEventType): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getEventTypeColor(type: MonitorEventType): string {
  const colors: Record<string, string> = {
    session_start: 'bg-green-500/20 text-green-400 border-green-500',
    session_end: 'bg-gray-500/20 text-gray-400 border-gray-500',
    tool_call: 'bg-blue-500/20 text-blue-400 border-blue-500',
    tool_result: 'bg-cyan-500/20 text-cyan-400 border-cyan-500',
    message: 'bg-white/20 text-white border-white',
    notification: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
    thinking: 'bg-purple-500/20 text-purple-400 border-purple-500',
    error: 'bg-red-500/20 text-red-400 border-red-500',
    agent_spawn: 'bg-orange-500/20 text-orange-400 border-orange-500',
    agent_complete: 'bg-lime-500/20 text-lime-400 border-lime-500',
  };
  return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500';
}
</script>

<template>
  <div class="bg-monitor-bg-secondary px-4 py-2">
    <div class="flex items-center space-x-4">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <svg
          class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-monitor-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search events..."
          class="w-full pl-10 pr-4 py-1.5 bg-monitor-bg-primary border border-slate-700 rounded-lg text-sm text-monitor-text-primary placeholder-monitor-text-muted focus:outline-none focus:border-monitor-accent-cyan"
          @input="updateSearch"
        />
      </div>

      <!-- Event Type Filter -->
      <div class="relative">
        <button
          class="flex items-center space-x-2 px-3 py-1.5 bg-monitor-bg-primary border border-slate-700 rounded-lg text-sm hover:border-slate-600 transition-colors"
          :class="{ 'border-monitor-accent-cyan': activeFilters.length > 0 }"
          @click="showEventTypes = !showEventTypes"
        >
          <svg class="w-4 h-4 text-monitor-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span class="text-monitor-text-secondary">Event Types</span>
          <span
            v-if="activeFilters.length > 0"
            class="bg-monitor-accent-cyan text-white text-xs px-1.5 rounded-full"
          >
            {{ activeFilters.length }}
          </span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="showEventTypes"
          class="absolute top-full left-0 mt-1 w-56 bg-monitor-bg-primary border border-slate-700 rounded-lg shadow-xl z-50"
        >
          <div class="p-2 space-y-1 max-h-64 overflow-y-auto">
            <button
              v-for="type in eventTypes"
              :key="type"
              class="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-700/50 transition-colors"
              @click="toggleEventType(type)"
            >
              <span
                class="px-2 py-0.5 rounded text-xs border"
                :class="getEventTypeColor(type)"
              >
                {{ getEventTypeLabel(type) }}
              </span>
              <svg
                v-if="activeFilters.includes(type)"
                class="w-4 h-4 text-monitor-accent-cyan"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Active Filter Pills -->
      <div v-if="activeFilters.length > 0" class="flex items-center space-x-2">
        <span
          v-for="type in activeFilters"
          :key="type"
          class="inline-flex items-center px-2 py-0.5 rounded text-xs border cursor-pointer hover:opacity-80"
          :class="getEventTypeColor(type)"
          @click="toggleEventType(type)"
        >
          {{ getEventTypeLabel(type) }}
          <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      </div>

      <!-- Clear All -->
      <button
        v-if="hasActiveFilters"
        class="text-xs text-monitor-text-muted hover:text-monitor-text-primary transition-colors"
        @click="clearAllFilters"
      >
        Clear all
      </button>

      <!-- Event Count -->
      <div class="text-xs text-monitor-text-muted">
        {{ store.filteredEvents.length }} events
      </div>
    </div>
  </div>

  <!-- Click outside to close dropdown -->
  <div
    v-if="showEventTypes"
    class="fixed inset-0 z-40"
    @click="showEventTypes = false"
  ></div>
</template>
