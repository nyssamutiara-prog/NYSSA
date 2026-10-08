# NYSSA di Vercel

Struktur: `index.html` (dashboard), `api/yf.js` (proxy mentah Yahoo untuk dashboard), `api/nyssa.js` (API hasil strategi), `lib/` (kode bersama). Tidak perlu build.

## Deploy
GitHub: unggah folder ini, buka vercel.com/new, Import repo, Deploy. CLI: `npm i -g vercel`, `vercel login`, `vercel --prod`.
Yahoo tidak butuh token. Token Vercel hanya untuk deploy otomatis (simpan sebagai secret `VERCEL_TOKEN` di CI), jangan masuk ke kode.

## API: GET /api/nyssa
| Parameter | Nilai | Default |
|---|---|---|
| view | all, metrics, signals, positions, trades, watchlist | all |
| symbols | kode dipisah koma, mis. BBCA,BMRI (maks 100) | 100 saham KOMPAS100 |
| rsi | 2 sampai 50 | 14 |
| range | 1y, 2y, 5y | 2y |
| limit | jumlah trade yang dikembalikan (maks 1000) | 100 |

Contoh:
- `/api/nyssa?view=metrics` ringkasan 10 metrik (net profit %, CAGR, AVG PNL, profit factor, AVG win/loss, winning rate, max drawdown, AVG bar held win/loss)
- `/api/nyssa?view=signals` sinyal 5 bar terakhir (`status`: `pending_next_bar` = sinyal bar terbaru, dieksekusi di bar berikutnya)
- `/api/nyssa?view=positions` posisi aktif beserta floating %
- `/api/nyssa?view=trades&symbols=BBCA&limit=20` riwayat trade
- `/api/nyssa?symbols=BBCA` semuanya untuk satu saham (cepat)

Bentuk respons: `{ meta:{generatedAt, loaded, requested, failed[]}, metrics, signals, positions, watchlist, trades, tradesTotal }`. Nilai `null` berarti tidak terhitung (mis. profit factor tanpa loss).

Respons di-cache 2 menit di edge Vercel. Panggilan penuh (100 saham) bisa memakan beberapa detik; untuk respons cepat gunakan `symbols`.

## Diagnosa Yahoo
`/api/yf?test=1` harus menampilkan `BBCA.JK: HTTP 200 OK`. `HTTP 429` berarti Yahoo membatasi IP server.
