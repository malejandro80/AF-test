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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const callbackRef = useRef(onSnapshotUpdate);

  useEffect(() => {
    callbackRef.current = onSnapshotUpdate;
  }, [onSnapshotUpdate]);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      setStatus(reconnectCountRef.current > 0 ? "RECONNECTING" : "CONNECTING");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname || "localhost";
      const wsUrl = `${protocol}//${host}:4000/ws/snapshot?broker_id=${encodeURIComponent(brokerId)}${accountId ? `&account_id=${encodeURIComponent(accountId)}` : ""}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setStatus("CONNECTED");
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const parsed: StreamEvent = JSON.parse(event.data);
          setLastEvent(parsed);

          if (parsed.type === "SNAPSHOT_UPDATE" && parsed.data && callbackRef.current) {
            callbackRef.current(parsed.data as SnapshotResponse);
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

        // Exponential backoff reconnect without triggering React effect re-runs
        const delay = Math.min(2000 * Math.pow(1.5, reconnectCountRef.current), 10000);
        reconnectTimerRef.current = setTimeout(() => {
          if (isMounted) {
            reconnectCountRef.current += 1;
            connect();
          }
        }, delay);
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [brokerId, accountId]);

  return { status, lastEvent, reconnectCount: reconnectCountRef.current };
}
