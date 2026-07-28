"use client";

import { useCallback, useEffect, useState } from "react";

type Status = {
  connected: boolean;
  nextOrderIdReady: boolean;
  managedAccounts: string[];
};

type Proposal = {
  id: string;
  status: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  limit_price: number;
  currency: string;
  rationale: string;
  risk_checks: Array<{ name: string; passed: boolean; detail: unknown }>;
};

const inputClass = "rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none";
const buttonClass = "rounded-lg border border-white/15 px-4 py-2 text-sm font-medium disabled:opacity-50";

export function IbkrDashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [account, setAccount] = useState<Record<string, unknown> | null>(null);
  const [positions, setPositions] = useState<Array<Record<string, unknown>>>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ symbol: "AAPL", side: "BUY", quantity: "1", limitPrice: "1", currency: "USD", rationale: "Validación manual del circuito supervisado de ForgeOS." });

  const api = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`/api/broker${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? body.detail ?? "Broker error");
    return body as T;
  }, []);

  const refresh = useCallback(async () => {
    const [nextStatus, nextProposals] = await Promise.all([
      api<Status>("/api/ibkr/status"),
      api<Proposal[]>("/api/proposals"),
    ]);
    setStatus(nextStatus);
    setProposals(nextProposals);
  }, [api]);

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, [refresh]);

  async function connect() {
    setBusy(true);
    try {
      setStatus(await api<Status>("/api/ibkr/connect", { method: "POST", body: "{}" }));
      setMessage("Conexión con IB Gateway establecida.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo conectar");
    } finally {
      setBusy(false);
    }
  }

  async function loadPortfolio() {
    setBusy(true);
    try {
      const [nextAccount, nextPositions] = await Promise.all([
        api<Record<string, unknown>>("/api/ibkr/account"),
        api<Array<Record<string, unknown>>>("/api/ibkr/positions"),
      ]);
      setAccount(nextAccount);
      setPositions(nextPositions);
      setMessage("Cuenta y posiciones actualizadas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo leer la cartera");
    } finally {
      setBusy(false);
    }
  }

  async function createProposal(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/proposals", {
        method: "POST",
        body: JSON.stringify({
          symbol: form.symbol,
          side: form.side,
          quantity: Number(form.quantity),
          order_type: "LMT",
          limit_price: Number(form.limitPrice),
          currency: form.currency,
          exchange: "SMART",
          rationale: form.rationale,
          strategy_id: "manual-supervised",
        }),
      });
      await refresh();
      setMessage("Propuesta creada. Todavía no se ha enviado ninguna orden.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la propuesta");
    } finally {
      setBusy(false);
    }
  }

  async function decide(proposal: Proposal, decision: "APPROVE" | "REJECT") {
    setBusy(true);
    try {
      const response = await api<{ approvalToken?: string; executionConfirmationPhrase?: string }>(`/api/proposals/${proposal.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, confirmation_phrase: `${decision} ${proposal.id}` }),
      });
      if (decision === "APPROVE" && response.approvalToken && response.executionConfirmationPhrase) {
        const typed = window.prompt(`ORDEN REAL SUPERVISADA\n\n${proposal.side} ${proposal.quantity} ${proposal.symbol} @ ${proposal.limit_price} ${proposal.currency}\n\nEscribe exactamente:\n${response.executionConfirmationPhrase}`);
        if (typed === response.executionConfirmationPhrase) {
          await api(`/api/proposals/${proposal.id}/execute`, {
            method: "POST",
            body: JSON.stringify({ approval_token: response.approvalToken, confirmation_phrase: typed }),
          });
          setMessage("Orden transmitida a IBKR. Comprueba su estado en IB Gateway.");
        } else {
          setMessage("Propuesta aprobada, pero no ejecutada.");
        }
      } else {
        setMessage("Propuesta rechazada.");
      }
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la decisión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">ForgeOS Capital</p>
            <h1 className="mt-2 text-3xl font-semibold">Interactive Brokers</h1>
            <p className="mt-2 text-sm text-white/55">Modo real supervisado · órdenes limitadas · doble confirmación</p>
          </div>
          <div className="flex gap-2">
            <button className={buttonClass} disabled={busy} onClick={connect}>Conectar</button>
            <button className={buttonClass} disabled={busy || !status?.connected} onClick={loadPortfolio}>Actualizar cartera</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Estado" value={status?.connected ? "Conectado" : "Desconectado"} />
          <Metric label="Order ID" value={status?.nextOrderIdReady ? "Preparado" : "No disponible"} />
          <Metric label="Cuenta" value={status?.managedAccounts?.join(", ") || "—"} />
        </div>
        {message && <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/75">{message}</div>}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={createProposal} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Nueva propuesta</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputClass} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="Símbolo" />
            <select className={inputClass} value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}><option value="BUY">Comprar</option><option value="SELL">Vender</option></select>
            <input className={inputClass} type="number" min="0.0001" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Cantidad" />
            <input className={inputClass} type="number" min="0.0001" step="any" value={form.limitPrice} onChange={(e) => setForm({ ...form, limitPrice: e.target.value })} placeholder="Precio límite" />
            <select className={inputClass} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option></select>
          </div>
          <textarea className={`${inputClass} min-h-28 w-full`} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} />
          <button className={buttonClass} disabled={busy}>Crear sin ejecutar</button>
        </form>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Cartera</h2>
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-black/25 p-3 text-xs text-white/65">{JSON.stringify(account, null, 2)}</pre>
          <div className="mt-4 space-y-2">{positions.map((position, index) => <pre key={index} className="overflow-auto rounded-lg bg-black/20 p-3 text-xs text-white/65">{JSON.stringify(position, null, 2)}</pre>)}</div>
        </section>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold">Propuestas y control humano</h2>
        {proposals.map((proposal) => (
          <article key={proposal.id} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><strong>{proposal.side} {proposal.quantity} {proposal.symbol}</strong><p className="text-sm text-white/55">Límite {proposal.limit_price} {proposal.currency} · {proposal.status}</p></div>
              <code className="text-xs text-white/40">{proposal.id}</code>
            </div>
            <p className="mt-3 text-sm text-white/70">{proposal.rationale}</p>
            <div className="mt-3 grid gap-1 text-xs text-white/55">{proposal.risk_checks.map((check) => <div key={check.name}>{check.passed ? "✓" : "✕"} {check.name}: {JSON.stringify(check.detail)}</div>)}</div>
            {proposal.status === "PENDING" && <div className="mt-4 flex gap-2"><button className={buttonClass} disabled={busy} onClick={() => decide(proposal, "APPROVE")}>Aprobar y revisar ejecución</button><button className={buttonClass} disabled={busy} onClick={() => decide(proposal, "REJECT")}>Rechazar</button></div>}
          </article>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-white/40">{label}</p><p className="mt-2 font-medium">{value}</p></div>;
}
