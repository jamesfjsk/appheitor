import type { NpcId } from '../../types/village';
import { isNightHour } from '../../utils/clock';

export type NpcSpotMap = Record<string, Record<string, { x: number; y: number } | null | undefined>>;

export interface NpcRoutine {
  hidden: boolean;
  sitting: boolean;
  spot: string;
  sign: string | null;
  facing: 1 | -1;
}

export interface NpcWalk {
  x: number;
  y: number;
  walking: boolean;
  step: 0 | 1;
}

export interface NpcTouch {
  jump: boolean;
  talking: boolean;
  waving: boolean;
}

/** Rotina por hora. Comerciante some às 21h; Sábio senta à noite. */
export function npcRoutine(npc: NpcId, hour: number): NpcRoutine {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  if (npc === 'comerciante') {
    if (h >= 21 || h < 7) {
      return { hidden: true, sitting: false, spot: 'night', sign: 'volta às 7h', facing: 1 };
    }
    if (h < 12) return { hidden: false, sitting: false, spot: 'morning', sign: null, facing: 1 };
    return { hidden: false, sitting: false, spot: 'afternoon', sign: null, facing: -1 };
  }
  if (npc === 'sabio') {
    if (isNightHour(h)) return { hidden: false, sitting: true, spot: 'night', sign: null, facing: -1 };
    return { hidden: false, sitting: false, spot: 'day', sign: null, facing: 1 };
  }
  return { hidden: false, sitting: false, spot: 'home', sign: null, facing: 1 };
}

export function npcTarget(
  npc: NpcId,
  hour: number,
  spots: NpcSpotMap | undefined,
  fallback: { x: number; y: number }
): { x: number; y: number; hidden: boolean; sitting: boolean; sign: string | null } {
  const r = npcRoutine(npc, hour);
  const pos = spots?.[npc]?.[r.spot];
  return {
    x: pos?.x ?? fallback.x,
    y: pos?.y ?? fallback.y,
    hidden: r.hidden,
    sitting: r.sitting,
    sign: r.sign,
  };
}

const WALK_PX_PER_SEC = 24;

export function npcWalk(
  from: { x: number; y: number },
  to: { x: number; y: number },
  elapsedSec: number,
  reducedMotion: boolean
): NpcWalk {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (reducedMotion || dist < 1) return { x: to.x, y: to.y, walking: false, step: 0 };
  const t = Math.min(1, (elapsedSec * WALK_PX_PER_SEC) / dist);
  const walking = t < 1;
  return {
    x: from.x + dx * t,
    y: from.y + dy * t,
    walking,
    step: walking && (Math.floor((from.x + from.y) / 8) % 2 === 0) ? 0 : 1,
  };
}

export function npcTouch(nowMs: number, clickAt: number, balloonOpen: boolean): NpcTouch {
  const dt = nowMs - clickAt;
  return {
    jump: dt >= 0 && dt < 320,
    talking: balloonOpen,
    waving: !balloonOpen && dt >= 0 && dt < 400,
  };
}

/** Arco de pulo em pixels (negativo = pra cima). 0 se já passou. */
export function npcHopPx(nowMs: number, clickAt: number, reduced: boolean): number {
  if (reduced) return 0;
  const dt = nowMs - clickAt;
  if (dt < 0 || dt > 320) return 0;
  return -Math.round(14 * Math.sin((dt / 320) * Math.PI));
}

export function lookFacing(selfX: number, targetX: number): 1 | -1 {
  return targetX < selfX ? -1 : 1;
}

/** Folga ao sul dos pés da obra — y-sort desenha o Heitor na frente, nunca no miolo. */
const HERO_STAND_SOUTH = 16;
/** Acima da cerca sul (palissada y=548; Heitor para em s1). */
const HERO_FENCE_MAX_Y = 518;
const HERO_WALK_MIN_MS = 480;
const HERO_WALK_MAX_MS = 4000;
/** Passo de pessoa. Duração usa essa média; o ease deixa o pico no meio. */
export const HERO_WALK_PX_PER_SEC = 125;
const HERO_LOT_WAIT_MS = 180;
/** Planta os pés antes do card — follow-through. */
export const HERO_ARRIVE_HOLD_MS = 140;
const HERO_WALK_PX_PER_FRAME = 20;

