"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_LAYERS = 5;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function layerAt(index: number, count: number, horizon: number) {
  const depth = count <= 1 ? 1 : index / (count - 1);
  const clampedHorizon = Math.min(0.82, Math.max(0.3, horizon));
  return {
    base: count <= 1 ? clampedHorizon : clampedHorizon - (clampedHorizon - 0.2) * depth,
    amp: 0.07 + 0.06 * depth,
    freq: 1.3 + 1.9 * depth,
    ink: 0.22 + 0.5 * depth,
    depth,
  };
}

function paintAt(progress: number, layerIndex: number, layerCount: number) {
  if (layerCount <= 1) return clamp01(progress);
  const offset = Math.min(0.18, 0.6 / (layerCount - 1));
  const span = 1 - offset * (layerCount - 1);
  return clamp01((progress - layerIndex * offset) / span);
}

function inkScaleFor(rgb: [number, number, number]) {
  const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return lum < 0.35 ? 0.62 + (lum / 0.35) * 0.38 : 1;
}

function sunBloom(progress: number) {
  return 1 - Math.pow(1 - clamp01((progress - 0.55) / 0.4), 3);
}

function moonFor(moon: boolean | "auto", rgb: [number, number, number]) {
  if (moon !== "auto") return moon;
  const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return lum < 0.35;
}

function scrollDrop(scrollTop: number, height: number, depth: number) {
  return clamp01(scrollTop / Math.max(1, height)) * Math.max(0, depth);
}

function hashU(x: number, y: number) {
  let m = ((Math.imul(x, 1664525) ^ Math.imul(y, 22695477)) + 12345) >>> 0;
  m = (m ^ (m >>> 15)) >>> 0;
  m = Math.imul(m, 2246822519) >>> 0;
  m = (m ^ (m >>> 13)) >>> 0;
  m = Math.imul(m, 3266489917) >>> 0;
  m = (m ^ (m >>> 16)) >>> 0;
  return m;
}

function hash2(x: number, y: number) {
  return hashU(Math.floor(x) + 32768, Math.floor(y) + 32768) / 4294967295;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function vnoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return mix(
    mix(hash2(ix, iy), hash2(ix + 1, iy), ux),
    mix(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux),
    uy
  );
}

function fbm(x: number, y: number) {
  let m = 0;
  let o = 0.5;
  for (let i = 0; i < 5; i++) {
    m += o * vnoise(x, y);
    const D = (0.8 * x - 0.6 * y) * 2.03 + 11.7;
    const Z = (0.6 * x + 0.8 * y) * 2.03 + 11.7;
    x = D;
    y = Z;
    o *= 0.5;
  }
  return m;
}

function ridgeLineAt(
  layerIndex: number,
  xCoord: number,
  params: {
    n: number;
    horizon: number;
    seed: number;
    aspect: number;
    shift: [number, number];
    drop?: number;
  }
) {
  const o = layerAt(layerIndex, params.n, params.horizon);
  const O = 0.25 + o.depth;
  const D = (xCoord + params.shift[0] * O) * params.aspect;
  const x = fbm(
    D * o.freq + params.seed * 1.37 + layerIndex * 7.31,
    layerIndex * 3.7 + params.seed * 0.71
  );
  const Z =
    1 -
    Math.abs(
      2 *
        vnoise(
          D * o.freq * 2.3 + layerIndex * 5.1 + params.seed,
          layerIndex + params.seed * 0.3
        ) -
        1
    );
  return (
    o.base +
    o.amp * ((x - 0.5) * 2 + (Z - 0.5) * 0.35) -
    params.shift[1] * O -
    (params.drop ?? 0) * (1 - o.depth)
  );
}

