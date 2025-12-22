<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import type { SessionMeta } from '../../../../types/monitor';

const props = defineProps<{
  x: number;
  y: number;
  session: SessionMeta;
  allSessions: SessionMeta[];
}>();

const emit = defineEmits<{
  close: [];
  setParent: [sessionId: string, parentId: string | null];
  togglePin: [sessionId: string];
  setUserInitiated: [sessionId: string, value: boolean];
}>();

// Get eligible parents (exclude self and descendants)
function isDescendantOf(sessionId: string, potentialAncestorId: string): boolean {
  const session = props.allSessions.find(s => s.sessionId === sessionId);
  if (!session) return false;
  if (session.parentSessionId === potentialAncestorId) return true;
  if (session.parentSessionId) {
    return isDescendantOf(session.parentSessionId, potentialAncestorId);
  }
  return false;
}

const eligibleParents = computed(() => {
  return props.allSessions.filter(s =>
    s.sessionId !== props.session.sessionId &&
    !isDescendantOf(s.sessionId, props.session.sessionId) &&
    !props.session.childSessionIds.includes(s.sessionId)
  ).sort((a, b) => b.startTime - a.startTime);
});

// Close on click outside
function handleClickOutside(e: MouseEvent) {
  emit('close');
}

// Close on Escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  // Delay to avoid immediate close from the triggering click
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  }, 10);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div
    class="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-52 z-50"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <!-- Session info header -->
    <div class="px-3 py-2 border-b border-slate-700 text-xs text-monitor-text-muted">
      <span class="text-monitor-text-primary font-medium">{{ session.sessionId.slice(0, 8) }}</span>
      <span v-if="session.agentType" class="ml-2 text-monitor-accent-purple">({{ session.agentType }})</span>
    </div>

    <!-- Pin/Unpin -->
    <button
      class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center"
      @click="emit('togglePin', session.sessionId); emit('close')"
    >
      <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
      </svg>
      <span :class="session.isPinned ? 'text-monitor-accent-cyan' : ''">
        {{ session.isPinned ? 'Unpin Session' : 'Pin to Top' }}
      </span>
    </button>

    <!-- Mark as User-Initiated / Sub-Agent -->
    <button
      class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center"
      @click="emit('setUserInitiated', session.sessionId, !session.isUserInitiated); emit('close')"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
      <span :class="session.isUserInitiated ? 'text-monitor-accent-cyan' : ''">
        {{ session.isUserInitiated ? 'Mark as Sub-Agent' : 'Mark as Primary' }}
      </span>
    </button>

    <div class="border-t border-slate-700 my-1"></div>

    <!-- Set Parent (submenu-like) -->
    <div class="relative group">
      <button class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center justify-between">
        <span class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Set Parent
        </span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      <!-- Submenu -->
      <div class="absolute left-full top-0 ml-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-48 hidden group-hover:block max-h-64 overflow-y-auto">
        <!-- No parent option -->
        <button
          class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 text-monitor-text-muted flex items-center"
          :class="{ 'text-monitor-accent-cyan': !session.parentSessionId }"
          @click="emit('setParent', session.sessionId, null); emit('close')"
        >
          <svg class="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          (No Parent - Root)
        </button>

        <div class="border-t border-slate-700 my-1"></div>

        <!-- Available parents -->
        <button
          v-for="parent in eligibleParents"
          :key="parent.sessionId"
          class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center"
          :class="{ 'text-monitor-accent-cyan': session.parentSessionId === parent.sessionId }"
          @click="emit('setParent', session.sessionId, parent.sessionId); emit('close')"
        >
          <span
            class="w-2 h-2 rounded-full mr-2"
            :class="{
              'bg-green-500': parent.status === 'active',
              'bg-gray-500': parent.status === 'completed',
              'bg-red-500': parent.status === 'error'
            }"
          ></span>
          <span>{{ parent.sessionId.slice(0, 8) }}</span>
          <span v-if="parent.agentType" class="ml-1 text-xs text-monitor-accent-purple">
            ({{ parent.agentType }})
          </span>
          <span v-if="parent.isUserInitiated" class="ml-1 text-xs text-monitor-accent-cyan">
            (primary)
          </span>
        </button>

        <div v-if="eligibleParents.length === 0" class="px-3 py-2 text-sm text-monitor-text-muted italic">
          No eligible parents
        </div>
      </div>
    </div>
  </div>
</template>
