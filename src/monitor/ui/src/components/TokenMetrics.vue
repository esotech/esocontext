<script setup lang="ts">
import { computed } from 'vue';
import { useMonitorStore } from '../stores/monitor';

const store = useMonitorStore();

const totals = computed(() => store.tokenTotals);
const selectedSession = computed(() => store.selectedSession);

// Calculate session-specific metrics
const sessionMetrics = computed(() => {
  if (!selectedSession.value) return null;

  const session = selectedSession.value;
  return {
    input: session.tokenUsage?.totalInput || 0,
    output: session.tokenUsage?.totalOutput || 0,
    cacheRead: session.tokenUsage?.totalCacheRead || 0,
    cacheWrite: session.tokenUsage?.totalCacheCreation || 0,
  };
});

// Calculate approximate cost (rough estimate)
const estimatedCost = computed(() => {
  // Claude 3.5 Sonnet pricing (approximate)
  const inputCostPer1K = 0.003;
  const outputCostPer1K = 0.015;
  const cacheReadCostPer1K = 0.0003;
  const cacheWriteCostPer1K = 0.00375;

  const metrics = sessionMetrics.value || totals.value;
  const cost =
    (metrics.input / 1000) * inputCostPer1K +
    (metrics.output / 1000) * outputCostPer1K +
    ((metrics.cacheRead || 0) / 1000) * cacheReadCostPer1K +
    ((metrics.cacheWrite || 0) / 1000) * cacheWriteCostPer1K;

  return cost.toFixed(4);
});

function formatNumber(n: number): string {
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'K';
  }
  return n.toString();
}

// Calculate bar widths for visualization
const maxTokens = computed(() => {
  const metrics = sessionMetrics.value || totals.value;
  return Math.max(metrics.input, metrics.output, 1);
});
</script>

<template>
  <div class="p-3 space-y-4">
    <!-- Scope indicator -->
    <div class="text-xs text-monitor-text-muted">
      {{ selectedSession ? `Session: ${selectedSession.sessionId.slice(0, 8)}` : 'All Sessions' }}
    </div>

    <!-- Input Tokens -->
    <div>
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-green-400">Input</span>
        <span class="font-mono text-monitor-text-primary">
          {{ formatNumber((sessionMetrics || totals).input) }}
        </span>
      </div>
      <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-green-500 rounded-full transition-all duration-500"
          :style="{ width: `${((sessionMetrics || totals).input / maxTokens) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Output Tokens -->
    <div>
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-blue-400">Output</span>
        <span class="font-mono text-monitor-text-primary">
          {{ formatNumber((sessionMetrics || totals).output) }}
        </span>
      </div>
      <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 rounded-full transition-all duration-500"
          :style="{ width: `${((sessionMetrics || totals).output / maxTokens) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Cache Stats -->
    <div v-if="(sessionMetrics || totals).cacheRead || (sessionMetrics || totals).cacheWrite" class="pt-2 border-t border-slate-700">
      <div class="text-xs text-monitor-text-secondary mb-2">Cache</div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Cache Read -->
        <div>
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-purple-400">Read</span>
            <span class="font-mono text-monitor-text-muted">
              {{ formatNumber((sessionMetrics || totals).cacheRead || 0) }}
            </span>
          </div>
          <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-purple-500 rounded-full"
              :style="{ width: `${(((sessionMetrics || totals).cacheRead || 0) / Math.max((sessionMetrics || totals).input, 1)) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Cache Write -->
        <div>
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-pink-400">Write</span>
            <span class="font-mono text-monitor-text-muted">
              {{ formatNumber((sessionMetrics || totals).cacheWrite || 0) }}
            </span>
          </div>
          <div class="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-pink-500 rounded-full"
              :style="{ width: `${(((sessionMetrics || totals).cacheWrite || 0) / Math.max((sessionMetrics || totals).input, 1)) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Total & Cost -->
    <div class="pt-3 border-t border-slate-700">
      <div class="flex items-center justify-between">
        <span class="text-sm text-monitor-text-secondary">Total Tokens</span>
        <span class="font-mono text-lg text-monitor-text-primary">
          {{ formatNumber((sessionMetrics || totals).input + (sessionMetrics || totals).output) }}
        </span>
      </div>

      <div class="flex items-center justify-between mt-2">
        <span class="text-xs text-monitor-text-muted">Est. Cost</span>
        <span class="font-mono text-sm text-monitor-accent-cyan">
          ${{ estimatedCost }}
        </span>
      </div>
    </div>

    <!-- Per-session breakdown (when viewing all) -->
    <div v-if="!selectedSession && store.sessions.length > 0" class="pt-3 border-t border-slate-700">
      <div class="text-xs text-monitor-text-secondary mb-2">By Session</div>
      <div class="space-y-2 max-h-32 overflow-y-auto">
        <div
          v-for="session in store.sessions"
          :key="session.sessionId"
          class="flex items-center justify-between text-xs"
        >
          <span
            class="text-monitor-text-muted cursor-pointer hover:text-monitor-text-primary"
            @click="store.selectSession(session.sessionId)"
          >
            {{ session.sessionId.slice(0, 8) }}
          </span>
          <span class="font-mono text-monitor-text-secondary">
            {{ formatNumber(session.tokenUsage.totalInput + session.tokenUsage.totalOutput) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