/** Arranque curto, cruzeiro linear, freio no fim — peso sem demora. */
export function easeWalk(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  const acc = 0.1;
  const brake = 0.2;
  if (x < acc) {
    const u = x / acc;
    return acc * u * u;
  }
  if (x > 1 - brake) {
    const u = (x - (1 - brake)) / brake;
    const start = 1 - brake;
    return start + brake * (1 - (1 - u) * (1 - u));
  }
  return x;
}

export type Pt = { x: number; y: number };

export type WalkGraph = {
  nodes: Record<string, Pt>;
  edges: Array<[string, string]>;
};

/**
 * Nós no chão de terra/pedra, NA FRENTE de cada obra (sul da caixa).
 * Nunca no miolo do sprite — o y-sort desenha o Heitor à frente.
 */
export const DEFAULT_WALK_GRAPH: WalkGraph = {
  nodes: {
    plaza: { x: 640, y: 365 },
    n1: { x: 640, y: 255 },
    mine: { x: 650, y: 198 },
    mesa: { x: 770, y: 338 },
    w1: { x: 430, y: 348 },
    furnace: { x: 214, y: 310 },
    chest: { x: 196, y: 440 },
    s1: { x: 640, y: 448 },
    coffre: { x: 524, y: 512 },
    agenda: { x: 640, y: 516 },
    market: { x: 764, y: 516 },
    e1: { x: 840, y: 400 },
    arena: { x: 1016, y: 498 },
    porch: { x: 980, y: 248 },
    house: { x: 986, y: 204 },
    tower: { x: 1054, y: 188 },
    fire: { x: 1020, y: 268 },
    lake: { x: 1168, y: 508 },
    pack: { x: 548, y: 390 },
  },
  edges: [
    ['plaza', 'n1'], ['n1', 'mine'], ['n1', 'mesa'],
    ['plaza', 'w1'], ['w1', 'furnace'], ['furnace', 'chest'], ['w1', 'chest'],
    ['plaza', 's1'], ['s1', 'coffre'], ['s1', 'agenda'], ['s1', 'market'],
    ['plaza', 'e1'], ['e1', 'arena'], ['e1', 'market'],
    ['e1', 'porch'], ['porch', 'house'], ['porch', 'fire'],
    ['house', 'tower'], ['fire', 'arena'], ['arena', 'lake'],
    ['plaza', 'pack'],
  ],
};

/** Clique → nó da porta. Sem entrada no mapa = fallback ao sul da hitbox. */
export const HERO_DEST_NODE: Record<string, string> = {
  'build:fornalha': 'furnace',
  'build:bau': 'chest',
  'build:mesa': 'mesa',
  'build:cofre': 'coffre',
  'build:agenda': 'agenda',
  'build:mercado': 'market',
  'build:arena': 'arena',
  'build:cerca': 's1',
  'build:torre': 'tower',
  house: 'house',
  mine: 'mine',
  chest_streak: 'chest',
  reserva: 'n1',
  pack: 'pack',
};

export function heroSkipsWalk(spotId: string): boolean {
  return spotId === 'character' || spotId.startsWith('npc:');
}

export type HeroClickPlan = {
  to: Pt;
  points: Pt[];
  durationMs: number;
  shakeId: string | null;
  immediate: boolean;
};

export function heroShakeTarget(spotId: string): string | null {
  if (spotId === 'character' || spotId.startsWith('npc:')) return null;
  if (spotId.startsWith('build:')) return spotId.slice(6);
  if (spotId === 'house' || spotId === 'pack' || spotId === 'mine' || spotId === 'chest_streak') return spotId;
  return null;
}

/** Pés ao sul da caixa (frente da obra). Não entra no sprite. */
export function heroStandPoint(
  hit: { x: number; y: number; w: number; h: number },
  bounds: { w: number; h: number },
  south = HERO_STAND_SOUTH,
): Pt {
  const x = hit.x + hit.w / 2;
  const feet = hit.y + hit.h;
  const y = Math.min(feet + south, HERO_FENCE_MAX_Y);
  return {
    x: Math.max(36, Math.min(bounds.w - 36, x)),
    y: Math.max(90, Math.min(bounds.h - 16, Math.max(feet + 4, y))),
  };
}

