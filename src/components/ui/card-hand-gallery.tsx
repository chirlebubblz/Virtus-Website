"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface FanCardItem {
  /** Stable, unique identifier. */
  id: string;
  /** Image URL rendered as the card face. */
  src: string;
  /** Shown beside the fan while this card is active, and its accessible name. */
  title: string;
  /** Shown on the opposite side while this card is active. */
  description?: string;
  /** Additional metadata for agency / lab portfolios */
  pillar?: string;
  kind?: string;
  visualCredit?: string;
  capabilities?: string[];
  liveUrl?: string | null;
  href?: string;
}

export interface CardHandGalleryProps {
  /** Cards in the hand, in fan order. */
  cards: readonly FanCardItem[];
  /** Active card id. Pass to control the selection yourself. */
  activeId?: string;
  /** Card width in pixels. Height follows a 5:7 ratio. Shrinks to fit narrow containers. */
  cardWidth?: number;
  className?: string;
  /** Initially active card. Defaults to the first card. */
  defaultActiveId?: string;
  /** Custom hover lift in px. Defaults to a subtle ~24-28px (height * 0.08). */
  hoverLift?: number;
  /** Custom active lift in px. Defaults to ~130-140px (height * 0.38). */
  activeLift?: number;
  /** Fires when a different card is picked. */
  onSelect?: (card: FanCardItem) => void;
  /** Custom renderers for left/right info panels */
  renderLeftPanel?: (activeCard: FanCardItem, index: number, total: number) => React.ReactNode;
  renderRightPanel?: (activeCard: FanCardItem, index: number, total: number) => React.ReactNode;
}

/** Flick speed, in px/s, that selects a card regardless of how far it travelled. */
const SELECT_VELOCITY = -600;

/** Cards waiting in the hand sit behind the active one, so they ride smaller. */
const HAND_SCALE = 0.72;

/** Spread each card into a symmetric arc around the middle of the hand. */
function fanTransform(index: number, count: number, spacing: number) {
  const offset = index - (count - 1) / 2;
  // The arc keeps a constant total sweep, so a bigger hand fans tighter.
  const stepDeg = count > 1 ? Math.min(9, 46 / (count - 1)) : 0;
  const rotate = offset * stepDeg;

  return {
    rotate,
    x: offset * spacing,
    y: Math.abs(rotate) * 1.9,
  };
}

