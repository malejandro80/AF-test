import { Router } from "express";
import { invokeGraph } from "aiarchitecture";

export const agentsRouter = Router();

agentsRouter.post("/run", async (req, res) => {
  const input: unknown = req.body?.input;
  if (typeof input !== "string" || input.trim().length === 0) {
    res.status(400).json({ error: "input is required and must be a non-empty string" });
    return;
  }
  try {
    const { results, summary } = await invokeGraph(input);
    res.json({ results, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "agent orchestration failed", detail: String(err) });
  }
});