/** @deprecated use heroStandPoint — mantido p/ testes antigos. */
export function heroApproachPoint(
  from: Pt,
  hit: { x: number; y: number; w: number; h: number },
  bounds: { w: number; h: number },
): Pt {
  void from;
  return heroStandPoint(hit, bounds);
}

function nearestNode(p: Pt, graph: WalkGraph): string {
  let best = Object.keys(graph.nodes)[0] || 'plaza';
  let bestD = Infinity;
  for (const [id, n] of Object.entries(graph.nodes)) {
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function shortestPath(start: string, end: string, graph: WalkGraph): string[] {
  if (start === end) return [start];
  const adj: Record<string, string[]> = {};
  for (const id of Object.keys(graph.nodes)) adj[id] = [];
  for (const [a, b] of graph.edges) {
    if (!adj[a] || !adj[b]) continue;
    adj[a].push(b);
    adj[b].push(a);
  }
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const open = new Set(Object.keys(graph.nodes));
  for (const id of open) {
    dist[id] = Infinity;
    prev[id] = null;
  }
  dist[start] = 0;
  while (open.size) {
    let u: string | null = null;
    let best = Infinity;
    for (const id of open) {
      if (dist[id] < best) {
        best = dist[id];
        u = id;
      }
    }
    if (u === null || best === Infinity) break;
    open.delete(u);
    if (u === end) break;
    const un = graph.nodes[u];
    for (const v of adj[u] || []) {
      if (!open.has(v)) continue;
      const vn = graph.nodes[v];
      const alt = dist[u] + Math.hypot(vn.x - un.x, vn.y - un.y);
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }
  if (start !== end && prev[end] === null) return [start];
  const ids = [end];
  while (ids[0] !== start) {
    const p = prev[ids[0]];
    if (!p) break;
    ids.unshift(p);
  }
  return ids;
}

export function pathLength(points: Pt[]): number {
  let s = 0;
  for (let i = 1; i < points.length; i++) {
    s += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return s;
}

/** Chaikin: arredonda esquina, sem sair muito do chão de terra. */
export function smoothPath(points: Pt[]): Pt[] {
  if (points.length < 3) return points.map((p) => ({ x: p.x, y: p.y }));
  const out: Pt[] = [{ x: points[0].x, y: points[0].y }];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    out.push({ x: b.x * 0.82 + a.x * 0.18, y: b.y * 0.82 + a.y * 0.18 });
    out.push({ x: b.x * 0.82 + c.x * 0.18, y: b.y * 0.82 + c.y * 0.18 });
  }
  const last = points[points.length - 1];
  out.push({ x: last.x, y: last.y });
  return out;
}

/** Distância máxima do clique até a trilha para o Heitor aceitar o passo. */
export const HERO_WALK_SNAP_PX = 80;

export function closestOnSeg(p: Pt, a: Pt, b: Pt): { point: Pt; dist: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1) {
    return { point: { x: a.x, y: a.y }, dist: Math.hypot(p.x - a.x, p.y - a.y) };
  }
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
  const point = { x: a.x + abx * t, y: a.y + aby * t };
  return { point, dist: Math.hypot(p.x - point.x, p.y - point.y) };
}

export function nearestWalkPoint(p: Pt, graph: WalkGraph = DEFAULT_WALK_GRAPH): { point: Pt; dist: number } {
  const ids = Object.keys(graph.nodes);
  const first = graph.nodes[ids[0]] || { x: p.x, y: p.y };
  let best = { point: { x: first.x, y: first.y }, dist: Math.hypot(p.x - first.x, p.y - first.y) };
  for (const n of Object.values(graph.nodes)) {
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d < best.dist) best = { point: { x: n.x, y: n.y }, dist: d };
  }
  for (const [a, b] of graph.edges) {
    const A = graph.nodes[a];
    const B = graph.nodes[b];
    if (!A || !B) continue;
    const hit = closestOnSeg(p, A, B);
    if (hit.dist < best.dist) best = hit;
  }
  return best;
}

export function inVillageWater(
  p: Pt,
  water?: { x: number; y: number; w: number; h: number } | null,
): boolean {
  if (!water) return false;
  const cx = water.x + water.w * 0.52;
  const cy = water.y + water.h * 0.58;
  const rx = Math.max(8, water.w * 0.38);
  const ry = Math.max(8, water.h * 0.22);
  const dx = (p.x - cx) / rx;
  const dy = (p.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function clampWalk(p: Pt, bounds: { w: number; h: number }): Pt {
  return {
    x: Math.max(36, Math.min(bounds.w - 36, p.x)),
    y: Math.max(90, Math.min(HERO_FENCE_MAX_Y, p.y)),
  };
}

/** Clique no chão → ponto na trilha, ou null se for água/mato/céu. */
export function heroWalkablePoint(
  click: Pt,
  graph: WalkGraph = DEFAULT_WALK_GRAPH,
  water?: { x: number; y: number; w: number; h: number } | null,
  bounds: { w: number; h: number } = { w: 1280, h: 640 },
): Pt | null {
  if (inVillageWater(click, water)) return null;
  const snap = nearestWalkPoint(click, graph);
  if (snap.dist > HERO_WALK_SNAP_PX) return null;
  const to = clampWalk(snap.point, bounds);
  if (inVillageWater(to, water)) return null;
  return to;
}

function edgeOf(p: Pt, graph: WalkGraph): [string, string] | null {
  let best: [string, string] | null = null;
  let bestD = 18;
  for (const [a, b] of graph.edges) {
    const A = graph.nodes[a];
    const B = graph.nodes[b];
    if (!A || !B) continue;
    const d = closestOnSeg(p, A, B).dist;
    if (d < bestD) {
      bestD = d;
      best = [a, b];
    }
  }
  return best;
}

function routeAnchors(p: Pt, graph: WalkGraph): string[] {
  const node = nearestNode(p, graph);
  const n = graph.nodes[node];
  if (n && Math.hypot(p.x - n.x, p.y - n.y) < 14) return [node];
  const edge = edgeOf(p, graph);
  return edge || [node];
}

function dropOvershoot(points: Pt[]): Pt[] {
  if (points.length < 3) return points;
  const dest = points[points.length - 1];
  const via = points[points.length - 2];
  const prev = points[points.length - 3];
  if (closestOnSeg(dest, prev, via).dist < 12) {
    return [...points.slice(0, -2), dest];
  }
  return points;
}

export function heroRoute(from: Pt, to: Pt, graph: WalkGraph = DEFAULT_WALK_GRAPH): Pt[] {
  const straight = Math.hypot(to.x - from.x, to.y - from.y);
  if (straight < 36) return [from, to];
  const fromEdge = edgeOf(from, graph);
  const toEdge = edgeOf(to, graph);
  if (fromEdge && toEdge && new Set(fromEdge).size === 2 && fromEdge[0] === toEdge[0] && fromEdge[1] === toEdge[1]) {
    return [from, to];
  }
  if (fromEdge && toEdge && fromEdge[0] === toEdge[1] && fromEdge[1] === toEdge[0]) {
    return [from, to];
  }
  const starts = routeAnchors(from, graph);
  const ends = routeAnchors(to, graph);
  let best: Pt[] | null = null;
  let bestLen = Infinity;
  for (const s of starts) {
    for (const e of ends) {
      const ids = shortestPath(s, e, graph);
      const pts: Pt[] = [{ x: from.x, y: from.y }];
      const push = (p: Pt) => {
        const last = pts[pts.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) >= 10) pts.push({ x: p.x, y: p.y });
      };
      for (const id of ids) push(graph.nodes[id]);
      push(to);
      const raw = dropOvershoot(pts.length >= 2 ? pts : [from, to]);
      const len = pathLength(raw);
      if (len < bestLen) {
        bestLen = len;
        best = raw;
      }
    }
  }
  return smoothPath(best && best.length >= 2 ? best : [from, to]);
}

export function heroGroundPlan(
  from: Pt,
  click: Pt,
  graph: WalkGraph = DEFAULT_WALK_GRAPH,
  reducedMotion = false,
  water?: { x: number; y: number; w: number; h: number } | null,
  bounds: { w: number; h: number } = { w: 1280, h: 640 },
): HeroClickPlan | null {
  const to = heroWalkablePoint(click, graph, water, bounds);
  if (!to) return null;
  if (Math.hypot(to.x - from.x, to.y - from.y) < 18) {
    return { to: { x: from.x, y: from.y }, points: [from], durationMs: 0, shakeId: null, immediate: true };
  }
  if (reducedMotion) return { to, points: [from, to], durationMs: 0, shakeId: null, immediate: true };
  const points = heroRoute(from, to, graph);
  const dist = pathLength(points);
  const durationMs = heroWalkDurationMs(dist, false);
  return { to, points, durationMs, shakeId: null, immediate: durationMs === 0 };
}

export function heroWalkDurationMs(dist: number, reducedMotion: boolean): number {
  if (reducedMotion || dist < 10) return 0;
  return Math.round(Math.min(HERO_WALK_MAX_MS, Math.max(HERO_WALK_MIN_MS, (dist / HERO_WALK_PX_PER_SEC) * 1000)));
}

export function heroClickPlan(
  spotId: string,
  from: Pt,
  hit: { x: number; y: number; w: number; h: number },
  bounds: { w: number; h: number },
  reducedMotion: boolean,
  graph: WalkGraph = DEFAULT_WALK_GRAPH,
): HeroClickPlan {
  if (heroSkipsWalk(spotId)) {
    return { to: { x: from.x, y: from.y }, points: [from], durationMs: 0, shakeId: null, immediate: true };
  }
  const destId = HERO_DEST_NODE[spotId];
  const node = destId ? graph.nodes[destId] : undefined;
  const to = node ? { x: node.x, y: node.y } : heroStandPoint(hit, bounds);
  const shakeId = heroShakeTarget(spotId);
  if (reducedMotion) return { to, points: [from, to], durationMs: 0, shakeId: null, immediate: true };
  const points = heroRoute(from, to, graph);
  const dist = pathLength(points);
  let durationMs = heroWalkDurationMs(dist, false);
  if (durationMs === 0 && shakeId) durationMs = HERO_LOT_WAIT_MS;
  return { to, points, durationMs, shakeId, immediate: durationMs === 0 };
}

export function heroWalkAlong(
  points: Pt[],
  elapsedMs: number,
  durationMs: number,
): { x: number; y: number; t: number; along: number; walking: boolean; step: 0 | 1; face: 1 | -1 } {
  const pts = points.length >= 2 ? points : [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  const end = pts[pts.length - 1];
  const startFace = lookFacing(pts[0].x, pts[Math.min(1, pts.length - 1)].x);
  if (durationMs <= 0) return { x: end.x, y: end.y, t: 1, along: pathLength(pts), walking: false, step: 0, face: startFace };
  const raw = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const t = easeWalk(raw);
  const total = pathLength(pts);
  let remain = t * total;
  const along = remain;
  let x = pts[0].x;
  let y = pts[0].y;
  let face = startFace;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg < 0.001) continue;
    if (Math.abs(b.x - a.x) > 6) face = lookFacing(a.x, b.x);
    if (remain <= seg) {
      const u = remain / seg;
      x = a.x + (b.x - a.x) * u;
      y = a.y + (b.y - a.y) * u;
      break;
    }
    remain -= seg;
    x = b.x;
    y = b.y;
  }
  const walking = raw < 1 && total >= 1;
  return {
    x,
    y,
    t: raw,
    along,
    walking,
    step: walking && Math.floor(along / HERO_WALK_PX_PER_FRAME) % 2 === 0 ? 0 : 1,
    face,
  };
}

export function heroWalkAt(
  from: Pt,
  to: Pt,
  elapsedMs: number,
  durationMs: number,
): { x: number; y: number; t: number; walking: boolean; step: 0 | 1; face: 1 | -1 } {
  return heroWalkAlong([from, to], elapsedMs, durationMs);
}

/** Tremor só na chegada, não o caminho inteiro. */
export function arrivePulse(remainingMs: number): { shakeX: number; scale: number } {
  if (remainingMs > 260 || remainingMs < -80) return { shakeX: 0, scale: 1 };
  const elapsed = 260 - remainingMs;
  const shakeX = Math.round(Math.sin(elapsed / 28) * 3);
  const scale = elapsed < 150 ? 1 + 0.08 * Math.sin((elapsed / 150) * Math.PI) : 1;
  return { shakeX, scale };
}

export function tapPulse(elapsedMs: number, durationMs: number): { shakeX: number; scale: number } {
  return arrivePulse(durationMs - elapsedMs);
}
