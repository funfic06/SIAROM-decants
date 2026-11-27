/**
 * Product Shelf. Designed & built by Aakash Mehra.
 *
 * A store wall of three floating shelves with twelve cosmetics, drawn to look like studio product
 * shots: cylinder shading with softbox reflections, printed type, ridged caps, thick glass bases,
 * visible liquid and dip tubes. Click one and it moves from its place on the shelf to the left of a
 * product page and turns once, its print wrapping round the body. Drag it to turn it yourself; let go
 * and it carries your speed, then settles facing front. The page has the name, rating, price, sizes,
 * quantity, Add to Bag, delivery and the details, ingredients and how-to sections. Add to Bag updates
 * the bag in the header. Back or Escape returns the product to the same spot on the shelf.
 *
 * Adaptado para o SIAROM: preços formatados por prop, textos traduzíveis (`labels`), preço por tamanho,
 * marca impressa por produto, sacola externa (`onAddToBag`), modo embutido (`showChrome={false}`) e
 * número de colunas responsivo.
 *
 * Motion follows Apple's fluid-interface rules: critically damped springs, symmetric enter and exit,
 * velocity handed off on release, and a cross-fade under prefers-reduced-motion.
 */
"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { AnimatePresence, LayoutGroup, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { ChevronDown, ChevronLeft, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "jar" | "tube" | "pump" | "dropper" | "perfume" | "mist" | "bottle" | "stick" | "lip";

