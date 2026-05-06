// Procedural SVG flower generator. Each bloom is seeded by a hash string.
// Multiple visual styles selectable via Flowers.setStyle("style-name").

const Flowers = (() => {
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return ((h >>> 0) % 100000) / 100000;
    };
  }

  // ─────────────────────────────────────────────────────────────
  // STYLE A — "INK LINE" (default). Clean William Morris linework,
  // soft fills, editorial.
  // ─────────────────────────────────────────────────────────────
  function petalLine(rng, length, width, bend) {
    const tipX = bend * (rng() - 0.5) * length * 0.3;
    const tipY = -length;
    return `M 0 0 C ${-width} ${-length*0.35} ${-width*0.6} ${-length*0.85} ${tipX} ${tipY} C ${width*0.6} ${-length*0.85} ${width} ${-length*0.35} 0 0 Z`;
  }
  function inkGenesis(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    for (let i = 0; i < 5; i++) {
      const a = (360/5)*i + rng()*8;
      p += `<path d="${petalLine(rng, 38+rng()*6, 14+rng()*4, 1)}" transform="rotate(${a})" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${o.sw}" stroke-linejoin="round" />`;
    }
    for (let i = 0; i < 5; i++) {
      const a = (360/5)*i + 36;
      p += `<path d="${petalLine(rng, 22+rng()*4, 9+rng()*2, 1)}" transform="rotate(${a})" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${o.sw}" stroke-linejoin="round" />`;
    }
    p += `<circle r="9" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${o.sw}" />`;
    p += `<circle r="6" fill="none" stroke="${o.gold}" stroke-width="0.8" />`;
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI*2*i)/7;
      p += `<circle cx="${Math.cos(a)*4}" cy="${Math.sin(a)*4}" r="0.9" fill="${o.stroke}" />`;
    }
    return p;
  }
  function inkFork(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    for (let i = 0; i < 5; i++) {
      const a = (360/5)*i + rng()*40;
      p += `<path d="${petalLine(rng, 24+rng()*4, 8+rng()*2, 0.6)}" transform="rotate(${a})" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${o.sw}" stroke-linejoin="round" />`;
    }
    p += `<circle r="4.5" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${o.sw}" />`;
    return p;
  }
  function inkCompose(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    const ringA = 11 + Math.floor(rng()*3);
    const ringB = 8 + Math.floor(rng()*3);
    for (let i = 0; i < ringA; i++) {
      const a = (360/ringA)*i;
      p += `<path d="${petalLine(rng, 26+rng()*4, 6+rng()*1.5, 0.4)}" transform="rotate(${a})" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${o.sw}" stroke-linejoin="round" />`;
    }
    for (let i = 0; i < ringB; i++) {
      const a = (360/ringB)*i + 15;
      p += `<path d="${petalLine(rng, 16+rng()*3, 5+rng(), 0.4)}" transform="rotate(${a})" fill="${o.coral}" stroke="${o.stroke}" stroke-width="${o.sw}" stroke-linejoin="round" />`;
    }
    p += `<circle r="5" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${o.sw}" />`;
    p += `<circle r="2.5" fill="${o.gold}" />`;
    return p;
  }

  // ─────────────────────────────────────────────────────────────
  // STYLE B — "WOODCUT". Bold black outlines, hatching detail,
  // limited fill palette. Block-print feel.
  // ─────────────────────────────────────────────────────────────
  function woodPetal(length, width) {
    return `M 0 0 C ${-width} ${-length*0.4} ${-width*0.4} ${-length} 0 ${-length} C ${width*0.4} ${-length} ${width} ${-length*0.4} 0 0 Z`;
  }
  function woodHatch(length, width, rng) {
    let h = "";
    const lines = 3 + Math.floor(rng()*2);
    for (let i = 1; i <= lines; i++) {
      const y = -length * (0.2 + i*0.15);
      const x = width * (0.5 - i*0.08);
      h += `<line x1="${-x}" y1="${y}" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="0.6" stroke-linecap="round" opacity="0.5" />`;
    }
    return h;
  }
  function woodGenesis(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.6;
    for (let i = 0; i < 6; i++) {
      const a = (360/6)*i;
      p += `<g transform="rotate(${a})" color="${o.stroke}">`
        + `<path d="${woodPetal(40, 14)}" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`
        + woodHatch(40, 14, rng)
        + `</g>`;
    }
    for (let i = 0; i < 6; i++) {
      const a = (360/6)*i + 30;
      p += `<path d="${woodPetal(22, 9)}" transform="rotate(${a})" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw*0.8}" stroke-linejoin="round" />`;
    }
    p += `<circle r="10" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="6" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw*0.6}" />`;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI*2*i)/8;
      p += `<line x1="${Math.cos(a)*6}" y1="${Math.sin(a)*6}" x2="${Math.cos(a)*9.5}" y2="${Math.sin(a)*9.5}" stroke="${o.stroke}" stroke-width="${sw*0.5}" />`;
    }
    return p;
  }
  function woodFork(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.4;
    for (let i = 0; i < 6; i++) {
      const a = (360/6)*i;
      p += `<g transform="rotate(${a})" color="${o.stroke}">`
        + `<path d="${woodPetal(26, 10)}" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`
        + woodHatch(26, 10, rng)
        + `</g>`;
    }
    p += `<circle r="6" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI*2*i)/6;
      p += `<line x1="${Math.cos(a)*3}" y1="${Math.sin(a)*3}" x2="${Math.cos(a)*5.5}" y2="${Math.sin(a)*5.5}" stroke="${o.stroke}" stroke-width="${sw*0.5}" />`;
    }
    return p;
  }
  function woodCompose(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.4;
    for (let i = 0; i < 8; i++) {
      const a = (360/8)*i;
      p += `<g transform="rotate(${a})" color="${o.stroke}">`
        + `<path d="${woodPetal(28, 8)}" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`
        + woodHatch(28, 8, rng)
        + `</g>`;
    }
    for (let i = 0; i < 8; i++) {
      const a = (360/8)*i + 22.5;
      p += `<g transform="rotate(${a})" color="${o.stroke}">`
        + `<path d="${woodPetal(18, 6)}" fill="${o.coral}" stroke="${o.stroke}" stroke-width="${sw*0.8}" stroke-linejoin="round" />`
        + woodHatch(18, 6, rng)
        + `</g>`;
    }
    p += `<circle r="6" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="3" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw*0.6}" />`;
    return p;
  }

  // ─────────────────────────────────────────────────────────────
  // STYLE C — "WATERCOLOR". Soft layered washes, no hard outlines,
  // slight blur, painterly.
  // ─────────────────────────────────────────────────────────────
  function softPetal(rng, length, width) {
    return `M 0 0 C ${-width*1.1} ${-length*0.3} ${-width*0.7} ${-length*0.95} 0 ${-length} C ${width*0.7} ${-length*0.95} ${width*1.1} ${-length*0.3} 0 0 Z`;
  }
  function watercolorBloom(seed, opts) {
    const rng = hashSeed(seed);
    const { count, lenA, lenB, fillA, fillB, fillC, glow } = opts;
    let p = `<defs>
      <filter id="blur-${seed.replace(/[^a-z0-9]/gi,'')}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
    </defs>`;
    // glow
    p += `<circle r="${lenA*0.9}" fill="${glow}" opacity="0.35" />`;
    // outer layer
    for (let i = 0; i < count; i++) {
      const a = (360/count)*i + rng()*4;
      p += `<path d="${softPetal(rng, lenA, lenA*0.42)}" transform="rotate(${a})" fill="${fillA}" opacity="0.8" filter="url(#blur-${seed.replace(/[^a-z0-9]/gi,'')})" />`;
    }
    // inner layer
    for (let i = 0; i < count; i++) {
      const a = (360/count)*i + (180/count);
      p += `<path d="${softPetal(rng, lenB, lenB*0.45)}" transform="rotate(${a})" fill="${fillB}" opacity="0.85" />`;
    }
    p += `<circle r="${lenB*0.25}" fill="${fillC}" opacity="0.85" />`;
    return p;
  }
  function waterGenesis(seed, o) {
    return watercolorBloom(seed, { count:6, lenA:42, lenB:24, fillA:o.gold, fillB:o.pink, fillC:o.forest, glow:o.gold });
  }
  function waterFork(seed, o) {
    return watercolorBloom(seed, { count:5, lenA:26, lenB:14, fillA:o.pink, fillB:o.coral, fillC:o.gold, glow:o.pink });
  }
  function waterCompose(seed, o) {
    return watercolorBloom(seed, { count:9, lenA:30, lenB:18, fillA:o.gold, fillB:o.coral, fillC:o.forest, glow:o.coral });
  }

  // ─────────────────────────────────────────────────────────────
  // STYLE D — "GEOMETRIC". Flat, hard-edge, mid-century. Like
  // Saul Bass meets a botanical poster. No strokes, just shapes.
  // ─────────────────────────────────────────────────────────────
  function geoPetal(length, width) {
    // Almond shape with 4 corners
    return `M 0 0 L ${-width} ${-length*0.5} L 0 ${-length} L ${width} ${-length*0.5} Z`;
  }
  function geoGenesis(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    for (let i = 0; i < 8; i++) {
      const a = (360/8)*i;
      p += `<path d="${geoPetal(38, 11)}" transform="rotate(${a})" fill="${o.gold}" />`;
    }
    for (let i = 0; i < 8; i++) {
      const a = (360/8)*i + 22.5;
      p += `<path d="${geoPetal(22, 8)}" transform="rotate(${a})" fill="${o.pink}" />`;
    }
    p += `<circle r="9" fill="${o.forest}" />`;
    p += `<circle r="4.5" fill="${o.gold}" />`;
    p += `<circle r="2" fill="${o.forest}" />`;
    return p;
  }
  function geoFork(seed, o) {
    let p = "";
    for (let i = 0; i < 6; i++) {
      const a = (360/6)*i;
      p += `<path d="${geoPetal(24, 8)}" transform="rotate(${a})" fill="${o.pink}" />`;
    }
    p += `<circle r="5" fill="${o.gold}" />`;
    p += `<circle r="2" fill="${o.forest}" />`;
    return p;
  }
  function geoCompose(seed, o) {
    let p = "";
    for (let i = 0; i < 10; i++) {
      const a = (360/10)*i;
      p += `<path d="${geoPetal(28, 7)}" transform="rotate(${a})" fill="${o.gold}" />`;
    }
    for (let i = 0; i < 10; i++) {
      const a = (360/10)*i + 18;
      p += `<path d="${geoPetal(16, 5)}" transform="rotate(${a})" fill="${o.coral}" />`;
    }
    p += `<circle r="6" fill="${o.forest}" />`;
    return p;
  }

  // ─────────────────────────────────────────────────────────────
  // STYLE E — "BATIK". Stamp-pattern feel; concentric outlines,
  // dotted detail, only outlined shapes (no fill on petals).
  // ─────────────────────────────────────────────────────────────
  function batikPetalDouble(length, width) {
    const inner = 0.65;
    const outer = `M 0 0 C ${-width} ${-length*0.35} ${-width*0.5} ${-length*0.9} 0 ${-length} C ${width*0.5} ${-length*0.9} ${width} ${-length*0.35} 0 0 Z`;
    const inn = `M 0 ${-length*0.1} C ${-width*inner*0.9} ${-length*0.4} ${-width*inner*0.4} ${-length*0.85} 0 ${-length*inner-3} C ${width*inner*0.4} ${-length*0.85} ${width*inner*0.9} ${-length*0.4} 0 ${-length*0.1} Z`;
    return outer + " " + inn;
  }
  function batikGenesis(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.3;
    for (let i = 0; i < 8; i++) {
      const a = (360/8)*i;
      const length = 40, width = 12;
      p += `<g transform="rotate(${a})">`;
      // outer petal
      p += `<path d="M 0 0 C ${-width} ${-length*0.35} ${-width*0.5} ${-length*0.9} 0 ${-length} C ${width*0.5} ${-length*0.9} ${width} ${-length*0.35} 0 0 Z" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
      // inner outline
      p += `<path d="M 0 -4 C ${-width*0.6} ${-length*0.35} ${-width*0.3} ${-length*0.85} 0 ${-length*0.85} C ${width*0.3} ${-length*0.85} ${width*0.6} ${-length*0.35} 0 -4 Z" fill="none" stroke="${o.stroke}" stroke-width="${sw*0.6}" />`;
      // dot
      p += `<circle cy="${-length*0.5}" r="1.4" fill="${o.stroke}" />`;
      p += `</g>`;
    }
    p += `<circle r="11" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="8" fill="none" stroke="${o.gold}" stroke-width="${sw*0.5}" />`;
    p += `<circle r="5" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw*0.6}" />`;
    p += `<circle r="2" fill="${o.forest}" />`;
    // dot ring outside
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI*2*i)/16;
      p += `<circle cx="${Math.cos(a)*48}" cy="${Math.sin(a)*48}" r="0.9" fill="${o.stroke}" />`;
    }
    return p;
  }
  function batikFork(seed, o) {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.2;
    for (let i = 0; i < 6; i++) {
      const a = (360/6)*i;
      const length = 24, width = 9;
      p += `<g transform="rotate(${a})">`;
      p += `<path d="M 0 0 C ${-width} ${-length*0.35} ${-width*0.5} ${-length*0.9} 0 ${-length} C ${width*0.5} ${-length*0.9} ${width} ${-length*0.35} 0 0 Z" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
      p += `<circle cy="${-length*0.55}" r="1.2" fill="${o.stroke}" />`;
      p += `</g>`;
    }
    p += `<circle r="6" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="2" fill="${o.forest}" />`;
    return p;
  }
  function batikCompose(seed, o) {
    let p = "";
    const sw = o.sw * 1.2;
    for (let i = 0; i < 10; i++) {
      const a = (360/10)*i;
      const length = 28, width = 8;
      p += `<path d="M 0 0 C ${-width} ${-length*0.35} ${-width*0.5} ${-length*0.9} 0 ${-length} C ${width*0.5} ${-length*0.9} ${width} ${-length*0.35} 0 0 Z" transform="rotate(${a})" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    }
    for (let i = 0; i < 10; i++) {
      const a = (360/10)*i + 18;
      p += `<path d="M 0 0 C ${-6} ${-7} ${-3} ${-15} 0 ${-16} C ${3} ${-15} ${6} ${-7} 0 0 Z" transform="rotate(${a})" fill="${o.coral}" stroke="${o.stroke}" stroke-width="${sw*0.8}" stroke-linejoin="round" />`;
    }
    p += `<circle r="6" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="2.5" fill="${o.gold}" />`;
    return p;
  }

  // Stages used in "How it works" — work across styles
  function bud(o) {
    const sw = o.sw * 1.2;
    return `<path d="M 0 6 C -10 6 -12 -10 0 -22 C 12 -10 10 6 0 6 Z" fill="${o.green}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />
      <path d="M 0 -22 C -3 -16 -3 -8 0 -2" fill="none" stroke="${o.stroke}" stroke-width="${sw*0.6}" />
      <path d="M 0 -22 C 3 -16 3 -8 0 -2" fill="none" stroke="${o.stroke}" stroke-width="${sw*0.6}" />
      <path d="M -10 14 C -8 12 -4 12 0 14" fill="${o.green}" stroke="${o.stroke}" stroke-width="${sw*0.7}" />`;
  }
  function opening(o) {
    const sw = o.sw * 1.2;
    let p = "";
    for (let i = 0; i < 5; i++) {
      const a = -90 + i*22 - 44;
      p += `<path d="M 0 0 C -10 -7 -10 -22 0 -28 C 10 -22 10 -7 0 0 Z" transform="rotate(${a})" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    }
    return `<g transform="translate(0,-4)">${p}</g>
      <circle cy="-2" r="3.5" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" />`;
  }
  function scatter(o) {
    const sw = o.sw * 1.2;
    let p = "";
    for (let i = 0; i < 5; i++) {
      const a = (360/5)*i;
      p += `<path d="M 0 0 C -9 -7 -9 -18 0 -22 C 9 -18 9 -7 0 0 Z" transform="rotate(${a})" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    }
    let s = "";
    [[-22,18],[-10,28],[4,22],[16,30],[22,14],[-18,36],[10,38]].forEach(([x,y])=>{
      s += `<circle cx="${x}" cy="${y}" r="2" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw*0.5}" />`;
    });
    return `<g transform="translate(0,-6)">${p}</g><circle cy="-6" r="3.5" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />${s}`;
  }

  // Logo stays consistent: a clean lotus with the M monogram so the brand mark
  // doesn't change every time the user picks a different bloom style.
  function logo(o) {
    const sw = o.sw * 0.6;
    let p = "";
    // Seamless lotus mark: petals built as one continuous scalloped silhouette,
    // not separately stacked. Geometry scaled to fit a -half..half viewBox of
    // size 36 (so the bloom must live within roughly ±16 units).

    const N = 5;
    const peakR = 16;
    const valleyR = 8;
    function pt(angle, r) {
      const rad = (angle - 90) * Math.PI / 180;
      return [Math.cos(rad) * r, Math.sin(rad) * r];
    }
    let outerD = "";
    for (let i = 0; i < N; i++) {
      const aPeak = (360 / N) * i;
      const aValley = aPeak + (360 / N) / 2;
      const aValleyPrev = aPeak - (360 / N) / 2;
      const [vx, vy] = pt(aValley, valleyR);
      const [vxp, vyp] = pt(aValleyPrev, valleyR);
      const [cp1x, cp1y] = pt(aPeak - 14, peakR * 0.95);
      const [cp2x, cp2y] = pt(aPeak + 14, peakR * 0.95);
      if (i === 0) outerD += `M ${vxp} ${vyp} `;
      outerD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${vx} ${vy} `;
    }
    outerD += "Z";
    p += `<path d="${outerD}" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw * 1.4}" stroke-linejoin="round" />`;

    // Radial veins (no boxy hatching)
    for (let i = 0; i < N; i++) {
      const aPeak = (360 / N) * i;
      const [tipX, tipY] = pt(aPeak, peakR * 0.78);
      const [innerX, innerY] = pt(aPeak, 5);
      p += `<line x1="${innerX}" y1="${innerY}" x2="${tipX}" y2="${tipY}" stroke="${o.stroke}" stroke-width="${sw * 0.6}" opacity="0.55" stroke-linecap="round" />`;
    }

    // Inner scalloped silhouette
    const peakR2 = 8;
    const valleyR2 = 4.2;
    let innerD = "";
    for (let i = 0; i < N; i++) {
      const aPeak = (360 / N) * i + 36;
      const aValley = aPeak + (360 / N) / 2;
      const aValleyPrev = aPeak - (360 / N) / 2;
      const [vx, vy] = pt(aValley, valleyR2);
      const [vxp, vyp] = pt(aValleyPrev, valleyR2);
      const [cp1x, cp1y] = pt(aPeak - 14, peakR2 * 0.95);
      const [cp2x, cp2y] = pt(aPeak + 14, peakR2 * 0.95);
      if (i === 0) innerD += `M ${vxp} ${vyp} `;
      innerD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${vx} ${vy} `;
    }
    innerD += "Z";
    p += `<path d="${innerD}" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw * 1.2}" stroke-linejoin="round" />`;

    // Center stamen
    p += `<circle r="2.4" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="1.1" fill="${o.gold}" />`;

    return p;
  }

  // Style registry
  const STYLES = {
    ink:    { genesis: inkGenesis,   fork: inkFork,   compose: inkCompose },
    woodcut:{ genesis: woodGenesis,  fork: woodFork,  compose: woodCompose },
    watercolor:{ genesis: waterGenesis, fork: waterFork, compose: waterCompose },
    geometric:{ genesis: geoGenesis, fork: geoFork,   compose: geoCompose },
    batik:  { genesis: batikGenesis, fork: batikFork, compose: batikCompose },
  };

  let currentStyle = "woodcut";
  function setStyle(s) {
    if (STYLES[s]) currentStyle = s;
  }

  function defaultPalette() {
    return {
      stroke: "#3d2817",
      gold:   "#d4a437",
      pink:   "#f5b7a0",
      coral:  "#c25a4a",
      forest: "#1c3b2f",
      green:  "#6b8a4b",
      sw: 1.2,
    };
  }

  function Bloom({ kind = "genesis", seed = "abc", size = 120, palette, sw, style, className, styleAttr, ...rest }) {
    const half = size / 2;
    const useStyle = style || currentStyle;
    const opts = { ...defaultPalette(), ...(palette||{}), sw: sw ?? 1.2 };
    let inner = "";
    if (kind === "logo") inner = logo(opts);
    else if (kind === "bud") inner = bud(opts);
    else if (kind === "opening") inner = opening(opts);
    else if (kind === "scatter") inner = scatter(opts);
    else {
      const set = STYLES[useStyle] || STYLES.ink;
      const fn = set[kind] || set.genesis;
      inner = fn(seed, opts);
    }
    return (
      <svg
        viewBox={`-${half} -${half} ${size} ${size}`}
        width={size}
        height={size}
        className={className}
        style={styleAttr}
        {...rest}
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    );
  }

  function Petal({ size = 40, rotate = 0, color = "#f5b7a0", stroke = "#3d2817", style }) {
    const half = size / 2;
    const rng = hashSeed("petal-" + rotate);
    return (
      <svg viewBox={`-${half} -${half} ${size} ${size}`} width={size} height={size} style={style}>
        <path
          d={petalLine(rng, size*0.42, size*0.16, 0.6)}
          transform={`rotate(${rotate})`}
          fill={color}
          stroke={stroke}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return { Bloom, Petal, hashSeed, setStyle, get currentStyle() { return currentStyle; } };
})();

window.Flowers = Flowers;
