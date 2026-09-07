import db from "../db.js";

export interface OpenPosition {
  symbol: string;
  description: string;
  exchange: string;
  quantity: number;
  avgEntryPrice: number;
  markPrice: number;
  pointValueUsd: number;
  unrealizedPnl: number;
  notionalValueUsd: number;
}

export interface AccountSnapshot {
  accountId: string;
  accountNumber: string;
  accountType: string;
  status: string;
  brokerId: string;
  traderId: string;
  traderName: string;
  balance: number;
  buyingPower: number;
  maxPositionSize: number;
  dailyRealizedPnl: number;
  dailyUnrealizedPnl: number;
  dailyTotalPnl: number;
  totalCommissionsToday: number;
  positionsNotionalUsd: number;
  riskScore: number; // 0 to 100
  isHighRisk: boolean; // riskScore > 75
  openPositions: OpenPosition[];
  asOf: string;
}

export interface SnapshotResponse {
  brokerId: string;
  asOf: string;
  accounts: AccountSnapshot[];
}

export const DATASET_CUT_TIME = "2026-08-25T14:30:00Z";
export const SESSION_START_TIME = "2026-08-24T22:00:00Z";

interface FillRow {
  id: string;
  account_id: string;
  broker_id: string;
  instrument_symbol: string;
  side: string;
  quantity: number;
  price: number;
  filled_at: string;
  order_id: string;
  commission_usd: number;
  point_value_usd: number;
}

interface InstrumentRow {
  symbol: string;
  description: string;
  exchange: string;
  point_value_usd: number;
  tick_size: number;
  tick_value_usd: number;
}

interface PriceRow {
  symbol: string;
  mark_price: number;
  as_of: string;
}

interface AccountRow {
  id: string;
  trader_id: string;
  broker_id: string;
  account_number: string;
  account_type: string;
  balance: number;
  buying_power: number;
  max_position_size: number;
  status: string;
  first_name: string;
  last_name: string;
}