export type Product = {
  id: string;
  kind: Kind;
  name: string;
  /** Name printed on the pack, with an optional second line. */
  short: string;
  sub?: string;
  /** Marca impressa no topo da embalagem (padrão: a prop `brand` do componente). */
  brand?: string;
  category: string;
  /** Body colour, cap colour, label colour, print colour. */
  color: string;
  cap: string;
  label: string;
  ink: string;
  /** See-through glass, and the colour of what is inside. */
  glass?: boolean;
  liquid?: string;
  price: number;
  compareAt?: number;
  sizes: string[];
  /** Preço de cada tamanho, na mesma ordem de `sizes`. Sem ele, usa `price` (x1.7 do segundo tamanho em diante). */
  sizePrices?: number[];
  rating?: number;
  reviews?: number;
  tagline: string;
  description: string;
  benefits: string[];
  ingredients: string;
  howTo: string;
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "barrier-cream", kind: "jar", name: "Barrier Restore Cream", short: "Barrier Restore", sub: "Cream", category: "Moisturizer",
    color: "#f3f1ec", cap: "#f6f5f1", label: "#f3f1ec", ink: "#1a1a1a", price: 29, sizes: ["50 ml", "100 ml"], rating: 4.8, reviews: 3284,
    tagline: "A cushiony cream for a stronger skin barrier.",
    description: "A rich but weightless moisturizer with ceramides, cholesterol and fatty acids in skin-identical ratios, so a compromised barrier recovers and stays calm.",
    benefits: ["Ceramide complex 3%", "Fragrance free", "For dry and sensitive skin"],
    ingredients: "Aqua, Squalane, Glycerin, Ceramide NP, Ceramide AP, Cholesterol, Phytosphingosine, Panthenol, Niacinamide.",
    howTo: "Warm a small amount between fingertips and press into clean skin, morning and night.",
  },
  {
    id: "niacinamide", kind: "dropper", name: "Niacinamide 10% + Zinc 1%", short: "Niacinamide", sub: "10% + Zinc 1%", category: "Serum",
    color: "#e9eef0", cap: "#f7f7f5", label: "#ffffff", ink: "#111111", glass: true, liquid: "#f4efe2", price: 12, sizes: ["30 ml", "60 ml"], rating: 4.6, reviews: 18420,
    tagline: "A high-strength serum for blemishes and shine.",
    description: "A water-based serum that visibly reduces blemishes and congestion, balances oil and refines the look of pores with 10% niacinamide and 1% zinc PCA.",
    benefits: ["Reduces the look of pores", "Balances oil", "Vegan, cruelty free"],
    ingredients: "Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum.",
    howTo: "Apply a few drops to the face morning and evening before heavier creams.",
  },
  {
    id: "mineral-spf", kind: "tube", name: "Mineral UV Filters SPF 30", short: "Mineral UV Filters", sub: "SPF 30 with antioxidants", category: "Sunscreen",
    color: "#f6f6f3", cap: "#efeee9", label: "#f6f6f3", ink: "#111111", price: 14, sizes: ["50 ml"], rating: 4.4, reviews: 2150,
    tagline: "Broad-spectrum mineral protection, no white cast.",
    description: "A lightweight mineral sunscreen with zinc oxide and titanium dioxide, plus antioxidants to help defend against daily stressors. Sheer on all skin tones.",
    benefits: ["SPF 30 broad spectrum", "Mineral filters only", "Wears well under makeup"],
    ingredients: "Aqua, Zinc Oxide, Titanium Dioxide, Caprylic Triglyceride, Tocopherol, Squalane, Glycerin.",
    howTo: "Apply generously as the last step of your morning routine. Reapply every two hours in sun.",
  },
  {
    id: "glazing-milk", kind: "pump", name: "Glazing Milk", short: "glazing milk", sub: "ceramide essence", category: "Essence",
    color: "#ebe3d9", cap: "#e6ddd2", label: "#ebe3d9", ink: "#6b5a4c", price: 30, sizes: ["150 ml"], rating: 4.7, reviews: 5210,
    tagline: "A milky essence that preps skin for glow.",
    description: "A silky, milky essence with ceramides and peptides that softens and hydrates as the first step, leaving skin plump and glazed.",
    benefits: ["Ceramides and peptides", "Lightweight milk texture", "Layers under everything"],
    ingredients: "Aqua, Glycerin, Ceramide NP, Palmitoyl Tripeptide-1, Beta Glucan, Squalane, Panthenol.",
    howTo: "Pump into palms and press over clean skin before serum and moisturizer.",
  },
  {
    id: "hyaluronic", kind: "dropper", name: "Hyaluronic Acid 2% + B5", short: "Hyaluronic Acid", sub: "2% + B5", category: "Serum",
    color: "#e9eef0", cap: "#f7f7f5", label: "#ffffff", ink: "#111111", glass: true, liquid: "#eef3f6", price: 11, sizes: ["30 ml", "60 ml"], rating: 4.6, reviews: 21870,
    tagline: "Multi-depth hydration with vitamin B5.",
    description: "Low, medium and high molecular weight hyaluronic acid with vitamin B5 for hydration at every layer of the skin, leaving it plump and smooth.",
    benefits: ["Three weights of HA", "Oil free", "Suits all skin types"],
    ingredients: "Aqua, Sodium Hyaluronate, Pentylene Glycol, Propanediol, Sodium Hyaluronate Crosspolymer, Panthenol.",
    howTo: "Apply a few drops to damp skin morning and evening, then seal with moisturizer.",
  },
  {
    id: "invisible-spf", kind: "pump", name: "Invisible Fluid SPF 50", short: "Invisible Fluid", sub: "SPF 50 PA++++", category: "Sunscreen",
    color: "#f1ede6", cap: "#2b2b2b", label: "#f1ede6", ink: "#3c342d", price: 24, sizes: ["50 ml", "100 ml"], rating: 4.7, reviews: 1608,
    tagline: "A weightless daily fluid with high protection.",
    description: "A clear-finish chemical sunscreen fluid with SPF 50 that disappears into skin, never pills and doubles as a hydrating primer.",
    benefits: ["SPF 50 PA++++", "Invisible finish", "Water resistant 40 min"],
    ingredients: "Aqua, Homosalate, Ethylhexyl Salicylate, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Glycerin, Niacinamide.",
    howTo: "Apply two finger lengths to face and neck each morning. Reapply after swimming or sweating.",
  },
  {
    id: "lip-treatment", kind: "lip", name: "Peptide Lip Treatment", short: "peptide lip", sub: "treatment", category: "Lip care",
    color: "#e7c3bb", cap: "#e7c3bb", label: "#e7c3bb", ink: "#7d4740", price: 18, sizes: ["10 ml"], rating: 4.8, reviews: 9420,
    tagline: "A glossy, cushiony balm with peptides.",
    description: "A thick, high-shine treatment with peptides and shea that smooths and plumps the look of lips, with a sheer wash of colour.",
    benefits: ["Peptide complex", "Glossy, non-sticky finish", "Sheer ribbon tint"],
    ingredients: "Polybutene, Shea Butter, Palmitoyl Tripeptide-1, Babassu Oil, Cupuacu Butter, Tocopherol.",
    howTo: "Apply to bare lips or over liner. Reapply whenever you like.",
  },
  {
    id: "squalane-cleanser", kind: "tube", name: "Squalane Cleanser", short: "Squalane", sub: "Cleanser", category: "Cleanser",
    color: "#f6f6f3", cap: "#f6f6f3", label: "#f6f6f3", ink: "#111111", price: 10, sizes: ["50 ml", "150 ml"], rating: 4.7, reviews: 12040,
    tagline: "A balm-to-oil cleanser that lifts makeup.",
    description: "A gentle balm that melts into an oil as you massage, dissolving makeup and sunscreen without leaving skin tight or dry.",
    benefits: ["Removes makeup", "Never stripping", "Rinses clean"],
    ingredients: "Squalane, Aqua, Coco-Caprylate/Caprate, Glycerin, Sucrose Stearate, Ethyl Macadamiate.",
    howTo: "Massage onto dry skin, add water to emulsify, then rinse.",
  },
  {
    id: "malt-shampoo", kind: "bottle", name: "Malt & Hops Volumising Shampoo", short: "Malt & Hops", sub: "Volumising shampoo", category: "Hair care",
    color: "#7a3f14", cap: "#141414", label: "#f6f2ea", ink: "#111111", glass: true, liquid: "#b8752a", price: 18, compareAt: 22, sizes: ["250 ml", "500 ml"], rating: 4.6, reviews: 611,
    tagline: "Brewed for body and shine.",
    description: "Made with brewer's hops, malt protein and biotin, this lather lifts flat hair at the root and leaves a glassy shine from root to tip.",
    benefits: ["Volume at the root", "Sulfate free", "Colour safe"],
    ingredients: "Aqua, Humulus Lupulus Extract, Hydrolyzed Barley Protein, Coco-Glucoside, Biotin, Citric Acid.",
    howTo: "Massage into wet hair, leave for one minute, rinse. Follow with conditioner.",
  },
  {
    id: "glycolic-toner", kind: "bottle", name: "Glycolic Acid 7% Toning Solution", short: "Glycolic Acid 7%", sub: "Toning solution", category: "Exfoliant",
    color: "#e8eef0", cap: "#f4f4f1", label: "#ffffff", ink: "#111111", glass: true, liquid: "#f2e9ee", price: 13, sizes: ["100 ml", "240 ml"], rating: 4.5, reviews: 15530,
    tagline: "Exfoliates for brighter, smoother skin.",
    description: "A 7% glycolic acid toner with amino acids, aloe and ginseng that gently resurfaces for improved radiance and a more even texture.",
    benefits: ["7% glycolic acid", "Improves radiance", "Use in the evening"],
    ingredients: "Aqua, Glycolic Acid, Rosa Damascena Flower Water, Aloe Barbadensis Leaf Water, Panax Ginseng Root Extract.",
    howTo: "Sweep over the face with a cotton pad in the evening. Use sunscreen the next day.",
  },
  {
    id: "barrier-butter", kind: "jar", name: "Barrier Butter Night Cream", short: "barrier butter", sub: "night cream", category: "Night cream",
    color: "#e8dbd1", cap: "#e8dbd1", label: "#e8dbd1", ink: "#6b4f44", price: 28, sizes: ["50 ml"], rating: 4.8, reviews: 2710,
    tagline: "A buttery overnight cream for soft mornings.",
    description: "A dense, cocooning night cream with shea, peptides and bakuchiol that restores moisture and smooths the look of fine lines while you sleep.",
    benefits: ["Bakuchiol and peptides", "Rich, non-greasy", "Barrier repair overnight"],
    ingredients: "Aqua, Shea Butter, Squalane, Bakuchiol, Palmitoyl Tripeptide-1, Ceramide NP, Cholesterol.",
    howTo: "Apply as the last step of your evening routine.",
  },
  {
    id: "no1-parfum", kind: "perfume", name: "No. 1 Eau de Parfum", short: "No. 1", sub: "Eau de parfum", category: "Fragrance",
    color: "#eeece8", cap: "#151515", label: "#eeece8", ink: "#1a1a1a", glass: true, liquid: "#f1e2cd", price: 68, sizes: ["50 ml", "100 ml"], rating: 4.9, reviews: 812,
    tagline: "Skin musk, white tea and a little fig.",
    description: "A quiet, close-to-skin scent that smells like freshly washed skin, warmed with musk and lifted with white tea and green fig.",
    benefits: ["8 hour wear", "Vegan formula", "Refillable bottle"],
    ingredients: "Alcohol Denat., Parfum, Aqua, Ambrettolide, Iso E Super, Fig Leaf Absolute.",
    howTo: "Spray once on the wrist and once on the neck. Layer for more.",
  },
];

