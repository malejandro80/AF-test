import { Router, Response } from "express";
import { SnapshotService } from "../snapshot/snapshotService.js";
import { jwtAuthGuard, AuthenticatedRequest } from "../security/jwtAuthGuard.js";
import { logRedacted } from "../security/piiRedactor.js";
import db from "../db.js";

export const snapshotRouter = Router();
const snapshotService = new SnapshotService();

// Apply mandatory JWT Tenant Isolation Guard across all snapshot endpoints
snapshotRouter.use(jwtAuthGuard);

/**
 * GET /api/v1/snapshot
 * Query params: ?account_id=ACC-1006
 */
snapshotRouter.get("/snapshot", (req: AuthenticatedRequest, res: Response) => {
  try {
    const brokerId = req.user!.brokerId;
    const accountId = req.query.account_id as string | undefined;

    logRedacted(`Fetching daily snapshot for broker ${brokerId}`, { accountId });

    const snapshot = snapshotService.getSnapshot(brokerId, accountId);
    res.json(snapshot);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logRedacted(`Snapshot fetch error: ${errorMsg}`);

    if (errorMsg.includes("ERR_TENANT_ACCESS_DENIED")) {
      res.status(403).json({
        statusCode: 403,
        error: "Forbidden",
        message: "Cross-tenant access violation: Account does not belong to authorized broker context",
      });
      return;
    }

    res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: errorMsg,
    });
  }
});

/**
 * GET /api/v1/accounts
 * Lists accounts under authorized broker.
 */
snapshotRouter.get("/accounts", (req: AuthenticatedRequest, res: Response) => {
  try {
    const brokerId = req.user!.brokerId;
    const accounts = db.prepare(`
      SELECT a.id, a.account_number, a.account_type, a.balance, a.buying_power, a.status,
             t.first_name, t.last_name
      FROM accounts a
      JOIN traders t ON a.trader_id = t.id
      WHERE a.broker_id = ?
      ORDER BY a.id ASC
    `).all(brokerId);

    res.json({ brokerId, accounts });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /dev/fills
 * Development-only endpoint to simulate real-time executions.
 * P0 Security Guarantee: Blocked in production environment!
 */
snapshotRouter.post("/dev/fills", (req: AuthenticatedRequest, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({
      statusCode: 403,
      error: "Forbidden",
      message: "ERR_DEV_ENDPOINT_BLOCKED: /dev/fills simulation endpoint is strictly prohibited in production environment",
    });
    return;
  }

  const { account_id, instrument_symbol, side, quantity, price, commission_usd } = req.body ?? {};

  if (!account_id || !instrument_symbol || !side || !quantity || !price) {
    res.status(400).json({ error: "Missing required fill fields" });
    return;
  }

  try {
    const brokerId = req.user!.brokerId;

    // Verify target account belongs to caller's broker
    const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND broker_id = ?").get(account_id, brokerId);
    if (!account) {
      res.status(403).json({ error: `Account ${account_id} does not belong to authorized broker ${brokerId}` });
      return;
    }

    const fillId = `FIL-DEV-${Date.now()}`;
    const orderId = `ORD-DEV-${Date.now()}`;
    const filledAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO fills (id, account_id, broker_id, instrument_symbol, side, quantity, price, filled_at, order_id, liquidity, commission_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'taker', ?)
    `).run(fillId, account_id, brokerId, instrument_symbol, side, Number(quantity), Number(price), filledAt, orderId, Number(commission_usd ?? 1.50));

    logRedacted(`Simulated fill created: ${fillId} for account ${account_id}`);

    // Return updated snapshot
    const updatedSnapshot = snapshotService.getSnapshot(brokerId, account_id);
    res.status(201).json({
      message: "Fill simulated successfully",
      fill: { fillId, account_id, instrument_symbol, side, quantity, price, filledAt },
      updatedSnapshot: updatedSnapshot.accounts[0],
    });
  } catch (err: unknown) {
    res.status(500).json({ error: String(err) });
  }
});
