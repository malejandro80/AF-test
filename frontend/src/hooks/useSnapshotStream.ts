import { useState, useEffect, useRef } from "react";
import { AccountSnapshot, SnapshotResponse } from "./useTraderSnapshot";

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";

export interface StreamEvent {
  type: "CONNECTED" | "SNAPSHOT_UPDATE" | "FILL_EXECUTION" | "ERROR" | "PONG";
  brokerId?: string;
  accountId?: string;
  data?: SnapshotResponse | AccountSnapshot;
  message?: string;
}

export function useSnapshotStream(
  brokerId: string = "BRK-ARWP",
  accountId?: string,
  onSnapshotUpdate?: (updated: SnapshotResponse) => void
) {
  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED");
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setStatus(reconnectCount > 0 ? "RECONNECTING" : "CONNECTING");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname || "localhost";
      const wsUrl = `${protocol}//${host}:4000/ws/snapshot?broker_id=${encodeURIComponent(brokerId)}${accountId ? `&account_id=${encodeURIComponent(accountId)}` : ""}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setStatus("CONNECTED");
        setReconnectCount(0);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const parsed: StreamEvent = JSON.parse(event.data);
          setLastEvent(parsed);

          if (parsed.type === "SNAPSHOT_UPDATE" && parsed.data && onSnapshotUpdate) {
            onSnapshotUpdate(parsed.data as SnapshotResponse);
          }
        } catch {
          // Non-json ping message
        }
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setStatus("DISCONNECTED");
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setStatus("DISCONNECTED");

        // Exponential backoff reconnect
        const delay = Math.min(2000 * Math.pow(1.5, reconnectCount), 10000);
        reconnectTimerRef.current = setTimeout(() => {
          if (isMounted) {
            setReconnectCount((prev) => prev + 1);
            connect();
          }
        }, delay);
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [brokerId, accountId, reconnectCount, onSnapshotUpdate]);

  return { status, lastEvent, reconnectCount };
}