function birdsAt(
  flight: { duration: number; dir: number; layer: number; count: number; seed: number },
  elapsed: number,
  params: {
    n: number;
    horizon: number;
    seed: number;
    aspect: number;
    shift: [number, number];
    drop?: number;
  }
) {
  const o = clamp01(elapsed / flight.duration);
  const O = flight.dir > 0 ? -0.12 + 1.3 * o : 1.12 - 1.3 * o;
  const D = clamp01(Math.min(o / 0.08, (1 - o) / 0.08, 1));
  const x = layerAt(flight.layer, params.n, params.horizon);
  const Z = x.base + x.amp;
  const birdsList = [];
  for (let T = 0; T < flight.count; T++) {
    const q = Math.ceil(T / 2);
    const tl = T === 0 ? 0 : T % 2 ? 1 : -1;
    const F = hash2(T * 3.1 + flight.seed * 7.7, flight.seed * 1.3 + T);
    const Sl = O - flight.dir * q * (0.028 + 0.008 * F);
    const bl = ridgeLineAt(flight.layer, Sl, params);
    const jl = 0.005 * Math.sin(elapsed * 1.6 + T * 1.9);
    const _l = Math.max(bl + 0.07, 0.5 * (Z + bl) + 0.08) + tl * q * 0.018 + jl;
    const Il =
      (0.15 + 0.4 * (0.5 + 0.5 * Math.sin(elapsed * 0.8 + T * 2.3))) *
      Math.sin(elapsed * (8 + 2 * F) + T * 1.3);
    birdsList.push({ x: Sl, y: _l, size: 0.011 + 0.004 * F, flap: Il });
  }
  return { alpha: D, birds: birdsList };
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = (t: number) => 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
  const cy = (t: number) => 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let low = 0,
      high = 1,
      mid = x;
    for (let i = 0; i < 40; i++) {
      mid = (low + high) / 2;
      if (cx(mid) < x) low = mid;
      else high = mid;
    }
    return cy(mid);
  };
}
const easeOutCubic = cubicBezier(0.7, 0, 0.2, 1);

function colorToRgb(str: string): [number, number, number] | null {
  const trimmed = str.trim();
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const full =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hex[1];
    return [0, 2, 4].map(
      (offset) => parseInt(full.slice(offset, offset + 2), 16) / 255
    ) as [number, number, number];
  }
  if (/^transparent$/i.test(trimmed)) return null;
  const rgba = trimmed.match(
    /^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)/i
  );
  if (rgba) {
    if (rgba[4] !== undefined && Number(rgba[4]) === 0) return null;
    return [+rgba[1] / 255, +rgba[2] / 255, +rgba[3] / 255];
  }
  return null;
}

function resolveCssColor(str: string): [number, number, number] | null {
  const direct = colorToRgb(str);
  if (direct) return direct;
  if (/^transparent$/i.test(str.trim()) || /^rgba?\([^)]*[,/]\s*0\s*\)$/i.test(str.trim()))
    return null;
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000";
    ctx.fillStyle = str;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return data[3] === 0 ? null : [data[0] / 255, data[1] / 255, data[2] / 255];
  } catch {
    return null;
  }
}

function resolveColor(el: HTMLElement, prop: "backgroundColor" | "color"): [number, number, number] {
  if (typeof window === "undefined") return prop === "color" ? [0.1, 0.1, 0.1] : [1, 1, 1];
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const resolved = resolveCssColor(getComputedStyle(node)[prop]);
    if (resolved) return resolved;
    if (prop === "color") break;
  }
  return prop === "color" ? [0.1, 0.1, 0.1] : [1, 1, 1];
}

const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uMist;
uniform float uDrift;
uniform float uGrain;
uniform int uLayers;
uniform vec4 uLayer[5];
uniform float uPaint[5];
uniform float uPaintAll;
uniform vec2 uShift;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uSunColor;
uniform vec4 uSun;
uniform float uInkScale;
uniform float uClouds;
uniform float uGlow;
uniform float uHorizonY;
uniform int uBirdCount;
uniform vec4 uBird[8];
uniform float uBirdAlpha;
uniform float uBirdDir;
uniform int uBirdLayer;
uniform float uMoon;
uniform float uSunGrow;
uniform float uDrop;

