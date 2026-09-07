import express from "express";
import cors from "cors";
import { createServer } from "http";
import { agentsRouter } from "./routes/agents.js";
import { snapshotRouter } from "./routes/snapshotRoutes.js";
import { createUser } from "./db.js";
import { SnapshotWebSocketGateway } from "./ws/snapshotGateway.js";

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", timestamp: new Date().toISOString() });
});

// Auth registration endpoint scaffold
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  try {
    const user = createUser(email, password);
    res.status(201).json({ user });
  } catch (err) {
    res.status(409).json({ error: "user already exists", detail: String(err) });
  }
});

// Mount Parallel Agents route
app.use("/api/agents", agentsRouter);

// Mount ArrowFin Trading Snapshot API v1
app.use("/api/v1", snapshotRouter);

const server = createServer(app);

// Initialize WebSocket Gateway
new SnapshotWebSocketGateway(server);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, "0.0.0.0", () => {
  console.log(`ArrowFin Trading Platform Backend running on http://localhost:${port}`);
  console.log(`WebSocket Stream listening on ws://localhost:${port}/ws/snapshot`);
});
