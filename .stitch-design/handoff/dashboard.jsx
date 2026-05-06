// Dashboard — owner portfolio of the connected wallet.
const { useState: useStateD, useMemo: useMemoD, useEffect: useEffectD } = React;

// Wallet 0x6b…3a4f's portfolio
const MY_BLOOMS = [
  { id:"0xa3f1", name:"Llama-3-70B", kind:"genesis", inferences24h:18420, earnings24h:331.56, total:48221, status:"healthy" },
  { id:"0xd118", name:"Jasmine-Indo-7B", kind:"fork", inferences24h:1240, earnings24h:4.96, total:3012, status:"healthy" },
  { id:"0x9d3f", name:"Marigold-Compose", kind:"compose", inferences24h:144, earnings24h:0.72, total:388, status:"new" },
];

const ROYALTIES_IN = [
  { from:"0xd118", name:"Jasmine-Indo-7B", reason:"descendant of Llama-3-70B", today:0.74, total:182.4 },
  { from:"0xe22a", name:"Frangipani-Coder", reason:"descendant of Llama-3-70B", today:1.21, total:294.1 },
  { from:"0x9d3f", name:"Marigold-Compose", reason:"grandchild of Llama-3-70B", today:0.04, total:8.2 },
];

const ACTIVITY = [
  { t:"just now", kind:"infer", text:"Inference settled · Llama-3-70B · 0xab…12 paid $0.018" },
  { t:"4s", kind:"royalty", text:"Royalty received · 0.0009 0G from Frangipani-Coder" },
  { t:"22s", kind:"infer", text:"Inference settled · Jasmine-Indo-7B · 0x44…0a paid $0.004" },
  { t:"1m", kind:"royalty", text:"Royalty received · 0.0021 0G from Marigold-Compose" },
  { t:"3m", kind:"infer", text:"Inference settled · Llama-3-70B · 0x91…ee paid $0.018" },
  { t:"7m", kind:"fork", text:"Someone forked Jasmine-Indo-7B → 0x4c2e (Anggrek-Edu)" },
  { t:"14m", kind:"infer", text:"Inference settled · Marigold-Compose · 0x07…4d paid $0.005" },
  { t:"22m", kind:"royalty", text:"Royalty received · 0.0014 0G from Kembang-Sepatu (great-grandchild)" },
];

const KIND_ICON = {
  infer: "◐",
  royalty: "✿",
  fork: "↳",
};

function usd(n) { return "$" + n.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}

