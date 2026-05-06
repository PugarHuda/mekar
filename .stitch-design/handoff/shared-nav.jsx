// Shared nav + footer chrome for the multi-page Mekar prototype.
// Pages mount these around their own content.

const { useState: useStateN, useEffect: useEffectN } = React;

function MekarNav({ active = "" }) {
  // Auto-detect current page if `active` not explicitly set, so each page lights up correctly.
  const detected = (() => {
    if (active) return active;
    try {
      const path = (window.location.pathname.split('/').pop() || '').toLowerCase();
      if (path.startsWith('explorer')) return 'explorer';
      if (path.startsWith('agent'))    return 'explorer';
      if (path.startsWith('trending')) return 'trending';
      if (path.startsWith('mint'))     return 'mint';
      if (path.startsWith('dashboard'))return 'dashboard';
      return 'home';
    } catch { return 'home'; }
  })();
  const [wallet, setWallet] = useStateN(() => {
    try { return localStorage.getItem('mekar-wallet') || null; } catch { return null; }
  });
  function toggle() {
    if (wallet) { setWallet(null); localStorage.removeItem('mekar-wallet'); }
    else {
      const w = "0x6b…3a4f";
      setWallet(w); localStorage.setItem('mekar-wallet', w);
    }
  }
  const links = [
    { href: "Landing.html", label: "Home", k: "home" },
    { href: "Explorer.html", label: "Explorer", k: "explorer" },
    { href: "Trending.html", label: "Trending", k: "trending" },
    { href: "Mint.html", label: "Mint", k: "mint" },
    { href: "Dashboard.html", label: "Dashboard", k: "dashboard" },
    { href: "Manifesto.html", label: "Manifesto", k: "manifesto" },
  ];
  return (
    <nav className="nav">
      <div className="nav__inner">
        <a href="Landing.html" className="nav__brand">
          <window.Flowers.Bloom kind="logo" size={36} sw={1.6} style="woodcut" />
          <span>Mekar<sup style={{fontSize: 10, color: 'var(--ink-soft)', marginLeft: 4, fontStyle: 'normal'}}>♦</sup></span>
        </a>
        <div className="nav__links">
          {links.map(l => (
            <a key={l.k} href={l.href} className={detected === l.k ? "active" : ""}>{l.label}</a>
          ))}
        </div>
        <button className="nav__connect" onClick={toggle}>
          <window.Flowers.Bloom kind="logo" size={18} sw={2} style="woodcut" />
          <span>{wallet || "Connect wallet"}</span>
        </button>
      </div>
    </nav>
  );
}

function MekarFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div style={{display:'flex', alignItems:'center', gap: 10, fontFamily:'var(--display)', fontStyle:'italic', fontSize: 24}}>
              <window.Flowers.Bloom kind="logo" size={32} sw={1.6} style="woodcut" />
              Mekar
            </div>
            <p>A public ledger of AI parentage, built on the 0G network.<br/>Every agent has a lineage. Every inference pays its ancestors.</p>
          </div>
          <div className="footer__col"><h4>Protocol</h4><ul><li><a href="#">Whitepaper</a></li><li><a href="#">ERC-7857</a></li><li><a href="#">Audits</a></li></ul></div>
          <div className="footer__col"><h4>Network</h4><ul><li><a href="#">0G mainnet</a></li><li><a href="#">Testnet faucet</a></li><li><a href="#">Bridge</a></li></ul></div>
          <div className="footer__col"><h4>Build</h4><ul><li><a href="#">SDK</a></li><li><a href="#">CLI</a></li><li><a href="#">GitHub</a></li></ul></div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 Mekar Labs · Bandung & Singapore</span>
          <span>v0.4.2 · ERC-7857 / 0G mainnet</span>
        </div>
      </div>
    </footer>
  );
}

window.MekarNav = MekarNav;
window.MekarFooter = MekarFooter;
