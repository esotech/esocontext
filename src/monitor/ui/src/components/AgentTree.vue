<script setup lang="ts">
import { computed } from 'vue';
import { useMonitorStore } from '../stores/monitor';
import type { SessionMeta } from '../../../../types/monitor';

const store = useMonitorStore();

const hierarchy = computed(() => store.sessionHierarchy);

function getChildren(sessionId: string): SessionMeta[] {
  return hierarchy.value.childMap.get(sessionId) || [];
}

function formatDuration(start: number, end?: number): string {
  const duration = (end || Date.now()) - start;
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function truncatePath(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}
</script>

<template>
  <div class="p-3">
    <div
      v-if="hierarchy.rootSessions.length === 0"
      class="text-monitor-text-muted text-sm text-center py-4"
    >
      No agents active
    </div>

    <!-- Root Sessions -->
    <div
      v-for="session in hierarchy.rootSessions"
      :key="session.sessionId"
      class="mb-3"
    >
      <!-- Session Node -->
      <div
        class="flex items-center p-2 rounded-lg bg-monitor-bg-secondary cursor-pointer hover:bg-slate-700/70"
        :class="{
          'ring-1 ring-monitor-accent-cyan': store.selectedSessionId === session.sessionId
        }"
        @click="store.selectSession(session.sessionId)"
      >
        <!-- Status indicator -->
        <span
          class="w-2 h-2 rounded-full mr-2"
          :class="{
            'bg-green-500 animate-pulse-dot': session.status === 'active',
            'bg-gray-500': session.status === 'completed',
            'bg-red-500': session.status === 'error'
          }"
        ></span>

        <!-- Session info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-monitor-text-primary">
              {{ session.sessionId.slice(0, 8) }}
            </span>
            <span
              v-if="session.agentType"
              class="text-xs px-1.5 py-0.5 rounded bg-monitor-accent-cyan/20 text-monitor-accent-cyan"
            >
              {{ session.agentType }}
            </span>
            <span class="text-xs text-monitor-text-muted">
              {{ formatDuration(session.startTime, session.endTime) }}
            </span>
          </div>
          <div class="text-xs text-monitor-text-muted truncate">
            {{ truncatePath(session.workingDirectory) }}
          </div>
        </div>

        <!-- Child count -->
        <span
          v-if="session.childSessionIds.length > 0"
          class="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-monitor-text-secondary"
        >
          {{ session.childSessionIds.length }}
        </span>
      </div>

      <!-- Child Sessions (recursive) -->
      <div
        v-if="getChildren(session.sessionId).length > 0"
        class="ml-4 mt-1 pl-4 border-l-2 border-slate-700"
      >
        <div
          v-for="child in getChildren(session.sessionId)"
          :key="child.sessionId"
          class="mb-1"
        >
          <div
            class="flex items-center p-2 rounded-lg bg-monitor-bg-tertiary/50 cursor-pointer hover:bg-slate-600/50"
            :class="{
              'ring-1 ring-monitor-accent-purple': store.selectedSessionId === child.sessionId
            }"
            @click="store.selectSession(child.sessionId)"
          >
            <!-- Connection line indicator -->
            <div class="w-4 h-px bg-slate-600 mr-2"></div>

            <!-- Status indicator -->
            <span
              class="w-2 h-2 rounded-full mr-2"
              :class="{
                'bg-purple-500 animate-pulse-dot': child.status === 'active',
                'bg-gray-500': child.status === 'completed',
                'bg-red-500': child.status === 'error'
              }"
            ></span>

            <!-- Icon for sub-agent -->
            <svg class="w-3 h-3 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>

            <!-- Child info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-medium text-monitor-text-primary">
                  {{ child.sessionId.slice(0, 8) }}
                </span>
                <span
                  v-if="child.agentType"
                  class="text-xs px-1 py-0.5 rounded bg-monitor-accent-purple/20 text-monitor-accent-purple"
                >
                  {{ child.agentType }}
                </span>
                <span class="text-xs text-monitor-text-muted">
                  {{ formatDuration(child.startTime, child.endTime) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Nested children -->
          <div
            v-if="getChildren(child.sessionId).length > 0"
            class="ml-4 mt-1 pl-4 border-l-2 border-slate-600"
          >
            <div
              v-for="grandchild in getChildren(child.sessionId)"
              :key="grandchild.sessionId"
              class="flex items-center p-1.5 rounded text-xs text-monitor-text-muted hover:text-monitor-text-primary cursor-pointer"
              @click="store.selectSession(grandchild.sessionId)"
            >
              <div class="w-3 h-px bg-slate-600 mr-2"></div>
              <span
                class="w-1.5 h-1.5 rounded-full mr-2"
                :class="{
                  'bg-purple-400': grandchild.status === 'active',
                  'bg-gray-500': grandchild.status === 'completed',
                  'bg-red-400': grandchild.status === 'error'
                }"
              ></span>
              <span>{{ grandchild.sessionId.slice(0, 8) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