// ---------- colour ----------

type RGB = [number, number, number];
const hexRgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, k = 1, a = 1) => `rgba(${[0, 1, 2].map((i) => Math.round(Math.min(255, Math.max(0, c[i] * k)))).join(",")},${a})`;
const WHITE: RGB = [255, 255, 255];
const lum = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

// ---------- packaging (viewBox 200 x 300, everything stands on y = 286) ----------

type Box = { x: number; y: number; w: number; h: number };
type Shape = {
  body: string;
  box: Box;
  /** Where the print sits. `paper` puts it on a paper label instead of straight on the pack. */
  print: Box & { paper?: boolean };
  /** Liquid top for see-through packs. */
  fill?: number;
  /** Dip tube for see-through pumps and mists. */
  tube?: boolean;
  cap: (id: string) => ReactNode;
};

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;

// knurled grip: fine vertical ridges across a cap
const ridges = (x: number, y: number, w: number, h: number, step = 2.6) =>
  Array.from({ length: Math.floor(w / step) }, (_, i) => (
    <line key={i} x1={x + 1 + i * step} y1={y + 1.5} x2={x + 1 + i * step} y2={y + h - 1.5} stroke="#000" strokeOpacity={i % 2 ? 0.14 : 0.06} strokeWidth="1" />
  ));

