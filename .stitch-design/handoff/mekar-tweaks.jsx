// Shared Mekar tweaks panel — used by every page.
// Same tweak schema and behavior; each page just mounts <MekarTweaksPanel />.

const MEKAR_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "cream",
  "typeset": "cormorant",
  "density": "default",
  "bloomStyle": "woodcut",
  "heroTreatment": "woodcut",
  "season": "day"
}/*EDITMODE-END*/;

function MekarTweaksPanel() {
  const [t, setTweak] = window.useTweaks(MEKAR_TWEAK_DEFAULTS);

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = t.palette === "cream" ? "" : t.palette;
    root.dataset.typeset = t.typeset;
    root.dataset.density = t.density;
    if (window.Flowers && window.Flowers.setStyle) window.Flowers.setStyle(t.bloomStyle || "woodcut");
    root.dataset.bloomStyle = t.bloomStyle || "woodcut";
    root.dataset.heroTreatment = t.heroTreatment || "woodcut";
    if (t.season && t.season !== "day") document.body.dataset.season = t.season;
    else delete document.body.dataset.season;
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: t }));
  }, [t]);

  const { TweaksPanel, TweakSection, TweakRadio, TweakSelect } = window;
  if (!TweaksPanel) return null;

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Palette" />
      <TweakSelect
        label="Theme"
        value={t.palette}
        options={[
          { value: "cream", label: "Cream paper" },
          { value: "espresso", label: "Espresso (dark)" },
          { value: "frangipani", label: "Frangipani" },
          { value: "pressed", label: "Pressed (muted)" },
        ]}
        onChange={v => setTweak('palette', v)}
      />
      <TweakSection label="Typography" />
      <TweakSelect
        label="Pairing"
        value={t.typeset}
        options={[
          { value: "cormorant", label: "Cormorant + Manrope" },
          { value: "playfair", label: "Playfair + Inter" },
          { value: "dmserif", label: "DM Serif + DM Sans" },
          { value: "fraunces", label: "Fraunces + Manrope" },
        ]}
        onChange={v => setTweak('typeset', v)}
      />
      <TweakSection label="Bloom style" />
      <TweakSelect
        label="Garden flowers"
        value={t.bloomStyle}
        options={[
          { value: "ink", label: "Ink line (Morris)" },
          { value: "woodcut", label: "Woodcut block-print" },
          { value: "watercolor", label: "Watercolor wash" },
          { value: "geometric", label: "Geometric (Saul Bass)" },
          { value: "batik", label: "Batik stamp" },
        ]}
        onChange={v => setTweak('bloomStyle', v)}
      />
      <TweakSection label="Layout" />
      <TweakRadio
        label="Density"
        value={t.density}
        options={["compact", "default", "airy"]}
        onChange={v => setTweak('density', v)}
      />
      <TweakSection label="Garden season" />
      <TweakRadio
        label="Time of day"
        value={t.season}
        options={["day", "dusk", "night"]}
        onChange={v => setTweak('season', v)}
      />
    </TweaksPanel>
  );
}

window.MekarTweaksPanel = MekarTweaksPanel;
