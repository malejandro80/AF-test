declare module "ws" {
  import { Server } from "http";

  export class WebSocketServer {
    constructor(options: { server: Server; path?: string });
    clients: Set<any>;
    on(event: string, cb: (ws: any, req: any) => void): void;
  }

  export class WebSocket {
    readyState: number;
    send(data: string): void;
    on(event: string, cb: (...args: any[]) => void): void;
    ping(): void;
    terminate(): void;
  }
}
