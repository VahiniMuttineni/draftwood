import { SSEStreamingApi } from "hono/streaming";

type ConnectionMap = Map<string, Set<SSEStreamingApi>>;

export const sseConnections: ConnectionMap = new Map();

export const addSSEConnection = (userId: string, stream: SSEStreamingApi) => {
  if (!sseConnections.has(userId)) {
    sseConnections.set(userId, new Set());
  }
  sseConnections.get(userId)!.add(stream);
};

export const removeSSEConnection = (userId: string, stream: SSEStreamingApi) => {
  const userConnections = sseConnections.get(userId);
  if (userConnections) {
    userConnections.delete(stream);
    if (userConnections.size === 0) {
      sseConnections.delete(userId);
    }
  }
};

export const emitToUser = async (userId: string, event: string, data: any) => {
  const connections = sseConnections.get(userId);
  if (connections) {
    const promises = Array.from(connections).map(async (stream) => {
      try {
        await stream.writeSSE({
          event,
          data: JSON.stringify(data),
          id: String(Date.now()),
        });
      } catch (err) {
        // If writing fails, connection is likely dead, remove it
        removeSSEConnection(userId, stream);
      }
    });
    await Promise.all(promises);
  }
};