const SHAPES: Record<Kind, Shape> = {
  jar: {
    body: "M42 208 H158 Q162 208 162 214 V276 Q162 286 150 286 H50 Q38 286 38 276 V214 Q38 208 42 208 Z",
    box: { x: 38, y: 208, w: 124, h: 78 },
    print: { x: 38, y: 226, w: 124, h: 46 },
    cap: (id) => (
      <>
        <path d={rr(36, 172, 128, 38, 6)} fill={`url(#${id}-cap)`} />
        <g>{ridges(36, 178, 128, 30, 2.2)}</g>
        <path d={rr(36, 172, 128, 38, 6)} fill={`url(#${id}-capv)`} />
        <path d="M42 173.2 H158" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" />
        <rect x="38" y="208" width="124" height="3" fill="#000" opacity="0.22" />
      </>
    ),
  },
  tube: {
    body: "M80 250 L67 74 Q66 60 74 58 L126 58 Q134 60 133 74 L120 250 Z",
    box: { x: 66, y: 58, w: 68, h: 192 },
    print: { x: 66, y: 104, w: 68, h: 110 },
    cap: (id) => (
      <>
        {/* flat, crimped end with its sealing teeth */}
        <path d={`M62 40 H138 V58 H62 Z`} fill={`url(#${id}-body)`} />
        <path d={`M62 40 ${Array.from({ length: 19 }, (_, i) => `L${64 + i * 4} ${i % 2 ? 40 : 37.5}`).join(" ")} L138 40`} fill={`url(#${id}-body)`} />
        {Array.from({ length: 18 }, (_, i) => (
          <line key={i} x1={64 + i * 4.1} y1="42" x2={64 + i * 4.1} y2="56" stroke="#000" strokeOpacity="0.09" />
        ))}
        <text x="132" y="53" fontSize="3.4" textAnchor="end" fill="#000" fillOpacity="0.35">L2611 EXP 06/28</text>
        <path d={rr(73, 248, 54, 38, 7)} fill={`url(#${id}-cap)`} />
        <g>{ridges(73, 256, 54, 28, 2.4)}</g>
        <path d={rr(73, 248, 54, 38, 7)} fill={`url(#${id}-capv)`} />
        <path d="M75 251 H125" stroke="#000" strokeOpacity="0.2" />
      </>
    ),
  },
  pump: {
    body: "M58 136 Q58 110 84 108 L116 108 Q142 110 142 136 L142 272 Q142 286 128 286 L72 286 Q58 286 58 272 Z",
    box: { x: 58, y: 108, w: 84, h: 178 },
    print: { x: 58, y: 160, w: 84, h: 90 },
    tube: true,
    fill: 132,
    cap: (id) => (
      <>
        <rect x="95.5" y="60" width="9" height="32" fill={`url(#${id}-cap)`} />
        <path d="M82 50 H126 Q132 50 132 55 V64 H78 V55 Q78 50 82 50 Z" fill={`url(#${id}-cap)`} />
        <path d="M126 53 H153 Q157 53 157 56.5 V60 H126 Z" fill={`url(#${id}-cap)`} />
        <path d="M80 51.5 H128" stroke="#fff" strokeOpacity="0.7" />
        <path d={rr(80, 88, 40, 22, 3)} fill={`url(#${id}-cap)`} />
        <g>{ridges(80, 88, 40, 22, 2.2)}</g>
        <path d={rr(80, 88, 40, 22, 3)} fill={`url(#${id}-capv)`} />
      </>
    ),
  },
  dropper: {
    body: "M64 170 Q64 152 86 150 L86 140 L114 140 L114 150 Q136 152 136 170 L136 272 Q136 286 122 286 L78 286 Q64 286 64 272 Z",
    box: { x: 64, y: 140, w: 72, h: 146 },
    print: { x: 64, y: 192, w: 72, h: 70, paper: true },
    fill: 168,
    cap: (id) => (
      <>
        <path d="M86 118 V86 Q86 62 100 62 Q114 62 114 86 V118 Z" fill={`url(#${id}-bulb)`} />
        <path d="M91 74 Q93 66 100 65" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d={rr(80, 114, 40, 28, 3)} fill={`url(#${id}-cap)`} />
        <g>{ridges(80, 114, 40, 28, 2)}</g>
        <path d={rr(80, 114, 40, 28, 3)} fill={`url(#${id}-capv)`} />
      </>
    ),
  },
  perfume: {
    body: "M58 166 H142 Q154 166 156 178 L158 270 Q158 286 142 286 H58 Q42 286 42 270 L44 178 Q46 166 58 166 Z",
    box: { x: 42, y: 166, w: 116, h: 120 },
    print: { x: 66, y: 204, w: 68, h: 44 },
    fill: 178,
    cap: (id) => (
      <>
        <rect x="88" y="150" width="24" height="18" fill={`url(#${id}-cap)`} />
        <path d={rr(70, 96, 60, 56, 4)} fill={`url(#${id}-cap)`} />
        <path d={rr(70, 96, 60, 56, 4)} fill={`url(#${id}-capv)`} />
        <path d="M72 97.5 H128" stroke="#fff" strokeOpacity="0.8" />
      </>
    ),
  },
  mist: {
    body: "M62 154 Q62 130 86 128 L114 128 Q138 130 138 154 L138 272 Q138 286 124 286 L76 286 Q62 286 62 272 Z",
    box: { x: 62, y: 128, w: 76, h: 158 },
    print: { x: 62, y: 178, w: 76, h: 78 },
    tube: true,
    fill: 168,
    cap: (id) => (
      <>
        <path d={rr(82, 110, 36, 22, 3)} fill={`url(#${id}-cap)`} />
        <g>{ridges(82, 110, 36, 22, 2.2)}</g>
        <path d={rr(86, 82, 28, 30, 6)} fill={`url(#${id}-cap)`} />
        <path d={rr(86, 82, 28, 30, 6)} fill={`url(#${id}-capv)`} />
        <circle cx="111" cy="94" r="2.2" fill="#000" opacity="0.45" />
      </>
    ),
  },
  bottle: {
    body: "M62 114 Q62 86 86 82 L114 82 Q138 86 138 114 L141 268 Q141 286 122 286 L78 286 Q59 286 59 268 Z",
    box: { x: 59, y: 82, w: 82, h: 204 },
    print: { x: 59, y: 140, w: 82, h: 100, paper: true },
    fill: 110,
    cap: (id) => (
      <>
        <path d={rr(78, 50, 44, 34, 6)} fill={`url(#${id}-cap)`} />
        <path d={rr(78, 50, 44, 34, 6)} fill={`url(#${id}-capv)`} />
        <path d="M80 63 H120" stroke="#000" strokeOpacity="0.45" />
        <path d="M80 51.5 H120" stroke="#fff" strokeOpacity="0.4" />
      </>
    ),
  },
  lip: {
    body: "M89 250 L85 152 Q85 144 91 143 L109 143 Q115 144 115 152 L111 250 Z",
    box: { x: 85, y: 143, w: 30, h: 107 },
    print: { x: 85, y: 166, w: 30, h: 60 },
    cap: (id) => (
      <>
        <path d={`M83 128 H117 V143 H83 Z`} fill={`url(#${id}-body)`} />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={85 + i * 4.2} y1="130" x2={85 + i * 4.2} y2="141" stroke="#000" strokeOpacity="0.08" />
        ))}
        <path d={rr(86, 248, 28, 38, 5)} fill={`url(#${id}-cap)`} />
        <path d={rr(86, 248, 28, 38, 5)} fill={`url(#${id}-capv)`} />
      </>
    ),
  },
  stick: {
    body: rr(81, 224, 38, 62, 4),
    box: { x: 81, y: 224, w: 38, h: 62 },
    print: { x: 81, y: 236, w: 38, h: 38 },
    cap: (id) => (
      <>
        <path d={rr(81, 168, 38, 58, 5)} fill={`url(#${id}-cap)`} />
        <path d={rr(81, 168, 38, 58, 5)} fill={`url(#${id}-capv)`} />
        <rect x="81" y="222" width="38" height="2.5" fill="#000" opacity="0.3" />
      </>
    ),
  },
};

// How tall and wide each pack is (cap included), so small ones can be zoomed to fill the product page.
const EXTENT: Record<Kind, { top: number; w: number }> = {
  jar: { top: 172, w: 128 }, tube: { top: 37, w: 76 }, pump: { top: 50, w: 101 }, dropper: { top: 60, w: 72 },
  perfume: { top: 96, w: 116 }, mist: { top: 80, w: 76 }, bottle: { top: 48, w: 84 }, stick: { top: 166, w: 38 }, lip: { top: 128, w: 34 },
};
const pageZoom = (k: Kind) => Math.min(2.2, 262 / (290 - EXTENT[k].top), 190 / EXTENT[k].w);

// ---------- the product drawing ----------

