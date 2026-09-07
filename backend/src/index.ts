import express from "express";
import cors from "cors";
import { agentsRouter } from "./routes/agents.js";
import { createUser } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

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

app.use("/api/agents", agentsRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