// A 7-day spark grid — rendered as a tiny botanical "garden bed"
function GardenBed({ data }) {
  const max = Math.max(...data, 1);
  return (
    <div className="garden-bed">
      {data.map((v, i) => {
        const h = (v / max) * 100;
        return (
          <div key={i} className="garden-bed__stem" style={{height: `${h}%`}}>
            <span className="garden-bed__bloom" style={{transform: `scale(${0.6 + h/200})`}}>✿</span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardPage() {
  const [tab, setTab] = useStateD("blooms");
  const [feed, setFeed] = useStateD(() => ACTIVITY.map((a, i) => ({...a, key: 'init-'+i})));
  const [paused, setPaused] = useStateD(false);

  // Stream new activity in every 2.5s when on activity tab
  useEffectD(() => {
    if (tab !== "activity") return;
    const TEMPLATES = [
      { kind:"infer", text:(amt) => `Inference settled · Llama-3-70B · 0x${Math.floor(Math.random()*0xffff).toString(16).padStart(4,'0')}…${Math.floor(Math.random()*0xff).toString(16)} paid $${amt}` , amts:["0.018","0.018","0.018"] },
      { kind:"infer", text:(amt) => `Inference settled · Jasmine-Indo-7B · 0x${Math.floor(Math.random()*0xffff).toString(16).padStart(4,'0')}…${Math.floor(Math.random()*0xff).toString(16)} paid $${amt}`, amts:["0.004","0.004"] },
      { kind:"royalty", text:() => `Royalty received · ${(Math.random()*0.003).toFixed(4)} 0G from Frangipani-Coder` },
      { kind:"royalty", text:() => `Royalty received · ${(Math.random()*0.002).toFixed(4)} 0G from Marigold-Compose` },
      { kind:"infer", text:(amt) => `Inference settled · Marigold-Compose · 0x${Math.floor(Math.random()*0xffff).toString(16).padStart(4,'0')}…${Math.floor(Math.random()*0xff).toString(16)} paid $${amt}`, amts:["0.005","0.005"] },
      { kind:"fork", text:() => {
        const names = ["Anggrek-Edu","Cempaka-Vision","Wijaya-Code","Bunga-Bahasa","Sakura-Mini"];
        const name = names[Math.floor(Math.random()*names.length)];
        return `Someone forked Jasmine-Indo-7B → 0x${Math.floor(Math.random()*0xffff).toString(16).padStart(4,'0')} (${name})`;
      }},
    ];
    const id = setInterval(() => {
      if (paused) return;
      const tpl = TEMPLATES[Math.floor(Math.random()*TEMPLATES.length)];
      const amt = tpl.amts ? tpl.amts[Math.floor(Math.random()*tpl.amts.length)] : null;
      const newItem = {
        kind: tpl.kind,
        text: amt ? tpl.text(amt) : tpl.text(),
        t: "just now",
        key: 'live-' + Date.now() + '-' + Math.random(),
      };
      setFeed(prev => {
        // Age existing entries
        const aged = prev.map(p => ({...p, t: p.t === "just now" ? "1s" : p.t === "1s" ? "3s" : p.t === "3s" ? "8s" : p.t === "8s" ? "15s" : p.t === "15s" ? "32s" : p.t}));
        return [newItem, ...aged].slice(0, 14);
      });
    }, 2400);
    return () => clearInterval(id);
  }, [tab, paused]);


  const totalEarnings24h = MY_BLOOMS.reduce((s, b) => s + b.earnings24h, 0)
    + ROYALTIES_IN.reduce((s, r) => s + r.today, 0);
  const totalInferences24h = MY_BLOOMS.reduce((s, b) => s + b.inferences24h, 0);
  const totalLifetime = MY_BLOOMS.reduce((s, b) => s + b.total, 0)
    + ROYALTIES_IN.reduce((s, r) => s + r.total, 0);

  // Procedural 7-day series
  const seriesData = useMemoD(() => {
    const r = window.Flowers.hashSeed("0x6b3a4f");
    return Array.from({length:7}, () => 250 + r() * 200);
  }, []);

  return (
    <>
      <window.MekarNav active="dashboard" />
      <main className="dash-page">
        <div className="container">
          <header className="dash-page__head">
            <div>
              <span className="eyebrow">/dashboard · 0x6b…3a4f</span>
              <h1>Your garden</h1>
              <p>{MY_BLOOMS.length} blooms · {ROYALTIES_IN.length} royalty streams · steward since block #2,104,772</p>
            </div>
            <div className="dash-page__actions">
              <a className="btn btn--ghost" href="Explorer.html">Explore the garden</a>
              <a className="btn btn--primary" href="Mint.html">+ Plant new bloom</a>
            </div>
          </header>

          {/* KPI strip */}
          <section className="dash-kpis">
            <div className="dash-kpi dash-kpi--accent">
              <div className="dash-kpi__label">Earnings · 24h</div>
              <div className="dash-kpi__num">{usd(totalEarnings24h)}</div>
              <div className="dash-kpi__sub">+12.4% vs yesterday</div>
              <div className="dash-kpi__bed">
                <GardenBed data={seriesData} />
              </div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi__label">Inferences · 24h</div>
              <div className="dash-kpi__num">{fmt(totalInferences24h)}</div>
              <div className="dash-kpi__sub">across {MY_BLOOMS.length} blooms</div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi__label">Lifetime · all sources</div>
              <div className="dash-kpi__num">{usd(totalLifetime)}</div>
              <div className="dash-kpi__sub">since you minted Llama-3-70B</div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi__label">Pending withdrawal</div>
              <div className="dash-kpi__num">{usd(42.18)}</div>
              <div className="dash-kpi__sub">
                <button className="dash-kpi__withdraw">Withdraw to wallet →</button>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="dash-tabs">
            {["blooms","royalties","activity"].map(t => (
              <button key={t} className={`dash-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === "blooms" ? "My blooms" : t === "royalties" ? "Royalty streams" : "Activity"}
                <span className="dash-tab__count">{t === "blooms" ? MY_BLOOMS.length : t === "royalties" ? ROYALTIES_IN.length : ACTIVITY.length}</span>
              </button>
            ))}
          </div>

          {tab === "blooms" && (
            <section className="dash-blooms">
              {MY_BLOOMS.map(b => (
                <a key={b.id} className="dash-bloom-card" href={`Agent.html?id=${b.id}`}>
                  <div className="dash-bloom-card__bloom">
                    <window.Flowers.Bloom kind={b.kind} seed={b.id} size={120} sw={1.4} style="woodcut" />
                  </div>
                  <div className="dash-bloom-card__body">
                    <span className="eyebrow">{b.kind}</span>
                    <h3>{b.name}</h3>
                    <code>{b.id}</code>
                    <dl>
                      <div><dt>24h inferences</dt><dd>{fmt(b.inferences24h)}</dd></div>
                      <div><dt>24h earnings</dt><dd>{usd(b.earnings24h)}</dd></div>
                      <div><dt>Lifetime</dt><dd>{usd(b.total)}</dd></div>
                    </dl>
                    <span className={`dash-status dash-status--${b.status}`}>● {b.status === 'healthy' ? 'Healthy · serving' : 'New · warming up'}</span>
                  </div>
                </a>
              ))}
            </section>
          )}

          {tab === "royalties" && (
            <section className="dash-royalties">
              <p className="dash-royalties__intro">These blooms are descendants of yours. Every inference they serve sends a small petal of value back up the lineage.</p>
              <table className="agent-table">
                <thead>
                  <tr><th>Bloom</th><th>Why you earn</th><th>Today</th><th>Lifetime</th></tr>
                </thead>
                <tbody>
                  {ROYALTIES_IN.map(r => (
                    <tr key={r.from}>
                      <td>
                        <a href={`Agent.html?id=${r.from}`} className="dash-royalty-row">
                          <window.Flowers.Bloom kind="fork" seed={r.from} size={36} sw={1.2} style="woodcut" />
                          <span>
                            <strong>{r.name}</strong>
                            <code>{r.from}</code>
                          </span>
                        </a>
                      </td>
                      <td>{r.reason}</td>
                      <td>{usd(r.today)}</td>
                      <td>{usd(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === "activity" && (
            <section className="dash-activity">
              <ul className="dash-activity-feed">
                {feed.map((a) => (
                  <li key={a.key} className={`dash-activity__item dash-activity__item--${a.kind} dash-activity__item--enter`}>
                    <span className="dash-activity__time">{a.t}</span>
                    <span className="dash-activity__icon">{KIND_ICON[a.kind]}</span>
                    <span className="dash-activity__text">{a.text}</span>
                  </li>
                ))}
              </ul>
              <div className="dash-activity__live">
                <span className="dash-activity__livedot"></span>
                Live · streaming from 0G mainnet · paused on hover
              </div>
            </section>
          )}
        </div>
      </main>
      <window.MekarFooter />
      <window.MekarTweaksPanel />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DashboardPage />);