function ProductArt({ p, spin, className, brand }: { p: Product; spin?: MotionValue<number>; className?: string; brand: string }) {
  const id = "ps" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const s = SHAPES[p.kind];
  const c = hexRgb(p.color);
  const k = hexRgb(p.cap);
  const lab = hexRgb(p.label);
  const a = p.glass ? (lum(c) > 200 ? 0.28 : 0.8) : 1;
  const liq = hexRgb(p.liquid ?? p.color);
  const { print: P, box: B } = s;
  const period = P.w * 2.6; // the print covers the front, then the back of the pack goes by
  const fallback = useMotionValue(0);
  const x = useTransform(spin ?? fallback, (v) => -((((v * period) % period) + period) % period));
  const nameSize = Math.min(10.5, P.w * 0.12, (P.w * 1.12) / p.short.length);
  const subSize = Math.min(7, P.w * 0.08, (P.w * 1.25) / Math.max(1, (p.sub ?? "").length));
  const brandText = (p.brand ?? brand).toUpperCase();
  const brandSize = Math.min(6.5, P.w * 0.075, (P.w * 0.92) / (brandText.length * 0.82));
  const printArt = (dx: number) => (
    <g transform={`translate(${dx} 0)`}>
      {P.paper && <rect x={P.x} y={P.y} width={P.w} height={P.h} fill={css(lab)} />}
      <text x={P.x + P.w / 2} y={P.y + P.h * 0.2} fill={p.ink} fontSize={brandSize} fontWeight="600" letterSpacing={brandSize * 0.22} textAnchor="middle">{brandText}</text>
      <text x={P.x + P.w / 2} y={P.y + P.h * 0.46} fill={p.ink} fontSize={nameSize} fontWeight="500" letterSpacing="-0.15" textAnchor="middle">{p.short}</text>
      {p.sub && <text x={P.x + P.w / 2} y={P.y + P.h * 0.62} fill={p.ink} fontSize={subSize} opacity="0.8" textAnchor="middle">{p.sub}</text>}
      <text x={P.x + P.w / 2} y={P.y + P.h * 0.86} fill={p.ink} opacity="0.6" fontSize={Math.min(5.8, P.w * 0.07)} textAnchor="middle">{p.sizes[0]}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 200 300" className={className} aria-hidden overflow="visible">
      <defs>
        {/* cylinder shading lit by a big softbox from the front left, with a bounce on the right */}
        <linearGradient id={`${id}-body`} x1="0" x2="1">
          <stop offset="0" stopColor={css(c, 0.42, a)} />
          <stop offset="0.06" stopColor={css(c, 0.64, a)} />
          <stop offset="0.1" stopColor={css(c, 0.92, a)} />
          <stop offset="0.16" stopColor={css(mixRgb(c, WHITE, 0.16), 1, a)} />
          <stop offset="0.36" stopColor={css(c, 1.02, a)} />
          <stop offset="0.55" stopColor={css(c, 0.93, a)} />
          <stop offset="0.76" stopColor={css(c, 0.78, a)} />
          <stop offset="0.9" stopColor={css(c, 0.6, a)} />
          <stop offset="0.95" stopColor={css(mixRgb(c, WHITE, 0.14), 0.9, a)} />
          <stop offset="1" stopColor={css(c, 0.5, a)} />
        </linearGradient>
        <linearGradient id={`${id}-cap`} x1="0" x2="1">
          <stop offset="0" stopColor={css(k, 0.4)} />
          <stop offset="0.1" stopColor={css(k, 0.7)} />
          <stop offset="0.22" stopColor={css(mixRgb(k, WHITE, 0.6))} />
          <stop offset="0.3" stopColor={css(k, 1.02)} />
          <stop offset="0.6" stopColor={css(k, 0.86)} />
          <stop offset="0.85" stopColor={css(k, 0.62)} />
          <stop offset="0.93" stopColor={css(mixRgb(k, WHITE, 0.2), 0.9)} />
          <stop offset="1" stopColor={css(k, 0.4)} />
        </linearGradient>
        <linearGradient id={`${id}-capv`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="0.2" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.86" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`${id}-wrap`} x1="0" x2="1">
          <stop offset="0" stopColor={css(c, 0.42)} stopOpacity="1" />
          <stop offset="0.14" stopColor={css(c, 0.42)} stopOpacity="0" />
          <stop offset="0.86" stopColor={css(c, 0.42)} stopOpacity="0" />
          <stop offset="1" stopColor={css(c, 0.42)} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${id}-liquid`} x1="0" x2="1">
          <stop offset="0" stopColor={css(liq, 0.7)} />
          <stop offset="0.3" stopColor={css(liq, 1)} />
          <stop offset="0.7" stopColor={css(liq, 0.92)} />
          <stop offset="1" stopColor={css(liq, 0.7)} />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <path d={s.body} />
        </clipPath>
        <radialGradient id={`${id}-bulb`} cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor={css(mixRgb(k, WHITE, 0.4))} />
          <stop offset="0.55" stopColor={css(k, 0.9)} />
          <stop offset="1" stopColor={css(k, 0.55)} />
        </radialGradient>
        <radialGradient id={`${id}-floor`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* contact shadow: a tight dark line where it touches, a soft spread around it */}
      <ellipse cx="100" cy="287" rx={B.w * 0.7} ry="6" fill={`url(#${id}-floor)`} />
      <ellipse cx="100" cy="286.3" rx={B.w * 0.47} ry="1.4" fill="#000" opacity="0.35" />

      <path d={s.body} fill={`url(#${id}-body)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {p.glass && s.fill !== undefined && (
          <>
            <rect x={B.x + 3} y={s.fill} width={B.w - 6} height={286 - s.fill - 9} fill={`url(#${id}-liquid)`} opacity="0.75" />
            <rect x={B.x + 3} y={s.fill} width={B.w - 6} height="1.6" fill="#fff" opacity="0.45" />
            {s.tube && <rect x="98.6" y={B.y - 4} width="2.8" height={286 - B.y - 4} fill="#fff" opacity="0.4" />}
            {/* thick glass base */}
            <rect x={B.x} y="274" width={B.w} height="12" fill={css(c, 0.5, 0.55)} />
            <path d={`M${B.x + 6} 275 H${B.x + B.w - 6}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />
          </>
        )}
        <motion.g style={{ x }}>
          {printArt(0)}
          {printArt(period)}
        </motion.g>
        {/* the print fades into shadow as it curves round the sides */}
        <rect x={B.x} y={P.y - 2} width={B.w} height={P.h + 4} fill={`url(#${id}-wrap)`} opacity="0.5" />
        <rect x={B.x} y={B.y} width={B.w} height={B.h} fill={`url(#${id}-shade)`} />
        {/* softbox reflections: one broad and soft, one crisp, a faint kicker on the right */}
        <rect x={B.x + B.w * 0.07} y={B.y + 4} width={B.w * 0.11} height={B.h - 8} rx="3" fill="#fff" opacity={lum(c) > 200 ? 0.45 : 0.3} filter={`url(#${id}-soft)`} />
        <rect x={B.x + B.w * 0.11} y={B.y + 6} width={B.w * 0.028} height={B.h - 12} rx="1" fill="#fff" opacity="0.85" />
        <rect x={B.x + B.w * 0.86} y={B.y + 8} width={B.w * 0.025} height={B.h - 16} rx="1" fill="#fff" opacity="0.3" />
      </g>
      <path d={s.body} fill="none" stroke={css(c, 0.45, 0.45)} strokeWidth="0.7" />
      {s.cap(id)}
    </svg>
  );
}

// ---------- component ----------

export type ShelfLabels = {
  shelf: string; dragToTurn: string; size: string; addToBag: string; addedToBag: string;
  decrease: string; increase: string; details: string; ingredients: string; howTo: string;
  ratings: string; bag: string; item: string; items: string; shelfAria: string;
};
const DEFAULT_LABELS: ShelfLabels = {
  shelf: "Shelf", dragToTurn: "Drag to turn", size: "Size", addToBag: "Add to Bag", addedToBag: "Added to Bag",
  decrease: "Decrease quantity", increase: "Increase quantity", details: "Details", ingredients: "Ingredients", howTo: "How to use",
  ratings: "ratings", bag: "Bag", item: "item", items: "items", shelfAria: "Shelf",
};

export type ProductShelfProps = {
  products?: Product[];
  currency?: string;
  /** Formata preços. Padrão: `${currency}${valor}`. */
  formatPrice?: (value: number) => string;
  /** Marca impressa nas embalagens que não têm `brand` e no topo da página. */
  brand?: string;
  labels?: Partial<ShelfLabels>;
  /** Chamado ao tocar em Add to Bag; use para ligar a uma sacola externa. */
  onAddToBag?: (product: Product, sizeIndex: number, unitPrice: number, qty: number) => void;
  /** Mostra a marca e a sacola fixas no topo. Desligue ao embutir numa página que já tem cabeçalho. */
  showChrome?: boolean;
  /** Distância (px) do topo da tela até a página do produto, para deixar um cabeçalho visível. */
  overlayTop?: number;
  /** Linhas extras de informação abaixo do botão (ex.: Entrega). */
  info?: { label: string; value: string }[];
  /** Conteúdo extra na página do produto, abaixo das seções. */
  renderExtra?: (product: Product) => ReactNode;
  /** Quantos produtos por prateleira (padrão: 2, 3 ou 4 conforme a largura da tela). */
  perRow?: number;
  className?: string;
  children?: ReactNode;
};

const priceAt = (p: Product, i: number) => p.sizePrices?.[i] ?? p.price * (i > 0 ? 1.7 : 1);

function useColumns(fixed?: number) {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    if (fixed) return;
    const calc = () => setCols(window.innerWidth < 640 ? 2 : window.innerWidth < 1100 ? 3 : 4);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [fixed]);
  return fixed ?? cols;
}

const SPRING = { type: "spring" as const, bounce: 0, duration: 0.55 };
const INK = "#111111";

export function ProductShelf({
  products = DEFAULT_PRODUCTS, currency = "$", formatPrice, brand = "SKASMAN", labels: labelOverrides, onAddToBag, showChrome = true,
  overlayTop = 0, info, renderExtra, perRow, className, children,
}: ProductShelfProps) {
  const L = { ...DEFAULT_LABELS, ...labelOverrides };
  const fmt = (v: number) => (formatPrice ? formatPrice(v) : `${currency}${v}`);
  const cols = useColumns(perRow);
  const [openId, setOpenId] = useState(null as string | null);
  const [bag, setBag] = useState(0);
  const [bump, setBump] = useState(0);
  const bagRef = useRef(null as HTMLButtonElement | null);
  const rows = Array.from({ length: Math.ceil(products.length / cols) }, (_, r) => products.slice(r * cols, r * cols + cols));
  const open = products.find((p) => p.id === openId) ?? null;

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const addToBag = (p: Product, sizeIndex: number, unitPrice: number, qty: number) => {
    setBag((b) => b + qty);
    setBump((n) => n + 1);
    onAddToBag?.(p, sizeIndex, unitPrice, qty);
  };

  return (
    <div
      className={cn("product-shelf relative min-h-dvh w-full overflow-x-hidden bg-[#f3f1ed] font-sans text-[#111] antialiased", className)}
    >
      {/* wordmark top left, bag top right; both float above the product page too */}
      {showChrome && <div className="pointer-events-none fixed top-4 left-5 z-30 flex h-11 items-center text-[15px] font-semibold tracking-[0.18em]">{brand.toUpperCase()}</div>}
      {showChrome && <button
        ref={bagRef}
        type="button"
        aria-label={`${L.bag}, ${bag} ${bag === 1 ? L.item : L.items}`}
        className="fixed top-4 right-4 z-30 grid size-11 place-items-center rounded-xl bg-white/80 text-[#111111] shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06] backdrop-blur-xl transition-[transform,background-color] duration-100 hover:bg-white active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-[#111111]"
      >
        <ShoppingBag className="size-[19px]" strokeWidth={1.6} />
        {bag > 0 && (
          <motion.span
            key={bump}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
            className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-[9px] bg-[#111111] px-1 text-[11px] font-semibold text-white tabular-nums"
          >
            {bag}
          </motion.span>
        )}
      </button>}

      <LayoutGroup>
        <main className={cn("mx-auto w-full max-w-[1080px] px-5 pb-12", showChrome ? "pt-16" : "pt-2")}>

          {rows.map((row, r) => (
            <section key={r} aria-label={`${L.shelfAria} ${r + 1}`} className="relative mb-14">
              <div className="relative z-10 grid items-end gap-3 px-3 sm:gap-8 sm:px-8" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {row.map((p) => (
                  <div key={p.id} className="flex flex-col items-center">
                    {openId === p.id ? (
                      <div className="aspect-[2/3] w-full max-w-[160px]" />
                    ) : (
                      <motion.button
                        layoutId={`product-${p.id}`}
                        type="button"
                        onClick={() => setOpenId(p.id)}
                        aria-label={`${p.name}, ${fmt(p.price)}`}
                        transition={SPRING}
                        className="relative aspect-[2/3] w-full max-w-[160px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                      >
                        <ProductArt p={p} brand={brand} className="size-full" />
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>
              {/* floating white shelf: lit top, crisp front edge, soft shadow on the wall */}
              <div aria-hidden className="relative -mt-[6px] h-[16px]">
                <div className="absolute inset-x-0 top-0 h-[8px] bg-[linear-gradient(to_bottom,#e6e6ea,#fbfbfd)]" />
                <div className="absolute inset-x-0 top-[8px] h-[8px] bg-[linear-gradient(to_bottom,#ffffff,#ececf0)] shadow-[0_1px_0_rgba(0,0,0,0.04)]" />
                <div className="absolute inset-x-[2%] top-[16px] h-[34px] bg-[radial-gradient(50%_100%_at_50%_0%,rgba(0,0,0,0.13),transparent)]" />
              </div>
              <div className="mt-5 grid gap-3 px-3 sm:gap-8 sm:px-8" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {row.map((p) => (
                  <div key={p.id} className="text-center">
                    <div className="text-[13px] leading-tight font-medium sm:text-[14px]">{p.short}</div>
                    <div className="mt-0.5 text-[12px] text-[#6f6a64] tabular-nums sm:text-[13px]">{fmt(p.price)}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>

        <AnimatePresence>
          {open && <ProductPage key={open.id} p={open} fmt={fmt} L={L} brand={brand} info={info} renderExtra={renderExtra} overlayTop={showChrome ? 0 : overlayTop} onClose={() => setOpenId(null)} onAdd={addToBag} bagRef={bagRef} />}
        </AnimatePresence>
      </LayoutGroup>
      {children}
    </div>
  );
}

function ProductPage({ p, fmt, L, brand, info, renderExtra, overlayTop, onClose, onAdd, bagRef }: {
  p: Product; fmt: (v: number) => string; L: ShelfLabels; brand: string; info?: { label: string; value: string }[]; renderExtra?: (p: Product) => ReactNode;
  overlayTop: number; onClose: () => void; onAdd: (p: Product, sizeIndex: number, unitPrice: number, qty: number) => void; bagRef: RefObject<HTMLButtonElement | null>;
}) {
  const reduce = useReducedMotion();
  const spin = useMotionValue(0);
  const [size, setSize] = useState(p.sizes[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [section, setSection] = useState(L.details as string | null);
  const closeRef = useRef(null as HTMLButtonElement | null);
  const drag = useRef(null as { x: number; v: number; samples: { x: number; t: number }[] } | null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    if (reduce) return;
    // one turn as it arrives, the print wrapping right round
    const c = animate(spin, 1, { duration: 1.1, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 });
    return () => c.stop();
  }, [spin, reduce]);

  const sizeIndex = Math.max(0, p.sizes.indexOf(size));
  const price = priceAt(p, sizeIndex);
  const add = () => {
    onAdd(p, sizeIndex, price, qty);
    setAdded(true);
    bagRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" });
    setTimeout(() => setAdded(false), 1800);
  };

  // drag to turn: 1:1 while held, then keep the release speed and settle facing front
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    spin.stop();
    drag.current = { x: e.clientX, v: spin.get(), samples: [{ x: e.clientX, t: e.timeStamp }] };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    spin.set(d.v - (e.clientX - d.x) / 380);
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 5) d.samples.shift();
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const vx = last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0; // px/s
    const velocity = -vx / 380; // turns/s
    const projected = spin.get() + ((velocity / 1000) * 0.998) / (1 - 0.998); // Apple's momentum projection
    animate(spin, Math.round(projected), { type: "spring", bounce: 0, duration: 0.9, velocity });
  };

  const sections: [string, ReactNode][] = [
    [L.details, <ul key="d" className="list-disc space-y-1 pl-5">{p.benefits.map((b) => <li key={b}>{b}</li>)}</ul>],
    [L.ingredients, <p key="i">{p.ingredients}</p>],
    [L.howTo, <p key="h">{p.howTo}</p>],
  ];

  return (
    <motion.div role="dialog" aria-modal="true" aria-label={p.name} className="fixed inset-x-0 bottom-0 z-20 overflow-y-auto" style={{ top: overlayTop, ["--ov" as string]: `${overlayTop}px` }}
      onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.dismiss !== undefined) onClose(); }}>
      <motion.div data-dismiss className="fixed inset-x-0 bottom-0 cursor-pointer bg-[#f3f1ed]/88" style={{ top: overlayTop }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      <div data-dismiss className={cn("relative mx-auto grid min-h-full max-w-[1080px] grid-cols-1 items-center gap-8 px-5 pb-12 md:grid-cols-[1.05fr_1fr] md:gap-14", overlayTop ? "pt-8" : "pt-20")}>
        {/* the product, moved over from the shelf, standing on a white surface */}
        <div data-dismiss className="relative flex flex-col items-center justify-center md:h-[calc(100dvh-7rem-var(--ov,0px))]">
          <motion.div
            layoutId={`product-${p.id}`}
            transition={SPRING}
            className="relative z-10 aspect-[2/3] h-[44vh] cursor-grab touch-none select-none active:cursor-grabbing md:h-[62vh]"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {/* small packs (lip tube, balm, jars) zoom up from where they stand to fill the frame */}
            <motion.div
              className="pointer-events-none size-full"
              style={{ transformOrigin: "50% 96.7%" }}
              initial={{ scale: 1 }}
              animate={{ scale: pageZoom(p.kind) }}
              exit={{ scale: 1 }}
              transition={SPRING}
            >
              <ProductArt p={p} brand={brand} spin={spin} className="size-full" />
            </motion.div>
          </motion.div>
          <motion.div
            aria-hidden
            className="relative -mt-[1.5%] h-[18px] w-[86%] rounded-[3px] bg-[linear-gradient(to_bottom,#ffffff,#ececf0)] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.18)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <p className="mt-6 text-[12px] text-[#8f8982]">{L.dragToTurn}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ ...SPRING, delay: 0.05 }}
          className="relative z-20 cursor-auto"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-ml-1.5 mb-6 inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[15px] text-[#111111] underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-[#111111]"
          >
            <ChevronLeft className="size-4" strokeWidth={2.2} /> {L.shelf}
          </button>
          <div className="text-[14px] text-[#6f6a64]">{p.category}</div>
          <h2 className="mt-1 text-[clamp(30px,4vw,40px)] leading-[1.08] font-semibold tracking-[-0.022em]">{p.name}</h2>
          <p className="mt-2 text-[19px] leading-snug text-[#6f6a64]">{p.tagline}</p>
          {p.rating !== undefined && (
            <div className="mt-3 flex items-center gap-1.5 text-[14px] text-[#6f6a64]">
              <span className="flex text-[#111111]" aria-label={`Rated ${p.rating} out of 5`}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-[14px]" fill={i < Math.round(p.rating!) ? INK : "transparent"} strokeWidth={1.4} />
                ))}
              </span>
              {p.rating.toFixed(1)}{p.reviews !== undefined && <> · {p.reviews.toLocaleString()} {L.ratings}</>}
            </div>
          )}

          <div className="mt-6 flex items-baseline gap-2.5 tabular-nums">
            <span className="text-[24px] font-semibold tracking-[-0.01em]">{fmt(price)}</span>
            {p.compareAt && <span className="text-[17px] text-[#8f8982] line-through">{fmt(p.compareAt * (price / p.price))}</span>}
          </div>
          <p className="mt-4 max-w-[54ch] text-[17px] leading-[1.47] tracking-[-0.01em] text-[#111111]/85">{p.description}</p>

          <fieldset className="mt-7">
            <legend className="mb-2.5 text-[17px] font-semibold tracking-[-0.01em]">{L.size}</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {p.sizes.map((sz, i) => {
                const on = size === sz;
                return (
                  <label
                    key={sz}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3.5 text-[15px] transition-[border-color,box-shadow] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#111111]",
                      on ? "border-[#111111] shadow-[0_0_0_1px_#111111]" : "border-[#d9d4cd] hover:border-[#8f8982]",
                    )}
                  >
                    <input type="radio" name="size" value={sz} checked={on} onChange={() => setSize(sz)} className="sr-only" />
                    <span className="font-medium">{sz}</span>
                    <span className="text-[#6f6a64] tabular-nums">{fmt(priceAt(p, i))}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-7 flex items-stretch gap-3">
            <div className="flex items-center rounded-xl border border-[#d9d4cd] bg-white">
              <button type="button" aria-label={L.decrease} onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-full w-11 place-items-center rounded-l-xl text-[#111111] transition-colors active:bg-black/[0.06] disabled:text-[#d9d4cd]" disabled={qty === 1}>
                <Minus className="size-4" />
              </button>
              <span className="w-7 text-center text-[17px] tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" aria-label={L.increase} onClick={() => setQty((q) => Math.min(9, q + 1))} className="grid h-full w-11 place-items-center rounded-r-xl text-[#111111] transition-colors active:bg-black/[0.06]">
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={add}
              className="h-12 flex-1 rounded-[10px] bg-[#111111] text-[16px] font-medium tracking-[-0.01em] text-white transition-[background-color,transform] duration-100 hover:bg-[#000000] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
            >
              <span aria-live="polite">{added ? L.addedToBag : L.addToBag}</span>
            </button>
          </div>

          <dl className="mt-6 grid gap-1 text-[14px] leading-snug">
            {(info ?? [
              { label: "Delivery", value: "Free, arrives in 2 to 3 days" },
              { label: "Pickup", value: "Ready today at most stores" },
            ]).map((row) => (
              <div key={row.label} className="flex gap-2"><dt className="font-semibold">{row.label}:</dt><dd className="text-[#6f6a64]">{row.value}</dd></div>
            ))}
          </dl>

          <div className="mt-8 border-t border-[#d9d4cd]">
            {sections.map(([title, body]) => {
              const isOpen = section === title;
              return (
                <div key={title} className="border-b border-[#d9d4cd]">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setSection(isOpen ? null : title)}
                    className="flex w-full items-center justify-between py-4 text-left text-[17px] font-semibold tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-[#111111]"
                  >
                    {title}
                    <ChevronDown className={cn("size-[18px] text-[#6f6a64] transition-transform duration-300", isOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING} className="overflow-hidden">
                        <div className="pb-5 text-[15px] leading-relaxed text-[#111111]/80">{body}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {renderExtra?.(p)}
        </motion.div>
      </div>
    </motion.div>
  );
}
