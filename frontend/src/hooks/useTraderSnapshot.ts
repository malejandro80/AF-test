import { useState, useEffect, useCallback } from "react";

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
  riskScore: number;
  isHighRisk: boolean;
  openPositions: OpenPosition[];
  asOf: string;
}

export interface SnapshotResponse {
  brokerId: string;
  asOf: string;
  accounts: AccountSnapshot[];
}

export function useTraderSnapshot(brokerId: string = "BRK-ARWP", accountId?: string) {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = accountId
        ? `/api/v1/snapshot?account_id=${encodeURIComponent(accountId)}`
        : `/api/v1/snapshot`;

      // Try proxy first, then fallback to direct port 4000
      let res: Response;
      try {
        res = await fetch(endpoint, {
          headers: {
            "Content-Type": "application/json",
            "X-Broker-ID": brokerId,
          },
        });
        if (!res.ok && res.status === 404) {
          throw new Error("Proxy 404");
        }
      } catch {
        res = await fetch(`http://localhost:4000${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            "X-Broker-ID": brokerId,
          },
        });
      }

      const text = await res.text();
      if (!text || text.trim().length === 0) {
        throw new Error(`HTTP ${res.status}: Server returned empty response`);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${res.status}: Invalid JSON response format from server`);
      }

      if (!res.ok) {
        throw new Error(parsed.message || parsed.error || `HTTP ${res.status}: Failed to fetch snapshot`);
      }

      setData(parsed as SnapshotResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [brokerId, accountId]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { data, loading, error, refetch: fetchSnapshot, setData };
}
