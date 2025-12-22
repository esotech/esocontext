import { ref, onMounted, onUnmounted } from 'vue';
import type { ServerMessage, ClientMessage } from '../../../../types/monitor';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = import.meta.env.DEV ? 'ws://localhost:3848' : `ws://${window.location.hostname}:3848`,
    autoConnect = true,
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 2000,
  } = options;

  const ws = ref<WebSocket | null>(null);
  const status = ref<ConnectionStatus>('disconnected');
  const reconnectAttempts = ref(0);
  const lastMessage = ref<ServerMessage | null>(null);
  const error = ref<Event | null>(null);

  const messageHandlers = new Set<(message: ServerMessage) => void>();

  function connect() {
    if (ws.value?.readyState === WebSocket.OPEN) return;

    status.value = 'connecting';
    error.value = null;

    ws.value = new WebSocket(url);

    ws.value.onopen = () => {
      status.value = 'connected';
      reconnectAttempts.value = 0;
    };

    ws.value.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        lastMessage.value = message;
        messageHandlers.forEach(handler => handler(message));
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.value.onclose = () => {
      status.value = 'disconnected';
      ws.value = null;

      if (reconnect && reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++;
        setTimeout(connect, reconnectDelay * reconnectAttempts.value);
      }
    };

    ws.value.onerror = (err) => {
      error.value = err;
      console.error('WebSocket error:', err);
    };
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    status.value = 'disconnected';
  }

  function send(message: ClientMessage) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  function onMessage(handler: (message: ServerMessage) => void) {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  }

  onMounted(() => {
    if (autoConnect) {
      connect();
    }
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    ws,
    status,
    error,
    lastMessage,
    connect,
    disconnect,
    send,
    onMessage,
  };
}
