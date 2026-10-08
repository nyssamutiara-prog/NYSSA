// GET /api/nyssa?view=all|metrics|signals|positions|trades|watchlist
//   &symbols=BBCA,BMRI (opsional)  &rsi=14  &range=1y|2y|5y  &limit=100 (jumlah trade)
const { TICKERS, stats, loadAll, round } = require("./_nyssa");

const VIEWS = ["all", "metrics", "signals", "positions", "trades", "watchlist"];
const r2 = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" ? round(v) : v]));

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const q = req.query, view = String(q.view || "all"), range = String(q.range || "2y"), n = Number(q.rsi || 14), limit = Math.min(Number(q.limit || 100), 1000);
  const bad = m => res.status(400).json({ error: m });
  if (!VIEWS.includes(view)) return bad("view harus salah satu dari: " + VIEWS.join(", "));
  if (!["1y", "2y", "5y"].includes(range)) return bad("range harus 1y, 2y, atau 5y");
  if (!Number.isInteger(n) || n < 2 || n > 50) return bad("rsi harus bilangan bulat 2 sampai 50");
  if (!Number.isInteger(limit) || limit < 1) return bad("limit tidak valid");
  const syms = q.symbols
    ? [...new Set(String(q.symbols).split(",").map(s => s.trim().toUpperCase().replace(/\.JK$/, "")).filter(s => /^[A-Z0-9]{2,6}$/.test(s)))].slice(0, 100)
    : TICKERS;
  if (!syms.length) return bad("symbols tidak valid");

  const { results, failed } = await loadAll(syms, range, n);
  if (!results.length) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Tidak ada data yang berhasil dimuat dari Yahoo Finance", failed });
  }
  const out = { meta: { generatedAt: new Date().toISOString(), source: "Yahoo Finance", strategy: "RSI cross 50 (Buy cross atas, Sell cross bawah)", rsiPeriod: n, range, requested: syms.length, loaded: results.length, failed } };
  if (view === "all" || view === "metrics") {
    const { _pt, ...m } = stats(results);
    out.metrics = r2(m);
    out.equity = _pt.map(v => round(v, 4)); // kurva ekuitas gabungan (bobot sama)
  }
  if (view === "all" || view === "signals") out.signals = results.flatMap(x => x.signals).map(r2).sort((a, b) => b.date.localeCompare(a.date));
  if (view === "all" || view === "positions") out.positions = results.map(x => x.position).filter(Boolean).map(r2).sort((a, b) => b.floatingPct - a.floatingPct);
  if (view === "all" || view === "watchlist") out.watchlist = results.map(x => ({ symbol: x.symbol, last: round(x.last, 0), changePct: round(x.changePct), rsi: round(x.rsi, 1), cagrPct: round(x.cagrPct), position: x.position ? "LONG" : "FLAT" })).sort((a, b) => a.symbol.localeCompare(b.symbol));
  if (view === "all" || view === "trades") {
    const all = results.flatMap(x => x.trades).sort((a, b) => b.exitDate.localeCompare(a.exitDate));
    out.tradesTotal = all.length;
    out.trades = all.slice(0, limit).map(r2);
  }
  res.setHeader("Cache-Control", `public, max-age=0, s-maxage=${failed.length ? 60 : 120}, stale-while-revalidate=300`);
  res.status(200).json(out);
};
