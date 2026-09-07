import test, { describe, it } from "node:test";
import assert from "node:assert";
import { SnapshotService } from "./snapshotService.js";

describe("SnapshotService Multi-Tenant & P&L Engine", () => {
  const service = new SnapshotService();

  it("should calculate correct daily snapshot for Retail Broker (BRK-ARWP)", () => {
    const res = service.getSnapshot("BRK-ARWP");
    assert.strictEqual(res.brokerId, "BRK-ARWP");
    assert.ok(res.accounts.length > 0);

    const account = res.accounts.find((a) => a.accountId === "ACC-1001");
    assert.ok(account);
    assert.strictEqual(account.balance, 52480.25);
    assert.ok(account.riskScore >= 0 && account.riskScore <= 100);
    assert.strictEqual(typeof account.dailyRealizedPnl, "number");
    assert.strictEqual(typeof account.dailyUnrealizedPnl, "number");
  });

  it("should enforce high-risk indicator callout when risk score > 75", () => {
    // ACC-1006 under BRK-SMPT has high position leverage (Risk Score > 75)
    const res = service.getSnapshot("BRK-SMPT", "ACC-1006");
    assert.strictEqual(res.accounts.length, 1);
    const acc = res.accounts[0];
    assert.strictEqual(acc.accountId, "ACC-1006");
    assert.ok(acc.riskScore > 75);
    assert.strictEqual(acc.isHighRisk, true);
  });

  it("should STOP cross-tenant data leakage (P0 Multi-Tenant Security Guard)", () => {
    // Attempt to request ACC-1006 (belongs to BRK-SMPT) using BRK-ARWP tenant context
    assert.throws(
      () => {
        service.getSnapshot("BRK-ARWP", "ACC-1006");
      },
      (err: Error) => err.message.includes("ERR_TENANT_ACCESS_DENIED")
    );
  });

  it("should respect point_value_usd multiplier in positions notional calculation", () => {
    const res = service.getSnapshot("BRK-SMPT", "ACC-1006");
    const acc = res.accounts[0];

    // Verify open positions contain point value multiplier
    acc.openPositions.forEach((pos) => {
      assert.ok(pos.pointValueUsd > 0);
      assert.strictEqual(
        pos.notionalValueUsd,
        Math.abs(pos.quantity * pos.markPrice * pos.pointValueUsd)
      );
    });
  });
});