uint hashU(uvec2 p) {
  uint n = p.x * 1664525u ^ (p.y * 22695477u + 12345u);
  n ^= n >> 15u; n *= 2246822519u;
  n ^= n >> 13u; n *= 3266489917u;
  n ^= n >> 16u;
  return n;
}
float hash2(vec2 p) {
  ivec2 ip = ivec2(floor(p)) + 32768;
  return float(hashU(uvec2(ip))) / 4294967295.0;
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = m * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = m * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v / 0.875 * 0.96875;
}

float birdInk(vec2 uv, float aspect) {
  float ink = 0.0;
  for (int b = 0; b < 8; b++) {
    if (b >= uBirdCount) break;
    vec4 B = uBird[b];
    vec2 q = (uv - B.xy) * vec2(aspect, 1.0) / B.z;
    if (abs(q.x) > 1.25 || abs(q.y) > 1.25) continue;
    q.x *= uBirdDir;
    float ax = abs(q.x);
    float wingY = B.w * ax - 0.28 * ax * ax + 0.06;
    float thick = 0.11 * (1.0 - ax) + 0.03;
    float wing = (1.0 - smoothstep(thick, thick + 0.05, abs(q.y - wingY))) * (1.0 - smoothstep(0.95, 1.05, ax));
    float body = 1.0 - smoothstep(0.08, 0.13, length(vec2(q.x * 0.8 - 0.05, q.y * 1.4)));
    ink = max(ink, max(wing, body));
  }
  return ink * uBirdAlpha;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec3 col = uPaper;

  col = mix(col, uInk, 0.05 * smoothstep(0.45, 1.0, uv.y) * uInkScale);
  vec2 sc = uSun.xy + uShift * 0.1 - vec2(0.0, uDrop * 2.2);
  float bloom = smoothstep(0.0, 0.2, uSunGrow);
  if (uSun.w > 0.5 && uGlow > 0.0) {
    float ds = length((uv - sc) * vec2(aspect, 1.0));
    float halo = exp(-pow(ds / (uSun.z * 3.2), 2.0));
    float haze = exp(-pow((uv.y + uDrop - uHorizonY) / 0.12, 2.0));
    col = mix(col, uSunColor, uGlow * (mix(0.22, 0.12, uMoon) * halo + mix(0.06, 0.02, uMoon) * haze) * bloom);
  }

  vec3 skyBack = col;
  if (uSun.w > 0.5) {
    vec2 dv = (uv - sc) * vec2(aspect, 1.0);
    float d = length(dv);
    float R = uSun.z * mix(0.15, 1.0, uSunGrow);
    if (d < R * 1.2) {
      vec2 dir = dv / max(d, 1e-5);
      float wob = (fbm3(dir * 1.6 + uSeed * 0.37) - 0.5) * mix(0.07, 0.025, uMoon) + (vnoise(dir * 11.0 + uSeed) - 0.5) * mix(0.03, 0.01, uMoon);
      float r = R * (1.0 + wob);
      float disc = 1.0 - smoothstep(r - R * 0.03, r + R * 0.02, d);
      vec2 lq = dv / R;
      float gran = fbm3(lq * 7.0 + uSeed * 1.3) - 0.5;
      float pool = smoothstep(0.6, 1.0, d / r);
      float wash = clamp(dot(lq, vec2(-0.6, 0.8)) * 0.5 + 0.5, 0.0, 1.0);
      float dens = 0.78 + 0.16 * pool - 0.12 * wash + 0.16 * gran;
      vec3 pig = uSunColor * (1.0 - 0.14 * pool * pool);
      if (uMoon > 0.5) {
        dens = 0.86 - 0.16 * smoothstep(0.45, 0.72, fbm3(lq * 1.9 + 3.0 + uSeed * 0.2)) + 0.06 * gran;
        pig = uSunColor;
      }
      col = mix(col, pig, clamp(disc * dens, 0.0, 1.0) * bloom);
    }
    if (uClouds > 0.0 && d < uSun.z * 3.2) {
      vec2 mq = dv / uSun.z;
      float streak = fbm3(vec2(mq.x * 0.55 + uTime * uDrift * 0.6 + uSeed * 0.7, mq.y * 2.6 + uSeed));
      float strip = exp(-pow((mq.y + 0.42) / 0.32, 2.0));
      float wisp = smoothstep(0.42, 0.72, streak) * strip * smoothstep(3.2, 1.4, length(mq)) * smoothstep(0.0, 0.5, uClouds);
      col = mix(col, uPaper, wisp * 0.8 * bloom);
    }
  }

  if (uClouds > 0.0) {
    vec2 cq = vec2(uv.x * aspect * 0.8 + uTime * uDrift * 0.15 + uSeed * 0.53, (uv.y + uDrop) * 11.0);
    float streak = smoothstep(0.5, 0.8, fbm3(cq));
    float inSky = smoothstep(uHorizonY - 0.02, uHorizonY + 0.2, uv.y + uDrop) * (1.0 - smoothstep(0.92, 1.0, uv.y));
    col = mix(col, uInk, uClouds * 0.26 * streak * inSky * uInkScale * smoothstep(0.0, 0.4, uPaintAll));
  }

  for (int i = 0; i < 5; i++) {
    if (i >= uLayers) break;
    vec4 L = uLayer[i];
    float fi = float(i);
    float depth = uLayers > 1 ? fi / float(uLayers - 1) : 1.0;
    vec2 p = uv + uShift * (0.25 + depth) + vec2(0.0, uDrop * (1.0 - depth));
    float x = p.x * aspect;
    float n = fbm(vec2(x * L.z + uSeed * 1.37 + fi * 7.31, fi * 3.7 + uSeed * 0.71));
    float ridged = 1.0 - abs(2.0 * vnoise(vec2(x * L.z * 2.3 + fi * 5.1 + uSeed, fi + uSeed * 0.3)) - 1.0);
    float h = L.x + L.y * ((n - 0.5) * 2.0 + (ridged - 0.5) * 0.35);

    float bleed = 0.0025 + 0.004 * vnoise(vec2(x * 40.0, fi * 9.0));
    float below = smoothstep(h + bleed, h - bleed, p.y);
    if (below > 0.0) {
      if (i == 0) col = mix(col, skyBack, below);
      float fall = clamp((h - p.y) / (0.12 + 0.08 * depth), 0.0, 1.0);
      float tex = fbm3(vec2(x * 18.0, p.y * 22.0) + fi * 4.0 + uSeed);
      float dens = L.w * uInkScale * (1.0 - uMist * 0.95 * fall) * (0.82 + 0.36 * tex);
      float fog = smoothstep(0.42, 0.78, fbm3(vec2(x * 1.6 + uTime * uDrift * (0.4 + depth), p.y * 5.0 + fi * 2.0)));
      dens *= 1.0 - uMist * fog * fall * 0.9;

      float under = h - p.y;
      if (under < 0.03) {
        float crest = 1.0 - smoothstep(0.0, 0.004 + 0.01 * depth, under);
        float press = smoothstep(0.25, 0.7, vnoise(vec2(x * 9.0 + fi * 13.0, fi * 2.0 + uSeed)));
        dens += crest * crest * press * 0.45 * L.w * uInkScale;
      }

      float edge = mix(-0.2, 1.2, uPaint[i]) + (fbm3(vec2(p.y * 14.0, fi * 3.0 + uSeed)) - 0.5) * 0.18;
      float painted = 1.0 - smoothstep(edge - 0.035, edge + 0.035, uv.x);
      col = mix(col, uInk, clamp(below * dens * painted, 0.0, 1.0));
    }
    if (i == uBirdLayer && uBirdCount > 0) col = mix(col, uInk, birdInk(uv, aspect) * 0.8 * uInkScale);
  }

  col += (hash2(uv * uResolution * 0.5) - 0.5) * uGrain * 0.1;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const UNIFORM_NAMES = [
  "uResolution",
  "uTime",
  "uSeed",
  "uMist",
  "uDrift",
  "uGrain",
  "uLayers",
  "uLayer",
  "uPaint",
  "uPaintAll",
  "uShift",
  "uPaper",
  "uInk",
  "uSunColor",
  "uSun",
  "uInkScale",
  "uClouds",
  "uGlow",
  "uHorizonY",
  "uBirdCount",
  "uBird",
  "uBirdAlpha",
  "uBirdDir",
  "uBirdLayer",
  "uMoon",
  "uSunGrow",
  "uDrop",
] as const;

interface DrawData {
  time: number;
  seed: number;
  mist: number;
  drift: number;
  grain: number;
  layers: Array<{ base: number; amp: number; freq: number; ink: number; depth: number }>;
  paint: number[];
  paintAll: number;
  shift: [number, number];
  paper: [number, number, number];
  ink: [number, number, number];
  sunColor: [number, number, number];
  sun: [number, number, number, number];
  inkScale: number;
  clouds: number;
  glow: number;
  horizonY: number;
  birds: Array<{ x: number; y: number; size: number; flap: number }>;
  birdAlpha: number;
  birdDir: number;
  birdLayer: number;
  moon: boolean;
  sunGrow: number;
  drop: number;
}

class RidgesGL {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | null = null;
  program: WebGLProgram | null = null;
  loc = new Map<string, WebGLUniformLocation | null>();
  lost = false;
  onRestore: () => void;
  ok = false;

  constructor(canvas: HTMLCanvasElement, onRestore: () => void) {
    this.canvas = canvas;
    this.onRestore = onRestore;
    canvas.addEventListener("webglcontextlost", this.handleLost);
    canvas.addEventListener("webglcontextrestored", this.handleRestored);
    this.ok = this.init();
  }

  handleLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.ok = false;
  };

  handleRestored = () => {
    this.lost = false;
    this.ok = this.init();
    if (this.ok) this.onRestore();
  };

  init() {
    const gl = this.canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl || gl.isContextLost()) return false;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      console.error("[ink-ridges] shader error", gl.getShaderInfoLog(shader));
      return null;
    };

    const vert = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return false;

    const program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[ink-ridges] link error", gl.getProgramInfoLog(program));
      return false;
    }

    gl.useProgram(program);
    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.loc.clear();
    for (const name of UNIFORM_NAMES) {
      this.loc.set(name, gl.getUniformLocation(program, name));
    }

    this.gl = gl;
    this.program = program;
    return true;
  }

  resize(w: number, h: number) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(data: DrawData) {
    const gl = this.gl;
    if (!gl || !this.program || !this.ok || this.lost) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);

    const L = (name: string) => this.loc.get(name) ?? null;

    gl.uniform2f(L("uResolution"), w, h);
    gl.uniform1f(L("uTime"), data.time);
    gl.uniform1f(L("uSeed"), data.seed);
    gl.uniform1f(L("uMist"), data.mist);
    gl.uniform1f(L("uDrift"), data.drift);
    gl.uniform1f(L("uGrain"), data.grain);
    gl.uniform1i(L("uLayers"), data.layers.length);

    const layerBuf = new Float32Array(MAX_LAYERS * 4);
    const paintBuf = new Float32Array(MAX_LAYERS);
    data.layers.forEach((layer, i) => {
      layerBuf.set([layer.base, layer.amp, layer.freq, layer.ink], i * 4);
      paintBuf[i] = data.paint[i] ?? 1;
    });

    gl.uniform4fv(L("uLayer"), layerBuf);
    gl.uniform1fv(L("uPaint"), paintBuf);
    gl.uniform1f(L("uPaintAll"), data.paintAll);
    gl.uniform2f(L("uShift"), data.shift[0], data.shift[1]);
    gl.uniform3f(L("uPaper"), ...data.paper);
    gl.uniform3f(L("uInk"), ...data.ink);
    gl.uniform3f(L("uSunColor"), ...data.sunColor);
    gl.uniform4f(L("uSun"), ...data.sun);
    gl.uniform1f(L("uInkScale"), data.inkScale);
    gl.uniform1f(L("uClouds"), data.clouds);
    gl.uniform1f(L("uGlow"), data.glow);
    gl.uniform1f(L("uHorizonY"), data.horizonY);

    const birdBuf = new Float32Array(8 * 4);
    data.birds.slice(0, 8).forEach((b, i) => {
      birdBuf.set([b.x, b.y, b.size, b.flap], i * 4);
    });

    gl.uniform1i(L("uBirdCount"), Math.min(8, data.birds.length));
    gl.uniform4fv(L("uBird"), birdBuf);
    gl.uniform1f(L("uBirdAlpha"), data.birdAlpha);
    gl.uniform1f(L("uBirdDir"), data.birdDir);
    gl.uniform1i(L("uBirdLayer"), data.birdLayer);
    gl.uniform1f(L("uMoon"), data.moon ? 1 : 0);
    gl.uniform1f(L("uSunGrow"), data.sunGrow);
    gl.uniform1f(L("uDrop"), data.drop);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    if (this.gl && this.program && !this.lost) {
      this.gl.deleteProgram(this.program);
    }
    this.gl = null;
    this.program = null;
  }
}