export function CardHandGallery({
  cards,
  activeId: controlledActiveId,
  cardWidth = 224,
  className,
  defaultActiveId,
  hoverLift: customHoverLift,
  activeLift: customActiveLift,
  onSelect,
  renderLeftPanel,
  renderRightPanel,
}: CardHandGalleryProps) {
  const shouldReduceMotion = useReducedMotion();
  const fanRef = React.useRef<HTMLDivElement>(null);
  // Set while a pointer drag is in flight so the trailing click is ignored.
  const draggingRef = React.useRef(false);
  const [fanWidth, setFanWidth] = React.useState<number | null>(null);
  const [internalActiveId, setInternalActiveId] = React.useState(
    defaultActiveId ?? cards[0]?.id
  );
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  // Dragging a card claims the vertical touch axis, which on a phone means
  // swiping over the fan scrolls nothing. Pointer devices only.
  const [canDrag, setCanDrag] = React.useState(false);

  // Fall back to the first card whenever the requested id is not in the hand
  const requestedId = controlledActiveId ?? internalActiveId;
  const activeId = cards.some((card) => card.id === requestedId)
    ? requestedId
    : cards[0]?.id;
  const activeIndex = cards.findIndex((card) => card.id === activeId);
  const activeCard = cards[activeIndex];

  React.useEffect(() => {
    setCanDrag(!window.matchMedia("(pointer: coarse)").matches);
  }, []);

  React.useEffect(() => {
    const node = fanRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setFanWidth(entry.contentRect.width);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Cards shrink rather than overflow once the column gets narrow.
  const width = fanWidth === null ? cardWidth : Math.min(cardWidth, fanWidth * 0.55);

  // Every travel distance scales off the card
  const height = width * 1.4;
  const baseBottom = height * 0.09;
  // Subtle micro-lift when cursor is hovered (only ~16-20px so card never jumps too high)
  const hoverLift = customHoverLift ?? Math.round(height * 0.05);
  // Full elevation for the active/selected card
  const activeLift = customActiveLift ?? height * 0.62;
  const selectDistance = -height * 0.5;

  const handCards = cards.filter((card) => card.id !== activeId);
  const hoveredIndex = hoveredId
    ? handCards.findIndex((card) => card.id === hoveredId)
    : -1;

  // Clamp the horizontal spread
  const maxOffset = (handCards.length - 1) / 2;
  const halfAvailable =
    fanWidth === null ? Number.POSITIVE_INFINITY : fanWidth / 2 - width * 0.45;
  const fanSpacing =
    maxOffset > 0
      ? Math.min(
          width * (handCards.length > 5 ? 0.43 : 0.52),
          Math.max(width * 0.23, halfAvailable / maxOffset)
        )
      : 0;

  const cardTransition = shouldReduceMotion
    ? { duration: 0.16, ease: "easeOut" as const }
    : {
        damping: 30,
        mass: 0.9,
        stiffness: 340,
        type: "spring" as const,
      };

  const textTransition = { duration: shouldReduceMotion ? 0 : 0.32 };
  const textOffset = shouldReduceMotion ? 0 : 10;

  function clearHover(id: string) {
    setHoveredId((current) => (current === id ? null : current));
  }

  function selectCard(card: FanCardItem) {
    if (card.id === activeId) return;
    clearHover(card.id);

    if (controlledActiveId === undefined) {
      setInternalActiveId(card.id);
    }
    onSelect?.(card);
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-10 xl:gap-12 2xl:gap-16",
        className
      )}
    >
      {/* Left Info Panel */}
      <div className="w-full shrink-0 text-center lg:w-72 xl:w-80 2xl:w-96 lg:text-right">
        {activeCard ? (
          renderLeftPanel ? (
            renderLeftPanel(activeCard, activeIndex, cards.length)
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: textOffset }}
              key={activeCard.id}
              transition={textTransition}
            >
              <p className="font-mono text-xs uppercase tracking-widest text-[#F5C518]">
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(cards.length).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-balance font-semibold text-2xl text-white leading-tight tracking-tight lg:text-3xl">
                {activeCard.title}
              </h3>
            </motion.div>
          )
        ) : null}
      </div>

      {/* Center Fan Deck */}
      <div
        className="relative w-full min-w-0 flex-1"
        ref={fanRef}
        style={{ minHeight: height * 1.82 }}
      >
        {cards.map((card, idx) => {
          const isActive = card.id === activeId;
          const handIndex = handCards.findIndex((candidate) => candidate.id === card.id);

          let target: { rotate: number; scale: number; x: number; y: number };
          let zIndex: number;

          if (isActive) {
            target = { rotate: 0, scale: 1, x: 0, y: -activeLift };
            zIndex = 100;
          } else {
            const fan = fanTransform(handIndex, handCards.length, fanSpacing);
            const isHovered = card.id === hoveredId;
            const neighborShift =
              hoveredIndex !== -1 && !isHovered
                ? (Math.sign(handIndex - hoveredIndex) * width * 0.14) /
                  Math.max(1, Math.abs(handIndex - hoveredIndex))
                : 0;

            target = {
              rotate: isHovered ? fan.rotate * 0.75 : fan.rotate,
              scale: isHovered ? HAND_SCALE * 1.04 : HAND_SCALE,
              x: fan.x + neighborShift,
              y: isHovered ? fan.y - hoverLift : fan.y,
            };
            zIndex = isHovered ? 60 : 10 + handIndex;
          }

          return (
            <motion.div
              animate={target}
              className="absolute left-1/2"
              initial={false}
              key={card.id}
              style={{ bottom: baseBottom, marginLeft: -width / 2, zIndex }}
              transition={cardTransition}
            >
              <motion.button
                aria-label={card.title}
                aria-pressed={isActive}
                className={cn(
                  "group relative block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-shadow",
                  isActive
                    ? "cursor-default ring-2 ring-[#F5C518] shadow-[0_0_35px_rgba(245,197,24,0.35)]"
                    : "cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-white/40 shadow-xl"
                )}
                drag={canDrag && !isActive ? "y" : false}
                dragConstraints={{ bottom: 0, top: -height * 1.65 }}
                dragElastic={0.12}
                dragSnapToOrigin
                onBlur={() => clearHover(card.id)}
                onClick={() => {
                  if (draggingRef.current) {
                    draggingRef.current = false;
                    return;
                  }
                  selectCard(card);
                }}
                onDragEnd={(_event, info) => {
                  if (
                    info.offset.y < selectDistance ||
                    info.velocity.y < SELECT_VELOCITY
                  ) {
                    selectCard(card);
                  }
                }}
                onDragStart={() => {
                  draggingRef.current = true;
                }}
                onFocus={() => {
                  if (!isActive) setHoveredId(card.id);
                }}
                onHoverEnd={() => clearHover(card.id)}
                onHoverStart={() => {
                  if (!isActive) setHoveredId(card.id);
                }}
                onPointerDown={() => {
                  draggingRef.current = false;
                }}
                type="button"
              >
                {/* Visual Card Face */}
                <div
                  className="relative aspect-[5/7] select-none overflow-hidden rounded-2xl border border-white/20 bg-[#121212] object-cover"
                  style={{ width }}
                >
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 260px"
                    className="h-full w-full object-cover select-none"
                    draggable={false}
                    src={card.src}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none"
                  />

                  {/* Card Corner Index Badge */}
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2.5 py-0.5 font-mono text-[0.625rem] font-bold text-white uppercase backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518]" />
                      LAB.0{idx + 1}
                    </span>
                  </div>

                  {/* Card Bottom Pillar Label */}
                  <div className="absolute bottom-3 inset-x-3 pointer-events-none truncate text-left">
                    <span className="font-mono text-[0.625rem] font-bold uppercase tracking-wider text-[#F5C518] block">
                      {card.pillar || "CONCEPT"}
                    </span>
                    <span className="font-sans text-xs font-bold text-white block truncate">
                      {card.title}
                    </span>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Right Info Panel */}
      <div
        aria-live="polite"
        className="w-full shrink-0 text-center lg:w-72 xl:w-80 2xl:w-96 lg:text-left"
      >
        {activeCard ? (
          renderRightPanel ? (
            renderRightPanel(activeCard, activeIndex, cards.length)
          ) : activeCard.description ? (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="text-pretty text-sm leading-relaxed text-zinc-400"
              initial={{ opacity: 0, y: textOffset }}
              key={activeCard.id}
              transition={textTransition}
            >
              {activeCard.description}
            </motion.p>
          ) : null
        ) : null}
      </div>
    </div>
  );
}

// Alias export for compatibility with ruixen.ui
export const ImageCardFan = CardHandGallery;
