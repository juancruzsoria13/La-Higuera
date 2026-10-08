import { cn } from "@/lib/utils";

export type FigVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Pt = [number, number];

const INK = "#1c3fd1", PINK = "#f0528c", SKY = "#5cddff", DEEP = "#0b1f6b", FLESH = "#ffc4d8";
/** Misma hoja que BrandMark, ubicada junto a la punta del higo. */
const LEAF = "M23 15C23 7 30 3 40 5c0 8-7 14-17 10Z";
const LEAF_T = "translate(62 18.5) scale(1.7)";

const CX = 100, CY = 116, R = 60;
const f = (n: number) => Math.round(n * 10) / 10;

/** Silueta: cuerpo ancho y redondo, base apenas achatada, hombros cortos y una puntita arriba. */
function fp(t: number, s: number): Pt {
  const sn = Math.sin(t), cs = Math.cos(t);
  if (sn < 0) {
    const w = 1 - 0.45 * Math.pow(-sn, 3);
    return [CX + s * R * cs * w, CY + s * (R * sn - 10 * Math.exp(-cs * cs / 0.012))];
  }
  return [CX + s * R * cs, CY + s * R * 0.88 * sn];
}
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const poly = (n: number, s: number) => Array.from({ length: n }, (_, i) => fp(-Math.PI / 2 + (i * 2 * Math.PI) / n, s));
const pathOf = (pts: Pt[], close = false) => pts.map((p, i) => `${i ? "L" : "M"}${f(p[0])} ${f(p[1])}`).join("") + (close ? "Z" : "");
const dot = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;
const sq = (x: number, y: number, s: number) => `M${f(x)} ${f(y)}h${s}v${s}h-${s}Z`;

const OUTLINE_PTS = poly(72, 1);
const OUTLINE = pathOf(OUTLINE_PTS, true);

