// Proxy mentah Yahoo Finance untuk dashboard (cache edge Vercel). Tanpa API key.
const { HOSTS, get, chartUrl } = require("./_yahoo");

module.exports = async (req, res) => {
  if (req.query.test) { // diagnosa: /api/yf?test=1
    const out = [];
    for (const s of ["BBCA.JK", "AAPL"]) {
      const r = await get(chartUrl(s, "5d"));
      out.push(`${s}: HTTP ${r.status} ${r.ok ? "OK" : r.text}`);
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(out.join("\n"));
  }
  let u;
  try { u = new URL(String(req.query.u || "")); } catch { return res.status(400).send("parameter u tidak valid"); }
  if (u.protocol !== "https:" || !HOSTS.includes(u.hostname) || !u.pathname.startsWith("/v8/finance/chart/"))
    return res.status(403).send("URL tidak diizinkan");
  const r = await get(u.toString());
  if (r.ok) {
    const live = u.searchParams.get("range") === "5d";
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", `public, max-age=0, s-maxage=${live ? 120 : 3600}, stale-while-revalidate=${live ? 300 : 7200}`);
    return res.status(200).send(r.text);
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(r.status === 404 ? 404 : 502).send(`Yahoo HTTP ${r.status}: ${r.text}`);
};
