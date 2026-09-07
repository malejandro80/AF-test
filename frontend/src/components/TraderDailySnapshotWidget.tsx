import React, { useState } from "react";
import { useTraderSnapshot, AccountSnapshot } from "../hooks/useTraderSnapshot";
import { useSnapshotStream } from "../hooks/useSnapshotStream";

interface Props {
  initialBrokerId?: string;
}

export const TraderDailySnapshotWidget: React.FC<Props> = ({ initialBrokerId = "BRK-ARWP" }) => {
  const [brokerId, setBrokerId] = useState<string>(initialBrokerId);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const { data, loading, error, refetch, setData } = useTraderSnapshot(brokerId, selectedAccountId || undefined);

  // Subscribe to real-time WebSocket updates
  const { status: wsStatus } = useSnapshotStream(brokerId, selectedAccountId || undefined, (updatedSnapshot) => {
    setData(updatedSnapshot);
  });

  // Default to first account if none specifically selected from dropdown
  const selectedAccount: AccountSnapshot | undefined = selectedAccountId
    ? data?.accounts.find((a) => a.accountId === selectedAccountId)
    : data?.accounts[0];

  // Helper to format currency
  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return "$0.00";
    const formatted = Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  // Helper for P&L colors
  const pnlColorClass = (val: number) => {
    if (val > 0) return "text-emerald-400 font-semibold";
    if (val < 0) return "text-rose-500 font-semibold";
    return "text-slate-400";
  };

  // Helper for WS status badge
  const wsBadge = () => {
    switch (wsStatus) {
      case "CONNECTED":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>STREAM LIVE</span>;
      case "CONNECTING":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60"><span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>CONNECTING</span>;
      case "RECONNECTING":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60"><span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>RECONNECTING</span>;
      case "DISCONNECTED":
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60"><span className="w-2 h-2 rounded-full bg-rose-500"></span>OFFLINE</span>;
    }
  };

  // Handler for dev fill simulation
  async function handleSimulateFill() {
    if (!selectedAccount) return;
    try {
      const res = await fetch("/api/v1/dev/fills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Broker-ID": brokerId,
        },
        body: JSON.stringify({
          account_id: selectedAccount.accountId,
          instrument_symbol: "MES",
          side: "BUY",
          quantity: 2,
          price: 5643.25,
          commission_usd: 1.40,
        }),
      });
      if (res.ok) {
        refetch();
      }
    } catch {
      // fill trigger failure silent fallback
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 bg-slate-950 text-slate-100 font-sans rounded-xl border border-slate-800 shadow-2xl">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-slate-50">
              TRADER DAILY SNAPSHOT
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-800 text-slate-300 rounded">
              {brokerId}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            As of CME Cut Time: <span className="text-slate-200">{data?.asOf ?? "2026-08-25T14:30:00Z"}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {wsBadge()}
          <select
            value={brokerId}
            onChange={(e) => {
              setBrokerId(e.target.value);
              setSelectedAccountId("");
            }}
            className="bg-slate-900 text-slate-200 text-xs font-mono border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="BRK-ARWP">Broker: ArrowFin Retail (BRK-ARWP)</option>
            <option value="BRK-SMPT">Broker: Summit Prop (BRK-SMPT)</option>
            <option value="BRK-MRDN">Broker: Meridian Desk (BRK-MRDN)</option>
          </select>
        </div>
      </div>

      {/* ACCOUNT SELECTOR BAR */}
      <div className="my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Select Account:</label>
          <select
            value={selectedAccountId || data?.accounts[0]?.accountId || ""}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-slate-900 text-slate-100 text-sm font-mono border border-slate-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {data?.accounts.map((acc) => (
              <option key={acc.accountId} value={acc.accountId}>
                {acc.accountNumber} ({acc.traderName}) - {acc.accountType.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSimulateFill}
          disabled={!selectedAccount}
          className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 text-xs font-mono rounded font-medium transition disabled:opacity-50"
        >
          + Simulate Live Fill (+2 MES)
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-8 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900/60 rounded-lg border border-slate-800/50"></div>
          ))}
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="my-6 p-4 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-sm flex items-center justify-between">
          <div>
            <p className="font-bold text-rose-400">Error Loading Snapshot</p>
            <p className="text-xs mt-1 text-rose-200">{error}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs rounded transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* SNAPSHOT DASHBOARD METRICS */}
      {selectedAccount && !loading && (
        <div className="space-y-6">
          {/* HIGH RISK VISUAL CALLOUT WARNING */}
          {selectedAccount.isHighRisk && (
            <div className="p-4 rounded-lg bg-rose-950/90 border-2 border-rose-500/90 shadow-lg shadow-rose-950/50 text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-rose-600 text-white font-mono font-bold text-xs rounded uppercase tracking-wider">
                  HIGH MARGIN RISK
                </span>
                <div>
                  <h4 className="font-mono font-bold text-sm text-rose-200">
                    Account Leverage Alert ({selectedAccount.accountNumber})
                  </h4>
                  <p className="text-xs text-rose-300 mt-0.5">
                    Position Notional ({formatCurrency(selectedAccount.positionsNotionalUsd)}) exceeds 75% of account balance ({formatCurrency(selectedAccount.balance)}).
                  </p>
                </div>
              </div>
              <div className="font-mono text-right">
                <span className="text-xs text-rose-300 block">RISK SCORE</span>
                <span className="text-xl font-extrabold text-rose-400">{selectedAccount.riskScore.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* TOP METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Equity / Balance */}
            <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Account Balance</span>
              <span className="text-2xl font-bold font-mono text-slate-100 block mt-1">
                {formatCurrency(selectedAccount.balance)}
              </span>
              <span className="text-xs font-mono text-slate-400 mt-1 block">
                Buying Power: <span className="text-slate-200">{formatCurrency(selectedAccount.buyingPower)}</span>
              </span>
            </div>

            {/* Daily Realized PnL */}
            <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Realized P&L (Today)</span>
              <span className={`text-2xl font-bold font-mono block mt-1 ${pnlColorClass(selectedAccount.dailyRealizedPnl)}`}>
                {formatCurrency(selectedAccount.dailyRealizedPnl)}
              </span>
              <span className="text-xs font-mono text-slate-400 mt-1 block">
                Commissions: <span className="text-slate-300">${selectedAccount.totalCommissionsToday.toFixed(2)}</span>
              </span>
            </div>

            {/* Daily Unrealized PnL */}
            <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Unrealized P&L (Open)</span>
              <span className={`text-2xl font-bold font-mono block mt-1 ${pnlColorClass(selectedAccount.dailyUnrealizedPnl)}`}>
                {formatCurrency(selectedAccount.dailyUnrealizedPnl)}
              </span>
              <span className="text-xs font-mono text-slate-400 mt-1 block">
                Total P&L: <span className={pnlColorClass(selectedAccount.dailyTotalPnl)}>{formatCurrency(selectedAccount.dailyTotalPnl)}</span>
              </span>
            </div>

            {/* Risk Indicator Gauge */}
            <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Risk Indicator</span>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-2xl font-bold font-mono ${selectedAccount.isHighRisk ? "text-rose-400" : "text-emerald-400"}`}>
                  {selectedAccount.riskScore.toFixed(1)}%
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Notional: {formatCurrency(selectedAccount.positionsNotionalUsd)}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${selectedAccount.isHighRisk ? "bg-rose-500" : selectedAccount.riskScore > 50 ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(selectedAccount.riskScore, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* OPEN POSITIONS TABLE */}
          <div className="mt-8 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider">
                Open Position Inventory ({selectedAccount.openPositions.length})
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Max Allowed Size: {selectedAccount.maxPositionSize} contracts
              </span>
            </div>

            {selectedAccount.openPositions.length === 0 ? (
              <div className="p-8 text-center font-mono text-slate-400 text-sm">
                No active open positions for this account session.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Instrument</th>
                      <th className="px-4 py-3">Exchange</th>
                      <th className="px-4 py-3 text-right">Side / Qty</th>
                      <th className="px-4 py-3 text-right">Avg Entry Px</th>
                      <th className="px-4 py-3 text-right">Mark Px</th>
                      <th className="px-4 py-3 text-right">Point Val</th>
                      <th className="px-4 py-3 text-right">Notional USD</th>
                      <th className="px-4 py-3 text-right">Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedAccount.openPositions.map((pos) => {
                      const isLong = pos.quantity > 0;
                      return (
                        <tr key={pos.symbol} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3.5 font-bold text-slate-100">
                            {pos.symbol} <span className="text-slate-400 font-normal">({pos.description})</span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">{pos.exchange}</td>
                          <td className="px-4 py-3.5 text-right font-bold">
                            <span className={isLong ? "text-emerald-400" : "text-rose-400"}>
                              {isLong ? `LONG +${pos.quantity}` : `SHORT ${pos.quantity}`}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-200">${pos.avgEntryPrice.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-right text-slate-200">${pos.markPrice.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-right text-slate-400">${pos.pointValueUsd}/pt</td>
                          <td className="px-4 py-3.5 text-right text-slate-200">{formatCurrency(pos.notionalValueUsd)}</td>
                          <td className={`px-4 py-3.5 text-right font-bold ${pnlColorClass(pos.unrealizedPnl)}`}>
                            {formatCurrency(pos.unrealizedPnl)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
