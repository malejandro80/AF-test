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
      const url = accountId
        ? `/api/v1/snapshot?account_id=${encodeURIComponent(accountId)}`
        : `/api/v1/snapshot`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-Broker-ID": brokerId,
        },
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `HTTP ${res.status}: Failed to fetch snapshot`);
      }

      const json: SnapshotResponse = await res.json();
      setData(json);
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