function inside(x: number, y: number) {
  let c = false;
  for (let i = 0, j = OUTLINE_PTS.length - 1; i < OUTLINE_PTS.length; j = i++) {
    const [xi, yi] = OUTLINE_PTS[i], [xj, yj] = OUTLINE_PTS[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Geometría precalculada una sola vez por módulo.
const G = (() => {
  const v1pts = poly(14, 1);
  const v1 = { outline: pathOf(v1pts, true), anchors: [...v1pts, [101, 40] as Pt, [130, 27] as Pt].map(p => sq(p[0] - 3, p[1] - 3, 6)).join("") };

  const r3 = rng(7 + 3 * 13), spiral: Pt[] = [], turns = 6.5, steps = 900, max = turns * 2 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * max, p = fp(th - Math.PI / 2, 0.04 + 0.96 * (th / max));
    spiral.push([p[0] + (r3() - 0.5) * 1.1, p[1] + (r3() - 0.5) * 1.1]);
  }
  const scribble: Pt[] = [];
  for (let i = 0; i < 8; i++) { scribble.push([90 + i * 1.8, 46 - i * 1.1]); scribble.push([102 + i * 1.8, 36 - i * 1.1]); }
  const v3 = { spiral: pathOf(spiral), scribble: pathOf(scribble) };

  const map = [
    "........LLL..", ".......LLLL..", "......KLL....", "......B......",
    ".....BBB.....", "...BBBBBBB...", "..BBBBPBBBB..", ".BBBBPPPBBBB.",
    ".BBBPPSPPBBB.", "BBBPPSSSPPBBB", "BBPPSSPSSPPBB", "BBPPSSSSSPPBB",
    "BBBPPSSSPPBBB", ".BBBPPPPPBBB.", "..BBBBBBBBB..", "....BBBBB....",
  ];
  const c = 11, ox = (200 - 13 * c) / 2, oy = 12;
  const v4: Record<"B" | "P" | "S" | "K" | "L", string> = { B: "", P: "", S: "", K: "", L: "" };
  map.forEach((row, y) => row.split("").forEach((ch, x) => { if (ch in v4) v4[ch as keyof typeof v4] += sq(ox + x * c, oy + y * c, c); }));

  const r5 = rng(7 + 5 * 13), ball: Pt[] = [];
  for (let k = 0; k < 24; k++) {
    const cc = fp(r5() * 2 * Math.PI, r5() * 0.4);
    const rx = 16 + r5() * 28, ry = 12 + r5() * 26, rot = r5() * Math.PI, a0 = r5() * 2 * Math.PI;
    for (let i = 0; i <= 30; i++) {
      const a = a0 + (i / 30) * 2 * Math.PI, x = rx * Math.cos(a), y = ry * Math.sin(a);
      ball.push([cc[0] + x * Math.cos(rot) - y * Math.sin(rot) + (r5() - 0.5) * 2, cc[1] + 6 + x * Math.sin(rot) + y * Math.cos(rot) + (r5() - 0.5) * 2]);
    }
  }
  const ballStem: Pt[] = [];
  for (let i = 0; i <= 18; i++) { const t = i / 18; ballStem.push([100 + t * 3 + Math.sin(t * 18) * 2, 66 - t * 28]); }
  const v5 = { ball: pathOf(ball), stem: pathOf(ballStem) };

  let rings = "";
  [1, 0.8, 0.62, 0.45, 0.29, 0.14].forEach(s => {
    const n = Math.max(6, Math.round(38 * s)), r = 1.6 + 3.4 * s;
    poly(n, s).forEach(p => { rings += dot(p[0], p[1], r); });
  });
  rings += dot(CX, CY, 2.2);
  let dotStem = "";
  for (let i = 0; i < 4; i++) { const t = i / 3; dotStem += dot(100 + t * 4, 40 - t * 14, 1.4 + t * 1.4); }
  const v6 = { rings, stem: dotStem };

  const ring = poly(9, 1), center: Pt = [108, 112], faces = ["", "", "", ""];
  ring.forEach((p, i) => { faces[i % 4] += pathOf([center, p, ring[(i + 1) % ring.length]], true); });

  let halftone = "";
  const step = 4.4;
  for (let row = 0, y = 40; y < 174; y += step * 0.866, row++) {
    for (let x = 38 + ((row % 2) * step) / 2; x < 164; x += step) {
      if (!inside(x, y)) continue;
      const hl = Math.hypot(x - 80, y - 90);
      if (hl < 9) continue;
      halftone += dot(x, y, 0.3 + 2.15 * Math.min(1, hl / 82));
    }
  }
  return { v1, v3, v4, v5, v6, v8: faces, v9: halftone };
})();

const LABELS: Record<FigVariant, string> = {
  1: "Higo dibujado como trazo vectorial", 2: "Higo armado con capas superpuestas", 3: "Higo dibujado con una espiral",
  4: "Higo en pixel art", 5: "Higo dibujado como un ovillo de líneas", 6: "Higo formado por anillos de puntos",
  7: "Higo en franjas difuminadas", 8: "Higo geométrico de caras planas", 9: "Higo impreso en semitono",
};

export function Fig({ variant, className, label, style }: { variant: FigVariant; className?: string; label?: string | true; style?: React.CSSProperties }) {
  const a11y = label ? { role: "img", "aria-label": label === true ? LABELS[variant] : label } : { "aria-hidden": true as const };
  return (
    <svg viewBox="0 0 200 200" className={cn("block", className)} style={style} {...a11y}>
      {variant === 1 && <>
        <path d={G.v1.outline} fill="none" stroke={PINK} strokeWidth={1.3} />
        <path d="M100 46 L 101 40" fill="none" stroke={PINK} strokeWidth={1.3} />
        <path d={LEAF} transform={LEAF_T} fill="none" stroke={PINK} strokeWidth={0.65} />
        <path d={G.v1.anchors} fill="#111111" />
        {([[82, 40, "1"], [140, 20, "2"], [172, 104, "3"]] as const).map(([x, y, n]) => (
          <g key={n}><circle cx={x} cy={y} r={5.5} fill="none" stroke={PINK} strokeWidth={0.9} /><text x={x} y={y + 2.2} textAnchor="middle" fontSize={6.5} fontWeight={500} fontFamily="ui-monospace, monospace" fill={PINK}>{n}</text></g>
        ))}
      </>}
      {variant === 2 && <>
        <defs><clipPath id="fig-clip-2"><path d={OUTLINE} /></clipPath></defs>
        <g clipPath="url(#fig-clip-2)">
          <rect x={40} y={56} width={70} height={54} fill={INK} opacity={0.92} />
          <rect x={88} y={48} width={64} height={62} fill={PINK} opacity={0.75} />
          <rect x={58} y={92} width={84} height={40} fill={SKY} opacity={0.65} />
          <rect x={44} y={118} width={54} height={56} fill={INK} opacity={0.85} />
          <rect x={94} y={108} width={62} height={66} fill={INK} opacity={0.72} />
          <rect x={70} y={138} width={60} height={36} fill={PINK} opacity={0.6} />
          <rect x={108} y={76} width={46} height={46} fill={DEEP} opacity={0.55} />
          <rect x={52} y={72} width={32} height={30} fill={SKY} opacity={0.85} />
          <rect x={118} y={130} width={40} height={40} fill={SKY} opacity={0.5} />
        </g>
        <rect x={140} y={96} width={28} height={28} fill={INK} opacity={0.55} />
        <rect x={32} y={136} width={18} height={22} fill={PINK} opacity={0.6} />
        <rect x={96} y={36} width={8} height={10} fill={DEEP} />
        <rect x={104} y={30} width={10} height={9} fill={INK} />
        <rect x={114} y={24} width={13} height={9} fill={INK} opacity={0.85} />
        <rect x={127} y={22} width={7} height={7} fill={SKY} />
      </>}
      {variant === 3 && <>
        <path d={G.v3.spiral} fill="none" stroke={INK} strokeWidth={1.15} strokeLinejoin="round" strokeLinecap="round" />
        <path d={G.v3.scribble} fill="none" stroke="#111111" strokeWidth={1.1} strokeLinejoin="round" />
        <path d={LEAF} transform={LEAF_T} fill="none" stroke="#111111" strokeWidth={0.55} />
      </>}
      {variant === 4 && <>
        <path d={G.v4.B} fill={INK} /><path d={G.v4.P} fill={PINK} /><path d={G.v4.S} fill={FLESH} />
        <path d={G.v4.K} fill={DEEP} /><path d={G.v4.L} fill={SKY} />
      </>}
      {variant === 5 && <>
        <path d={G.v5.ball} fill="none" stroke={INK} strokeWidth={1} strokeLinejoin="round" opacity={0.92} />
        <path d={G.v5.stem} fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
      </>}
      {variant === 6 && <><path d={G.v6.rings} fill={INK} /><path d={G.v6.stem} fill="#111111" /></>}
      {variant === 7 && <>
        <defs>
          <clipPath id="fig-clip-7"><path d={OUTLINE} /></clipPath>
          <linearGradient id="fig-band-7" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={INK} stopOpacity={0} />
            <stop offset=".22" stopColor={INK} />
            <stop offset=".5" stopColor={SKY} stopOpacity={0.55} />
            <stop offset=".78" stopColor={INK} />
            <stop offset="1" stopColor={INK} stopOpacity={0} />
          </linearGradient>
          <filter id="fig-blur-7" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={2.4} /></filter>
        </defs>
        <g clipPath="url(#fig-clip-7)"><g filter="url(#fig-blur-7)">
          {[[50, 11], [69, 13], [90, 15], [113, 16], [137, 15], [159, 13]].map(([y, h]) => <rect key={y} x={30} y={y} width={140} height={h} fill="url(#fig-band-7)" />)}
        </g></g>
        <path d={LEAF} transform={LEAF_T} fill={INK} filter="url(#fig-blur-7)" opacity={0.9} />
      </>}
      {variant === 8 && <>
        <path d="M100 50 L 101 37" fill="none" stroke="#2a2a2a" strokeWidth={6} />
        <path d={G.v8[0]} fill={INK} /><path d={G.v8[1]} fill="#3557ff" /><path d={G.v8[2]} fill="#142e9c" /><path d={G.v8[3]} fill="#0f2477" />
        <path d="M78 92 L 86 100 L 79 110 L 71 101 Z M124 86 L 133 92 L 128 103 L 119 96 Z M112 142 L 122 147 L 117 158 L 107 152 Z" fill="#111111" />
      </>}
      {variant === 9 && <>
        <path d="M100 48 L 101 39" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d={LEAF} transform={LEAF_T} fill={INK} />
        <path d={G.v9} fill={INK} />
      </>}
    </svg>
  );
}

/** Higo de placeholder según el rubro del anuncio (`category_id`). */
export const categoryFig: Record<string, FigVariant> = { tecnologia: 4, muebles: 2, vehiculos: 8, otros: 6 };
