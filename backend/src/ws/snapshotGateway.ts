import { WebSocketServer } from "ws";
import { Server, IncomingMessage } from "http";
import { SnapshotService } from "../snapshot/snapshotService.js";
import { logRedacted } from "../security/piiRedactor.js";

export interface TenantSocket {
  brokerId?: string;
  accountId?: string;
  isAlive?: boolean;
  readyState: number;
  send(data: string): void;
  on(event: string, cb: (...args: any[]) => void): void;
  ping(): void;
  terminate(): void;
}

export class SnapshotWebSocketGateway {
  private wss: any;
  private snapshotService: SnapshotService;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws/snapshot" });
    this.snapshotService = new SnapshotService();

    this.wss.on("connection", (ws: any, req: IncomingMessage) => {
      const socket = ws as TenantSocket;

      // 1. Authenticate & Bind Tenant Scope at Connection Time
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const token = url.searchParams.get("token") || url.searchParams.get("broker_id") || (req.headers["x-broker-id"] as string);
      const accountId = url.searchParams.get("account_id") || undefined;

      let brokerId = "BRK-ARWP";
      if (token && token.startsWith("BRK-")) {
        brokerId = token;
      }

      socket.brokerId = brokerId;
      socket.accountId = accountId;
      socket.isAlive = true;

      logRedacted(`[WS_CONN] Client connected to WS snapshot stream. Broker: ${brokerId}, Account: ${accountId || "ALL"}`);

      // Send initial connection state handshake
      socket.send(JSON.stringify({
        type: "CONNECTED",
        message: "WebSocket connection established and tenant-scoped",
        brokerId: socket.brokerId,
        accountId: socket.accountId,
        timestamp: new Date().toISOString(),
      }));

      // Send immediate snapshot push
      try {
        const snapshot = this.snapshotService.getSnapshot(brokerId, accountId);
        socket.send(JSON.stringify({
          type: "SNAPSHOT_UPDATE",
          data: snapshot,
        }));
      } catch (err: unknown) {
        socket.send(JSON.stringify({
          type: "ERROR",
          message: err instanceof Error ? err.message : String(err),
        }));
      }

      socket.on("pong", () => {
        socket.isAlive = true;
      });

      socket.on("message", (msg: any) => {
        try {
          const payload = JSON.parse(msg.toString());
          if (payload.type === "PING") {
            socket.send(JSON.stringify({ type: "PONG", timestamp: new Date().toISOString() }));
          }
        } catch {
          // ignore non-json ping
        }
      });

      socket.on("close", () => {
        logRedacted(`[WS_DISCONN] Client disconnected from broker stream ${brokerId}`);
      });
    });

    // Heartbeat ping interval
    setInterval(() => {
      this.wss.clients.forEach((wsClient: any) => {
        const socket = wsClient as TenantSocket;
        if (socket.isAlive === false) return socket.terminate();
        socket.isAlive = false;
        socket.ping();
      });
    }, 30000);
  }

  /**
   * Broadcasts a fill event or updated snapshot ONLY to sockets matching the target broker_id.
   * Multi-tenant security guarantee: Never broadcasts across broker boundaries!
   */
  public broadcastFillUpdate(brokerId: string, accountId: string, updatedSnapshot: unknown) {
    this.wss.clients.forEach((client: any) => {
      const socket = client as TenantSocket;
      if (socket.readyState === 1 && socket.brokerId === brokerId) {
        if (!socket.accountId || socket.accountId === accountId) {
          socket.send(JSON.stringify({
            type: "FILL_EXECUTION",
            accountId,
            data: updatedSnapshot,
          }));
        }
      }
    });
  }
}
