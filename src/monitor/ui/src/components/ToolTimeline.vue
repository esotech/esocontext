<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMonitorStore } from '../stores/monitor';

const store = useMonitorStore();
const containerRef = ref<HTMLElement | null>(null);
const hoveredEvent = ref<string | null>(null);

const toolEvents = computed(() => store.toolEvents);

// Calculate timeline bounds
const timeRange = computed(() => {
  if (toolEvents.value.length === 0) {
    return { start: Date.now() - 60000, end: Date.now() };
  }
  const timestamps = toolEvents.value.map(e => e.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps, Date.now());
  // Add some padding
  const padding = (end - start) * 0.05 || 5000;
  return { start: start - padding, end: end + padding };
});

function getEventPosition(timestamp: number): number {
  const { start, end } = timeRange.value;
  const range = end - start;
  if (range === 0) return 50;
  return ((timestamp - start) / range) * 100;
}

function getToolColor(toolName: string): string {
  const name = toolName.toLowerCase();
  if (name.includes('read')) return 'bg-blue-500';
  if (name.includes('write')) return 'bg-orange-500';
  if (name.includes('bash')) return 'bg-green-500';
  if (name.includes('edit')) return 'bg-yellow-500';
  if (name.includes('glob')) return 'bg-purple-500';
  if (name.includes('grep')) return 'bg-pink-500';
  return 'bg-gray-500';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Group events by session for multi-lane display
const eventsBySession = computed(() => {
  const groups = new Map<string, typeof toolEvents.value>();
  toolEvents.value.forEach(event => {
    const existing = groups.get(event.sessionId) || [];
    existing.push(event);
    groups.set(event.sessionId, existing);
  });
  return groups;
});

const sessionIds = computed(() => Array.from(eventsBySession.value.keys()));
</script>

<template>
  <div ref="containerRef" class="h-full flex flex-col">
    <!-- Header -->
    <div class="p-2 border-b border-slate-700 flex items-center justify-between">
      <h2 class="text-xs font-medium text-monitor-text-secondary uppercase tracking-wide">
        Tool Timeline
      </h2>
      <div class="flex items-center space-x-2 text-xs text-monitor-text-muted">
        <span>{{ formatTime(timeRange.start) }}</span>
        <span>-</span>
        <span>{{ formatTime(timeRange.end) }}</span>
      </div>
    </div>

    <!-- Timeline Area -->
    <div class="flex-1 relative overflow-hidden p-2">
      <div
        v-if="toolEvents.length === 0"
        class="absolute inset-0 flex items-center justify-center text-monitor-text-muted text-sm"
      >
        No tool calls yet
      </div>

      <!-- Time Grid -->
      <div class="absolute inset-0 flex">
        <div
          v-for="i in 5"
          :key="i"
          class="flex-1 border-r border-slate-700/50 last:border-r-0"
        ></div>
      </div>

      <!-- Session Lanes -->
      <div class="relative h-full">
        <div
          v-for="(sessionId, idx) in sessionIds"
          :key="sessionId"
          class="absolute left-0 right-0 flex items-center"
          :style="{ top: `${(idx / Math.max(sessionIds.length, 1)) * 100}%`, height: `${100 / Math.max(sessionIds.length, 1)}%` }"
        >
          <!-- Session Label -->
          <div class="absolute left-0 text-xs text-monitor-text-muted w-16 truncate">
            {{ sessionId.slice(0, 6) }}
          </div>

          <!-- Events -->
          <div class="absolute left-16 right-0 h-full flex items-center">
            <div
              v-for="event in eventsBySession.get(sessionId)"
              :key="event.id"
              class="absolute transform -translate-x-1/2 cursor-pointer transition-all duration-200"
              :class="[
                'rounded-full',
                getToolColor(event.data.toolName || ''),
                hoveredEvent === event.id ? 'w-4 h-4 ring-2 ring-white z-10' : 'w-3 h-3 hover:w-4 hover:h-4'
              ]"
              :style="{ left: `${getEventPosition(event.timestamp)}%` }"
              @mouseenter="hoveredEvent = event.id"
              @mouseleave="hoveredEvent = null"
              @click="store.selectSession(event.sessionId)"
            >
              <!-- Tooltip -->
              <div
                v-if="hoveredEvent === event.id"
                class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 rounded shadow-lg text-xs whitespace-nowrap z-20"
              >
                <div class="font-medium text-monitor-text-primary">{{ event.data.toolName }}</div>
                <div class="text-monitor-text-muted">{{ formatTime(event.timestamp) }}</div>
                <div class="text-monitor-text-secondary">{{ event.eventType === 'tool_call' ? 'Called' : 'Completed' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="absolute bottom-0 right-0 flex items-center space-x-3 text-xs p-2 bg-monitor-bg-primary/80 rounded">
        <div class="flex items-center space-x-1">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span class="text-monitor-text-muted">Read</span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          <span class="text-monitor-text-muted">Write</span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          <span class="text-monitor-text-muted">Bash</span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
          <span class="text-monitor-text-muted">Edit</span>
        </div>
      </div>
    </div>
  </div>
</template>