export interface InkRidgesProps {
  layers?: number;
  seed?: number;
  horizon?: number;
  mist?: number;
  drift?: number;
  parallax?: number;
  paintIn?: number;
  sun?: boolean;
  sunPosition?: [number, number];
  sunSize?: number;
  sunColor?: string;
  moon?: boolean | "auto";
  scrollDepth?: number;
  inkColor?: string;
  grain?: number;
  clouds?: number;
  glow?: number;
  birds?: number;
  birdsEvery?: number;
  dprCap?: number;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export default function InkRidges({
  layers = 4,
  seed = 7,
  horizon = 0.62,
  mist = 0.6,
  drift = 0.05,
  parallax = 0.03,
  paintIn = 2400,
  sun = true,
  sunPosition = [0.78, 0.74],
  sunSize = 0.07,
  sunColor = "#b5402a",
  moon = "auto",
  scrollDepth = 0.35,
  inkColor,
  grain = 0.3,
  clouds = 0.35,
  glow = 0.45,
  birds = 5,
  birdsEvery = 14,
  dprCap = 1.5,
  label,
  className,
  children,
}: InkRidgesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  const settingsRef = useRef({
    layers,
    seed,
    horizon,
    mist,
    drift,
    parallax,
    paintIn,
    sun,
    sunPosition,
    sunSize,
    sunColor,
    moon,
    scrollDepth,
    inkColor,
    grain,
    clouds,
    glow,
    birds,
    birdsEvery,
    dprCap,
  });

  settingsRef.current = {
    layers,
    seed,
    horizon,
    mist,
    drift,
    parallax,
    paintIn,
    sun,
    sunPosition,
    sunSize,
    sunColor,
    moon,
    scrollDepth,
    inkColor,
    grain,
    clouds,
    glow,
    birds,
    birdsEvery,
    dprCap,
  };

  const actionRef = useRef<{
    kick: () => void;
    repaint: () => void;
    retheme: () => void;
  }>({
    kick: () => {},
    repaint: () => {},
    retheme: () => {},
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let rafId = 0;
    let lastTime = 0;
    let animTime = 0;
    let isIntersecting = true;
    let startTime = performance.now();
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let activeFlight: {
      start: number;
      duration: number;
      dir: number;
      count: number;
      layer: number;
      seed: number;
    } | null = null;
    let nextFlightTime = Infinity;
    let idleTimeout: ReturnType<typeof setTimeout>;

    const scheduleFlight = (now: number, isInitial: boolean) => {
      const s = settingsRef.current;
      if (s.birds <= 0 || mediaQuery.matches) {
        nextFlightTime = Infinity;
        return;
      }
      const intervalMs = Math.max(1, s.birdsEvery) * 1000;
      nextFlightTime =
        now +
        (isInitial
          ? Math.min(intervalMs, Math.max(0, s.paintIn) + 1500)
          : intervalMs * (0.6 + 0.8 * Math.random()));
    };

    scheduleFlight(startTime, true);

    let paperRgb: [number, number, number] = [1, 1, 1];
    let inkRgb: [number, number, number] = [0.1, 0.1, 0.1];
    let sunRgb: [number, number, number] = [0.71, 0.25, 0.16];
    let isMoon = false;

    const updateTheme = () => {
      const s = settingsRef.current;
      paperRgb = resolveColor(container, "backgroundColor");
      inkRgb = (s.inkColor && resolveCssColor(s.inkColor)) || resolveColor(container, "color");
      isMoon = moonFor(s.moon, paperRgb);
      sunRgb =
        (!isMoon && s.sunColor && resolveCssColor(s.sunColor)) ||
        (isMoon ? [0.92, 0.93, 0.96] : [0.71, 0.25, 0.16]);
    };

    const kick = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(frame);
      }
    };

    const renderer = new RidgesGL(canvas, kick);
    if (!renderer.ok) {
      setWebglSupported(false);
      container.style.setProperty("--ink-ridges-paint", "1");
      return () => renderer.dispose();
    }

    updateTheme();

    function frame(now: number) {
      rafId = 0;
      const s = settingsRef.current;
      const isReduced = mediaQuery.matches;
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
      lastTime = now;

      const progress = isReduced || s.paintIn <= 0 ? 1 : clamp01((now - startTime) / s.paintIn);

      if (isReduced) {
        pos.x = pos.y = pos.tx = pos.ty = 0;
      } else {
        animTime += dt;
        pos.x = damp(pos.x, pos.tx, 6, dt);
        pos.y = damp(pos.y, pos.ty, 6, dt);
      }

      const layerCount = Math.max(1, Math.min(MAX_LAYERS, Math.round(s.layers)));
      const layersConfig = Array.from({ length: layerCount }, (_, i) =>
        layerAt(i, layerCount, s.horizon)
      );
      const aspect = canvas!.width / Math.max(1, canvas!.height);
      const drop =
        isReduced || s.scrollDepth <= 0
          ? 0
          : scrollDrop(-container!.getBoundingClientRect().top, window.innerHeight, s.scrollDepth);

      const landscapeParams = {
        n: layerCount,
        horizon: s.horizon,
        seed: s.seed,
        aspect,
        shift: [pos.x, pos.y] as [number, number],
        drop,
      };

      if (!activeFlight && !isReduced && isIntersecting && progress >= 1 && s.birds > 0 && now >= nextFlightTime) {
        activeFlight = {
          start: now,
          duration: 9 + Math.random() * 3,
          dir: Math.random() < 0.5 ? 1 : -1,
          count: Math.min(8, Math.round(s.birds)),
          layer: layerCount >= 3 ? 1 : 0,
          seed: Math.floor(Math.random() * 1000),
        };
      }

      let birdsResult = { alpha: 0, birds: [] as Array<{ x: number; y: number; size: number; flap: number }> };
      let flightProgress = 0;

      if (activeFlight) {
        const flightElapsed = (now - activeFlight.start) / 1000;
        if (flightElapsed >= activeFlight.duration || isReduced || s.birds <= 0) {
          activeFlight = null;
          scheduleFlight(now, false);
        } else {
          birdsResult = birdsAt(activeFlight, flightElapsed, landscapeParams);
          flightProgress = flightElapsed / activeFlight.duration;
        }
      }

      renderer.draw({
        time: animTime,
        seed: s.seed,
        mist: clamp01(s.mist),
        drift: isReduced ? 0 : Math.max(0, s.drift),
        grain: s.grain,
        layers: layersConfig,
        paint: layersConfig.map((_, i) => easeOutCubic(paintAt(progress, i, layerCount))),
        paintAll: easeOutCubic(progress),
        shift: [pos.x, pos.y],
        paper: paperRgb,
        ink: inkRgb,
        sunColor: sunRgb,
        sun: [
          s.sunPosition[0],
          s.sunPosition[1],
          s.sunSize,
          s.sun ? (isMoon ? 2 : 1) : 0,
        ],
        inkScale: inkScaleFor(paperRgb),
        clouds: clamp01(s.clouds),
        glow: clamp01(s.glow),
        horizonY: s.horizon,
        birds: birdsResult.birds,
        birdAlpha: birdsResult.alpha,
        birdDir: activeFlight?.dir ?? 1,
        birdLayer: activeFlight?.layer ?? 0,
        moon: isMoon,
        sunGrow: sunBloom(progress),
        drop,
      });

      container!.style.setProperty("--ink-ridges-paint", String(progress));
      container!.style.setProperty("--ink-ridges-flight", String(flightProgress));

      const isParallaxMoving = Math.abs(pos.x - pos.tx) > 1e-4 || Math.abs(pos.y - pos.ty) > 1e-4;
      const isAnimating = progress < 1 || s.drift > 0 || isParallaxMoving || !!activeFlight;

      clearTimeout(idleTimeout);
      if (!isReduced && isIntersecting && !document.hidden && isAnimating) {
        rafId = requestAnimationFrame(frame);
      } else {
        lastTime = 0;
        if (!isReduced && isIntersecting && !document.hidden && Number.isFinite(nextFlightTime)) {
          idleTimeout = setTimeout(kick, Math.max(50, nextFlightTime - now));
        }
      }
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const rect = entry?.contentRect;
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      renderer.resize(
        Math.max(1, Math.round(rect.width * dpr)),
        Math.max(1, Math.round(rect.height * dpr))
      );
      kick();
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = !!(entry && entry.isIntersecting);
      if (isIntersecting) kick();
    });
    intersectionObserver.observe(container);

