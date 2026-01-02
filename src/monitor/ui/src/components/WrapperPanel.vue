<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useMonitorStore } from '../stores/monitor';

const store = useMonitorStore();

const inputText = ref('');
const terminalRef = ref<HTMLElement | null>(null);

// Computed
const wrappers = computed(() => store.wrappers);
const activeWrappers = computed(() => store.activeWrappers);
const selectedWrapper = computed(() => store.selectedWrapper);
const wrappersWaitingInput = computed(() => store.wrappersWaitingInput);

// Get output for selected wrapper
const terminalOutput = computed(() => {
  if (!store.selectedWrapperId) return '';
  return store.getWrapperOutput(store.selectedWrapperId);
});

// Auto-scroll terminal when output changes
watch(terminalOutput, async () => {
  await nextTick();
  if (terminalRef.value) {
    terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
  }
});

function selectWrapper(wrapperId: string) {
  store.selectWrapper(wrapperId);
}

function sendInput() {
  if (!store.selectedWrapperId || !inputText.value.trim()) return;

  store.injectInput(store.selectedWrapperId, inputText.value);
  inputText.value = '';
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendInput();
  }
}

function getStateColor(state: string): string {
  switch (state) {
    case 'waiting_input': return 'text-green-400';
    case 'processing': return 'text-yellow-400';
    case 'starting': return 'text-blue-400';
    case 'ended': return 'text-gray-500';
    default: return 'text-gray-400';
  }
}

function getStateIcon(state: string): string {
  switch (state) {
    case 'waiting_input': return '⏳';
    case 'processing': return '⚙️';
    case 'starting': return '🚀';
    case 'ended': return '✓';
    default: return '•';
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-monitor-bg-primary">
    <!-- Header -->
    <div class="p-3 border-b border-slate-700 flex items-center justify-between">
      <h2 class="text-sm font-medium text-monitor-text-secondary uppercase tracking-wide">
        Claude Wrappers
      </h2>
      <span class="text-xs text-monitor-text-muted">
        {{ activeWrappers.length }} active
      </span>
    </div>

    <!-- No wrappers message -->
    <div v-if="wrappers.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center text-monitor-text-muted">
        <p class="text-sm">No wrapper sessions</p>
        <p class="text-xs mt-2">Run <code class="bg-slate-700 px-1 rounded">contextuate claude</code> to start</p>
      </div>
    </div>

    <!-- Wrapper list -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <!-- Wrapper tabs -->
      <div class="flex border-b border-slate-700 overflow-x-auto">
        <button
          v-for="wrapper in wrappers"
          :key="wrapper.wrapperId"
          class="px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors"
          :class="[
            store.selectedWrapperId === wrapper.wrapperId
              ? 'border-monitor-accent-cyan text-monitor-accent-cyan bg-slate-800'
              : 'border-transparent text-monitor-text-secondary hover:text-monitor-text-primary hover:bg-slate-800/50'
          ]"
          @click="selectWrapper(wrapper.wrapperId)"
        >
          <span :class="getStateColor(wrapper.state)">{{ getStateIcon(wrapper.state) }}</span>
          <span class="ml-2">{{ wrapper.wrapperId }}</span>
          <span v-if="wrapper.state === 'waiting_input'" class="ml-2 text-xs text-green-400">(ready)</span>
        </button>
      </div>

      <!-- Selected wrapper content -->
      <div v-if="selectedWrapper" class="flex-1 flex flex-col overflow-hidden">
        <!-- Wrapper info bar -->
        <div class="px-3 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-xs text-monitor-text-muted">ID:</span>
            <code class="text-xs text-monitor-accent-cyan">{{ selectedWrapper.wrapperId }}</code>
            <span class="text-xs text-monitor-text-muted">State:</span>
            <span :class="getStateColor(selectedWrapper.state)" class="text-xs font-medium">
              {{ selectedWrapper.state }}
            </span>
            <template v-if="selectedWrapper.claudeSessionId">
              <span class="text-xs text-monitor-text-muted">Session:</span>
              <code class="text-xs text-slate-400">{{ selectedWrapper.claudeSessionId.slice(0, 8) }}</code>
            </template>
          </div>
        </div>

        <!-- Terminal output -->
        <div
          ref="terminalRef"
          class="flex-1 overflow-auto p-3 bg-black font-mono text-sm text-green-400 whitespace-pre-wrap"
        >
          <template v-if="terminalOutput">
            {{ terminalOutput }}
          </template>
          <template v-else>
            <span class="text-gray-500">Waiting for output...</span>
          </template>
        </div>

        <!-- Input area -->
        <div class="border-t border-slate-700 p-3">
          <div class="flex items-center space-x-2">
            <div class="flex-1 relative">
              <textarea
                v-model="inputText"
                :disabled="selectedWrapper.state !== 'waiting_input'"
                :placeholder="selectedWrapper.state === 'waiting_input' ? 'Type your input...' : 'Waiting for Claude...'"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-monitor-text-primary placeholder-slate-500 resize-none focus:outline-none focus:border-monitor-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
                rows="2"
                @keydown="handleKeydown"
              ></textarea>
            </div>
            <button
              :disabled="selectedWrapper.state !== 'waiting_input' || !inputText.trim()"
              class="px-4 py-2 bg-monitor-accent-cyan text-white rounded font-medium text-sm hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="sendInput"
            >
              Send
            </button>
          </div>
          <div class="mt-2 text-xs text-monitor-text-muted">
            <template v-if="selectedWrapper.state === 'waiting_input'">
              Press Enter to send, Shift+Enter for new line
            </template>
            <template v-else-if="selectedWrapper.state === 'processing'">
              Claude is processing...
            </template>
            <template v-else>
              Wrapper is {{ selectedWrapper.state }}
            </template>
          </div>
        </div>
      </div>

      <!-- No selection message -->
      <div v-else class="flex-1 flex items-center justify-center p-4">
        <p class="text-sm text-monitor-text-muted">Select a wrapper to view terminal</p>
      </div>
    </div>

    <!-- Quick input for any waiting wrapper (shown at bottom if there are waiting wrappers) -->
    <div
      v-if="wrappersWaitingInput.length > 0 && !selectedWrapper"
      class="border-t border-slate-700 p-3 bg-green-900/20"
    >
      <div class="text-xs text-green-400 mb-2">
        {{ wrappersWaitingInput.length }} wrapper(s) waiting for input
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="wrapper in wrappersWaitingInput"
          :key="wrapper.wrapperId"
          class="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-500 transition-colors"
          @click="selectWrapper(wrapper.wrapperId)"
        >
          {{ wrapper.wrapperId }}
        </button>
      </div>
    </div>
  </div>
</template>