export class SnapshotService {
  /**
   * Generates a daily trader snapshot with strict multi-tenant filtering by broker_id.
   * If accountId is provided, returns snapshot specifically for that account (verified against broker_id).
   */
  public getSnapshot(brokerId: string, targetAccountId?: string): SnapshotResponse {
    if (!brokerId) {
      throw new Error("ERR_TENANT_REQUIRED: broker_id must be provided for multi-tenant isolation");
    }

    // 1. Fetch accounts strictly scoped to broker_id
    let accountQuery = `
      SELECT a.*, t.first_name, t.last_name
      FROM accounts a
      JOIN traders t ON a.trader_id = t.id
      WHERE a.broker_id = ?
    `;
    const params: (string | number)[] = [brokerId];

    if (targetAccountId) {
      accountQuery += ` AND a.id = ?`;
      params.push(targetAccountId);
    }

    const accountRows = db.prepare(accountQuery).all(...params) as AccountRow[];

    if (targetAccountId && accountRows.length === 0) {
      throw new Error(`ERR_TENANT_ACCESS_DENIED: Account ${targetAccountId} not found or access denied for broker ${brokerId}`);
    }

    // 2. Fetch instruments & market prices
    const instruments = db.prepare("SELECT * FROM instruments").all() as InstrumentRow[];
    const prices = db.prepare("SELECT * FROM market_prices").all() as PriceRow[];

    const instMap = new Map<string, InstrumentRow>();
    instruments.forEach(i => instMap.set(i.symbol, i));

    const priceMap = new Map<string, number>();
    prices.forEach(p => priceMap.set(p.symbol, p.mark_price));

    // 3. Compute snapshot per account
    const accountSnapshots: AccountSnapshot[] = accountRows.map(acc => {
      // Query fills strictly scoped to broker_id and account_id up to cut time
      const fills = db.prepare(`
        SELECT f.*, i.point_value_usd
        FROM fills f
        JOIN instruments i ON f.instrument_symbol = i.symbol
        WHERE f.broker_id = ? AND f.account_id = ? AND f.filled_at <= ?
        ORDER BY f.filled_at ASC
      `).all(brokerId, acc.id, DATASET_CUT_TIME) as FillRow[];

      const posState = new Map<string, { qty: number; costBasisTotal: number }>();
      let dailyRealizedPnl = 0;
      let totalCommissionsToday = 0;

      fills.forEach(f => {
        const sym = f.instrument_symbol;
        if (!posState.has(sym)) {
          posState.set(sym, { qty: 0, costBasisTotal: 0 });
        }
        const currentPos = posState.get(sym)!;
        const ptVal = f.point_value_usd;
        const qty = f.quantity;
        const px = f.price;
        const comm = f.commission_usd;
        const isToday = f.filled_at >= SESSION_START_TIME;

        if (isToday) {
          totalCommissionsToday += comm;
        }

        const sideMult = f.side === "BUY" ? 1 : -1;
        const fillQty = sideMult * qty;
        const currentQty = currentPos.qty;

        // Position tracking: opening/expanding vs closing/reducing
        if (currentQty === 0 || Math.sign(currentQty) === Math.sign(fillQty)) {
          currentPos.qty += fillQty;
          currentPos.costBasisTotal += fillQty * px;
        } else {
          // Closing or reversing
          const closingQty = Math.min(Math.abs(currentQty), Math.abs(fillQty)) * Math.sign(fillQty);
          const avgEntryPx = currentPos.costBasisTotal / currentQty;
          
          if (isToday) {
            // Realized P&L formula: (exit_px - entry_px) * closed_contracts * point_value - commission
            const tradeGross = (px - avgEntryPx) * (-closingQty) * ptVal;
            dailyRealizedPnl += tradeGross - comm;
          }

          currentPos.qty += fillQty;
          if (currentPos.qty === 0) {
            currentPos.costBasisTotal = 0;
          } else {
            // If flipped or remaining
            const isFlipped = Math.sign(currentPos.qty) === Math.sign(fillQty);
            currentPos.costBasisTotal = currentPos.qty * (isFlipped ? px : avgEntryPx);
          }
        }
      });

      // 4. Calculate open positions & unrealized P&L
      const openPositions: OpenPosition[] = [];
      let dailyUnrealizedPnl = 0;
      let positionsNotionalUsd = 0;

      posState.forEach((pos, sym) => {
        if (pos.qty !== 0) {
          const inst = instMap.get(sym);
          const markPx = priceMap.get(sym) ?? 0;
          const ptVal = inst ? inst.point_value_usd : 1;
          const avgEntryPx = pos.costBasisTotal / pos.qty;
          const unpnl = (markPx - avgEntryPx) * pos.qty * ptVal;
          const notional = Math.abs(pos.qty * markPx * ptVal);

          dailyUnrealizedPnl += unpnl;
          positionsNotionalUsd += notional;

          openPositions.push({
            symbol: sym,
            description: inst ? inst.description : sym,
            exchange: inst ? inst.exchange : "CME",
            quantity: pos.qty,
            avgEntryPrice: parseFloat(avgEntryPx.toFixed(4)),
            markPrice: markPx,
            pointValueUsd: ptVal,
            unrealizedPnl: parseFloat(unpnl.toFixed(2)),
            notionalValueUsd: parseFloat(notional.toFixed(2)),
          });
        }
      });

      const balance = acc.balance;
      // Risk indicator formula: min(100, abs(positions_notional) / account_balance * 100)
      const riskScore = balance > 0
        ? Math.min(100, (positionsNotionalUsd / balance) * 100)
        : 100;
      
      const isHighRisk = riskScore > 75;
      const dailyTotalPnl = dailyRealizedPnl + dailyUnrealizedPnl;

      return {
        accountId: acc.id,
        accountNumber: acc.account_number,
        accountType: acc.account_type,
        status: acc.status,
        brokerId: acc.broker_id,
        traderId: acc.trader_id,
        traderName: `${acc.first_name} ${acc.last_name}`,
        balance: parseFloat(balance.toFixed(2)),
        buyingPower: parseFloat(acc.buying_power.toFixed(2)),
        maxPositionSize: acc.max_position_size,
        dailyRealizedPnl: parseFloat(dailyRealizedPnl.toFixed(2)),
        dailyUnrealizedPnl: parseFloat(dailyUnrealizedPnl.toFixed(2)),
        dailyTotalPnl: parseFloat(dailyTotalPnl.toFixed(2)),
        totalCommissionsToday: parseFloat(totalCommissionsToday.toFixed(2)),
        positionsNotionalUsd: parseFloat(positionsNotionalUsd.toFixed(2)),
        riskScore: parseFloat(riskScore.toFixed(2)),
        isHighRisk,
        openPositions,
        asOf: DATASET_CUT_TIME,
      };
    });

    return {
      brokerId,
      asOf: DATASET_CUT_TIME,
      accounts: accountSnapshots,
    };
  }
}