    const onPointer = (e: PointerEvent) => {
      const s = settingsRef.current;
      if (mediaQuery.matches || s.parallax <= 0 || e.pointerType === "touch") return;
      const rect = container.getBoundingClientRect();
      pos.tx = ((e.clientX - rect.left) / rect.width - 0.5) * s.parallax;
      pos.ty = -((e.clientY - rect.top) / rect.height - 0.5) * s.parallax;
      kick();
    };

    const onLeave = () => {
      pos.tx = 0;
      pos.ty = 0;
      kick();
    };

    container.addEventListener("pointermove", onPointer);
    container.addEventListener("pointerleave", onLeave);

    const onScroll = () => {
      if (isIntersecting && settingsRef.current.scrollDepth > 0 && !mediaQuery.matches) {
        kick();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onVisibility = () => kick();
    document.addEventListener("visibilitychange", onVisibility);
    mediaQuery.addEventListener("change", onVisibility);

    const onThemeChange = () => {
      updateTheme();
      kick();
    };
    const mutationObserver = new MutationObserver(onThemeChange);
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkQuery.addEventListener("change", onThemeChange);

    actionRef.current = {
      kick,
      repaint: () => {
        startTime = performance.now();
        activeFlight = null;
        scheduleFlight(startTime, true);
        kick();
      },
      retheme: onThemeChange,
    };

    kick();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      clearTimeout(idleTimeout);
      actionRef.current = {
        kick: () => {},
        repaint: () => {},
        retheme: () => {},
      };
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener("pointermove", onPointer);
      container.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      mediaQuery.removeEventListener("change", onVisibility);
      darkQuery.removeEventListener("change", onThemeChange);
      renderer.dispose();
    };
  }, [dprCap]);

  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    actionRef.current.repaint();
  }, [seed]);

  useEffect(() => {
    actionRef.current.kick();
  }, [
    layers,
    horizon,
    mist,
    drift,
    parallax,
    sun,
    sunPosition,
    sunSize,
    grain,
    clouds,
    glow,
    birds,
    birdsEvery,
    scrollDepth,
  ]);

  useEffect(() => {
    actionRef.current.retheme();
  }, [inkColor, sunColor, moon]);

  return (
    <div
      ref={containerRef}
      data-ink-ridges=""
      className={cn("relative isolate overflow-hidden", className)}
    >
      <canvas
        ref={canvasRef}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn("absolute inset-0 block h-full w-full", !webglSupported && "hidden")}
      />
      {!webglSupported && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/70 to-[#050505]"
        />
      )}
      {children ? <div className="relative z-10 h-full">{children}</div> : null}
    </div>
  );
}
