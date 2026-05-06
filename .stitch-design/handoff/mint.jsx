// Mint page — wizard to mint a new bloom (genesis, fork, or compose).
const { useState: useStateM, useMemo: useMemoM, useEffect: useEffectM } = React;

const PARENTS = {
  "0xa3f1": { name:"Llama-3-70B", kind:"genesis" },
  "0xb27c": { name:"Mistral-Small-24B", kind:"genesis" },
  "0xc940": { name:"Qwen-2.5-32B", kind:"genesis" },
  "0xd118": { name:"Jasmine-Indo-7B", kind:"fork" },
  "0xe22a": { name:"Frangipani-Coder", kind:"fork" },
  "0xf405": { name:"Mawar-RAG", kind:"fork" },
  "0x71a8": { name:"Lotus-Reasoner", kind:"fork" },
};

function MintPage() {
  const params = new URLSearchParams(window.location.search);
  const initialFork = params.get('fork');
  const [mode, setMode] = useStateM(initialFork ? "fork" : "genesis");
  const [step, setStep] = useStateM(1);
  const [name, setName] = useStateM("");
  const [desc, setDesc] = useStateM("");
  const [license, setLicense] = useStateM("MIT");
  const [parent, setParent] = useStateM(initialFork || "0xa3f1");
  const [parent2, setParent2] = useStateM("0xe22a");
  const [royalty, setRoyalty] = useStateM(7);
  const [price, setPrice] = useStateM(0.012);
  const [files, setFiles] = useStateM([]);
  const [minted, setMinted] = useStateM(false);
  const [ratio, setRatio] = useStateM(50); // compose merge ratio: A% (0-100)
  const [uploadStage, setUploadStage] = useStateM(0); // 0=idle, 1=hashing, 2=pinning, 3=verifying, 4=done

  // staged upload progress
  useEffectM(() => {
    if (files.length === 0) { setUploadStage(0); return; }
    setUploadStage(1);
    const t1 = setTimeout(() => setUploadStage(2), 900);
    const t2 = setTimeout(() => setUploadStage(3), 1900);
    const t3 = setTimeout(() => setUploadStage(4), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [files.length]);

  const newId = useMemoM(() => {
    const seed = window.Flowers.hashSeed(name + mode + parent + Date.now().toString().slice(-4));
    const hex = Math.floor(seed()*0xffff).toString(16).padStart(4,'0');
    return `0x${hex}`;
  }, [name, mode, parent]);

  const previewKind = mode === "compose" ? "compose" : (mode === "fork" ? "fork" : "genesis");

  function onDrop(e) {
    e.preventDefault();
    const dropped = [...e.dataTransfer.files].slice(0,8);
    setFiles(f => [...f, ...dropped.map(d => ({name: d.name, size: (d.size/1024/1024).toFixed(1)+' MB'}))]);
  }
  function fakeAdd() {
    const examples = [
      {name:"checkpoint-step-2400.safetensors", size:"4.2 GB"},
      {name:"tokenizer.json", size:"3.1 MB"},
      {name:"config.json", size:"1.2 KB"},
      {name:"training-card.md", size:"8.4 KB"},
    ];
    setFiles(examples);
  }

  function next() { setStep(s => Math.min(4, s+1)); }
  function back() { setStep(s => Math.max(1, s-1)); }
  function mint() {
    setStep(4);
    setTimeout(() => setMinted(true), 1800);
  }

  return (
    <>
      <window.MekarNav active="mint" />
      <main className="mint-page">
        <div className="container">
          <header className="mint-page__head">
            <span className="eyebrow">/mint</span>
            <h1>Plant a new bloom</h1>
            <p>Register your model on the Mekar lineage. Once minted, every inference flows royalties to you and your bloom's ancestors — forever.</p>
          </header>

          {/* Stepper */}
          <ol className="mint-stepper">
            {["Choose lineage","Upload weights","Name & price","Mint"].map((label, i) => (
              <li key={i} className={`mint-stepper__step ${step === i+1 ? 'active' : ''} ${step > i+1 ? 'done' : ''}`}>
                <span className="mint-stepper__num">{step > i+1 ? "✓" : i+1}</span>
                <span className="mint-stepper__label">{label}</span>
              </li>
            ))}
          </ol>

          <div className="mint-grid">
            {/* LEFT: form */}
            <div className="mint-form">
              {step === 1 && (
                <section>
                  <h3>What kind of bloom?</h3>
                  <div className="mint-mode-grid">
                    {["genesis","fork","compose"].map(m => (
                      <button key={m} className={`mint-mode ${mode === m ? 'selected' : ''}`} onClick={() => setMode(m)}>
                        <window.Flowers.Bloom kind={m} seed={m+"-pick"} size={80} sw={1.4} style="woodcut" />
                        <strong>{m === "genesis" ? "Genesis" : m === "fork" ? "Fork" : "Composed"}</strong>
                        <span>{m === "genesis" ? "A new foundational model. No parents." : m === "fork" ? "Fine-tune of one parent." : "Merge two parents into one bloom."}</span>
                      </button>
                    ))}
                  </div>
                  {mode !== "genesis" && (
                    <div className="mint-field">
                      <label>{mode === "compose" ? "Parent A" : "Parent bloom"}</label>
                      <select value={parent} onChange={e => setParent(e.target.value)}>
                        {Object.entries(PARENTS).map(([id, p]) => (
                          <option key={id} value={id}>{p.name} · {id} · {p.kind}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {mode === "compose" && (
                    <>
                      <div className="mint-field">
                        <label>Parent B</label>
                        <select value={parent2} onChange={e => setParent2(e.target.value)}>
                          {Object.entries(PARENTS).map(([id, p]) => (
                            <option key={id} value={id}>{p.name} · {id} · {p.kind}</option>
                          ))}
                        </select>
                      </div>
                      <div className="merge-ratio">
                        <div className="merge-ratio__head">
                          <span className="merge-ratio__title">Merge ratio</span>
                          <span className="merge-ratio__pct">A <strong>{ratio}%</strong> · B <strong>{100 - ratio}%</strong></span>
                        </div>
                        <div className="merge-ratio__track">
                          <div className="merge-ratio__fill-a" style={{width: ratio + '%'}}></div>
                          <div className="merge-ratio__fill-b" style={{width: (100-ratio) + '%'}}></div>
                          <div className="merge-ratio__divider" style={{left: `calc(${ratio}% - 1px)`}}></div>
                          <input type="range" min="5" max="95" value={ratio} onChange={e => setRatio(parseInt(e.target.value))} className="merge-ratio__input" />
                        </div>
                        <div className="merge-ratio__labels">
                          <span>{PARENTS[parent]?.name || 'Parent A'}</span>
                          <span>SLERP α = {(ratio/100).toFixed(2)}</span>
                          <span>{PARENTS[parent2]?.name || 'Parent B'}</span>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              )}
              {step === 2 && (
                <section>
                  <h3>Upload weights & manifest</h3>
                  <p className="mint-hint">Drag your safetensors checkpoint, tokenizer, config, and training card. Files are hashed and pinned to 0G storage. The on-chain record stores hashes only — your weights stay yours.</p>
                  <div className="mint-drop"
                    onDragOver={e => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={fakeAdd}>
                    <window.Flowers.Bloom kind={previewKind} seed={newId+"drop"} size={80} sw={1.2} style="woodcut" />
                    <strong>Drop files here</strong>
                    <span>or click to add example files</span>
                  </div>
                  {files.length > 0 && (
                    <>
                      <ul className="mint-files">
                        {files.map((f,i) => (
                          <li key={i}>
                            <code>{f.name}</code>
                            <span>{f.size}</span>
                            <span className="mint-files__hash">sha256:a1b2…{Math.floor((i+1)*0xa3f).toString(16)}</span>
                          </li>
                        ))}
                      </ul>
                      <UploadProgress stage={uploadStage} />
                    </>
                  )}
                </section>
              )}
              {step === 3 && (
                <section>
                  <h3>Name your bloom</h3>
                  <div className="mint-field">
                    <label>Display name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cempaka-Vision-7B" />
                  </div>
                  <div className="mint-field">
                    <label>Description</label>
                    <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="A short note about what this bloom does well." />
                  </div>
                  <div className="mint-field-row">
                    <div className="mint-field">
                      <label>License</label>
                      <select value={license} onChange={e => setLicense(e.target.value)}>
                        <option>MIT</option>
                        <option>Apache-2.0</option>
                        <option>CC-BY</option>
                        <option>Llama Community</option>
                        <option>Custom</option>
                      </select>
                    </div>
                    <div className="mint-field">
                      <label>Per-inference price (USD)</label>
                      <input type="number" step="0.001" value={price} onChange={e => setPrice(parseFloat(e.target.value)||0)} />
                    </div>
                  </div>
                  <div className="mint-field">
                    <label>Your royalty cut: {royalty}%</label>
                    <input type="range" min="3" max="20" value={royalty} onChange={e => setRoyalty(+e.target.value)} />
                    <div className="mint-royalty-bar">
                      <span style={{flex: royalty}} className="mint-royalty-bar__yours">You · {royalty}%</span>
                      {mode !== "genesis" && <span style={{flex: 100-royalty-3}} className="mint-royalty-bar__ancestors">Ancestors · {100-royalty-3}%</span>}
                      {mode === "genesis" && <span style={{flex: 100-royalty-3}} className="mint-royalty-bar__pool">Compute pool · {100-royalty-3}%</span>}
                      <span style={{flex: 3}} className="mint-royalty-bar__protocol">Protocol · 3%</span>
                    </div>
                  </div>
                </section>
              )}
              {step === 4 && (
                <section className="mint-confirm">
                  {!minted ? (
                    <>
                      <div className="mint-spin">
                        <window.Flowers.Bloom kind={previewKind} seed={newId} size={140} sw={1.6} style="woodcut" />
                      </div>
                      <h3>Minting…</h3>
                      <p>Submitting transaction to 0G mainnet · ERC-7857 contract<br/>This usually takes 4–6 seconds.</p>
                      <ol className="mint-progress">
                        <li className="done">✓ Pinned weights to 0G storage</li>
                        <li className="done">✓ Hashed manifest, signed by your wallet</li>
                        <li className="active">⟳ Waiting for block inclusion…</li>
                        <li>○ Royalty split deployed</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <div className="mint-spin mint-spin--done">
                        <window.Flowers.Bloom kind={previewKind} seed={newId} size={180} sw={1.8} style="woodcut" />
                      </div>
                      <span className="eyebrow">Bloomed · block #4,219,308</span>
                      <h3>{name || "Untitled bloom"} is live</h3>
                      <code className="mint-confirm__hash">{newId}</code>
                      <p>Your bloom is now in the lineage garden. It will earn from every inference, forever.</p>
                      <div className="mint-confirm__actions">
                        <a className="btn btn--primary" href={`Agent.html?id=${newId}`}>View your bloom →</a>
                        <a className="btn btn--ghost" href="Dashboard.html">Go to dashboard</a>
                      </div>
                    </>
                  )}
                </section>
              )}

              {step < 4 && (
                <div className="mint-actions">
                  {step > 1 && <button className="btn btn--ghost" onClick={back}>← Back</button>}
                  <div style={{flex:1}}></div>
                  {step < 3 && <button className="btn btn--primary" onClick={next}>Continue →</button>}
                  {step === 3 && <button className="btn btn--primary" onClick={mint} disabled={!name.trim()}>Mint bloom</button>}
                </div>
              )}
            </div>

            {/* RIGHT: live preview */}
            <aside className="mint-preview">
              <div className="mint-preview__sticky">
                <span className="eyebrow">Preview</span>
                <div className="mint-preview__bloom">
                  <window.Flowers.Bloom kind={previewKind} seed={newId} size={180} sw={1.6} style="woodcut" />
                </div>
                <h4>{name || "Your unnamed bloom"}</h4>
                <code className="mint-preview__hash">{newId}</code>
                <dl className="mint-preview__stats">
                  <div><dt>Type</dt><dd>{mode}</dd></div>
                  {mode !== "genesis" && <div><dt>Parent</dt><dd>{PARENTS[parent]?.name || parent}</dd></div>}
                  {mode === "compose" && <div><dt>+ Parent</dt><dd>{PARENTS[parent2]?.name || parent2}</dd></div>}
                  <div><dt>Files</dt><dd>{files.length} pinned</dd></div>
                  <div><dt>License</dt><dd>{license}</dd></div>
                  <div><dt>Price</dt><dd>${price.toFixed(3)}</dd></div>
                  <div><dt>Your cut</dt><dd>{royalty}%</dd></div>
                </dl>
                <div className="mint-preview__cost">
                  <span>Mint fee (one-time)</span>
                  <strong>0.04 0G</strong>
                </div>
                <div className="mint-preview__cost">
                  <span>Storage deposit</span>
                  <strong>0.12 0G</strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <window.MekarFooter />
      <window.MekarTweaksPanel />
    </>
  );
}

function UploadProgress({ stage }) {
  // 1 hashing, 2 pinning to 0G, 3 verifying, 4 done
  const steps = [
    { label: "Hashing files locally", hash: "sha256:a1b2c3…" },
    { label: "Pinning to 0G Storage", hash: "0g://stor/Qm9f3…" },
    { label: "Verifying chunks on DA layer", hash: "0g-da://shard-7" },
    { label: "Manifest sealed", hash: "0xmnfst:bloom-ready" },
  ];
  return (
    <div className="upload-progress">
      <ul className="upload-progress__list">
        {steps.map((s, i) => {
          const isDone = stage > i + 1 || (stage === 4 && i < 4);
          const isActive = stage === i + 1;
          const cls = `upload-progress__item ${isDone ? 'upload-progress__item--done' : ''} ${isActive ? 'upload-progress__item--active' : ''}`;
          return (
            <li key={i} className={cls}>
              <span className="upload-progress__dot"></span>
              <span>{s.label}</span>
              <span className="upload-progress__hash">{(isDone || isActive) ? s.hash : '—'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MintPage />);
