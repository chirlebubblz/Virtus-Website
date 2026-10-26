"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { Logo } from "@/components/public/Logo";
import { Icon } from "@/components/icons/Icon";

const CLIPS = {
  bottom: {
    closedInitial: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
  },
  top: {
    closedInitial: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
  },
  left: {
    closedInitial: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
  },
  right: {
    closedInitial: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
  },
};

const REDUCED_MOTION_FADE_DURATION = 0.22;

const SOCIAL_ICONS: Record<string, ReactNode> = {
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  ),
  twitter: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  ),
  linkedin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  github: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  ),
  mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isVisible = (element?: HTMLElement | null): boolean => {
  if (!element || element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  return element.getClientRects().length > 0;
};

const getFocusableElements = (container?: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  return (Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]).filter(isVisible);
};

interface UseFocusTrapParams {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

export function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
}: UseFocusTrapParams) {
  const onEscapeRef = useRef(onEscape);
  useLayoutEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = () => {
      const target =
        initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container;
      if (!(target instanceof HTMLElement)) return;
      if (target === container && !container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }
      target.focus();
    };

    const focusFrame = requestAnimationFrame(focusInitial);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}

const ANIM_CHAR_LIFT = "1.3em";
const ANIM_CHAR_STEP = 0.01;
const ANIM_GLIDE = "cubic-bezier(0.625, 0.05, 0, 1)";

export interface LinkAnimProps {
  label: string;
  href: string;
  className?: string;
  restColor?: string;
  activeColor?: string;
  underline?: boolean;
  tabIndex?: number;
  onClick?: () => void;
  indexBadge?: string;
  subtitle?: string;
  isCurrent?: boolean;
}

export function LinkAnim({
  label,
  href,
  className = "",
  restColor = "#FFFFFF",
  activeColor = "#F5C518",
  underline = true,
  tabIndex,
  onClick,
  indexBadge,
  subtitle,
  isCurrent = false,
}: LinkAnimProps) {
  const ruleRef = useRef<HTMLSpanElement | null>(null);
  const isTouchRef = useRef(false);
  const hasEnteredRef = useRef(false);

  const [isActive, setIsActive] = useState(false);
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const syncReduced = () => setIsReduced(query.matches);
    syncReduced();
    query.addEventListener("change", syncReduced);
    return () => query.removeEventListener("change", syncReduced);
  }, []);

  useEffect(() => {
    if (!hasEnteredRef.current) {
      hasEnteredRef.current = true;
      return;
    }
    const rule = ruleRef.current;
    if (!rule || isActive || isReduced) return;
    rule.style.transformOrigin = "right center";
    const onSettled = () => {
      rule.style.transformOrigin = "left center";
      rule.removeEventListener("transitionend", onSettled);
    };
    rule.addEventListener("transitionend", onSettled);
    return () => rule.removeEventListener("transitionend", onSettled);
  }, [isActive, isReduced]);

  const chars = [...label];
  const highlighted = isActive || isCurrent;

  return (
    <Link
      prefetch={false}
      href={href}
      tabIndex={tabIndex}
      onClick={onClick}
      onMouseEnter={() => {
        if (isTouchRef.current) return;
        setIsActive(true);
      }}
      onMouseLeave={() => {
        if (isTouchRef.current) return;
        setIsActive(false);
      }}
      onTouchStart={() => {
        isTouchRef.current = true;
      }}
      style={{ color: highlighted ? activeColor : restColor }}
      className={`group relative inline-flex items-baseline gap-3 no-underline transition-colors duration-300 motion-reduce:transition-none ${className}`.trim()}
    >
      {indexBadge && (
        <span
          className={`font-mono text-xs font-bold tracking-widest transition-colors duration-300 ${
            highlighted ? "text-[#F5C518]" : "text-zinc-500 group-hover:text-[#F5C518]"
          }`}
        >
          {indexBadge}
        </span>
      )}

      <span className="relative inline-block w-fit">
        <span
          aria-label={label}
          className="relative inline-block overflow-hidden leading-[1.1]"
        >
          {chars.map((char, index) => (
            <span
              key={`${char}-${index}`}
              aria-hidden="true"
              className="relative inline-block will-change-transform motion-reduce:transition-none"
              style={{
                textShadow: `0px ${ANIM_CHAR_LIFT} currentColor`,
                transform:
                  highlighted && !isReduced
                    ? `translateY(-${ANIM_CHAR_LIFT}) rotate(0.001deg)`
                    : "translateY(0em) rotate(0.001deg)",
                transition: isReduced ? "none" : `transform 0.55s ${ANIM_GLIDE}`,
                transitionDelay: isReduced ? "0s" : `${index * ANIM_CHAR_STEP}s`,
                whiteSpace: char === " " ? "pre" : undefined,
              }}
            >
              {char}
            </span>
          ))}
        </span>

        {subtitle && (
          <span className="block font-sans text-xs font-normal tracking-wider text-zinc-400 group-hover:text-zinc-200 mt-1">
            {subtitle}
          </span>
        )}

        {underline && (
          <span
            ref={ruleRef}
            aria-hidden="true"
            className="absolute bottom-[-4px] left-0 h-[2px] w-full bg-[#F5C518]"
            style={{
              transform: `scaleX(${highlighted && !isReduced ? 1 : 0})`,
              transformOrigin: "left center",
              transition: isReduced ? "none" : `transform 0.45s ${ANIM_GLIDE}`,
            }}
          />
        )}
      </span>
    </Link>
  );
}

export interface PublicNavLink {
  label: string;
  href: string;
  subtitle?: string;
  badge?: string;
}

export interface PreviewCardItem {
  id: string;
  title: string;
  category: string;
  image: string;
  href: string;
}

export interface ImmersiveFullscreenNavProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInquiry?: () => void;
  links?: PublicNavLink[];
  previewCards?: PreviewCardItem[];
  agencyName?: string;
  tagline?: string;
  location?: string;
  overlayBg?: string;
  clipOrigin?: "top" | "bottom" | "left" | "right";
  openDuration?: number;
  closeDuration?: number;
}

const DEFAULT_PUBLIC_LINKS: PublicNavLink[] = [
  {
    label: "Web & Digital",
    href: "/work/web",
    subtitle: "High-conversion web platforms, design systems & engineering",
    badge: "01",
  },
  {
    label: "Brand & Creative",
    href: "/work/brand",
    subtitle: "Identity architecture, design tokens & visual positioning",
    badge: "02",
  },
  {
    label: "Content & Video",
    href: "/work/content",
    subtitle: "High-cadence cinematic motion, editorial & campaigns",
    badge: "03",
  },
  {
    label: "AI & Automation",
    href: "/work/automation",
    subtitle: "Autonomous CRM workflows, generative pipelines & ops tooling",
    badge: "04",
  },
  {
    label: "Book Strategy Call",
    href: "/book",
    subtitle: "30-min discovery session directly with studio directors",
    badge: "05",
  },
  {
    label: "Client Portal",
    href: "/portal",
    subtitle: "Real-time proposal reviews, billing & asset approvals",
    badge: "06",
  },
  {
    label: "Track Milestones",
    href: "/track",
    subtitle: "Live progress tracking across active sprint deliverables",
    badge: "07",
  },
];

const DEFAULT_PREVIEWS: PreviewCardItem[] = [
  {
    id: "apex-engine",
    title: "Apex Engine",
    category: "Web & Platform",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    href: "/work/web",
  },
  {
    id: "kroma-os",
    title: "Kroma OS",
    category: "Design System",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
    href: "/work/brand",
  },
];

export function ImmersiveFullscreenNav({
  isOpen,
  onClose,
  onOpenInquiry,
  links = DEFAULT_PUBLIC_LINKS,
  previewCards = DEFAULT_PREVIEWS,
  agencyName = "THE VIRTUS LABS",
  tagline = "Where brand, technology, and content move together.",
  location = "Manila (GMT+8) → Worldwide",
  overlayBg = "#050505",
  clipOrigin = "bottom",
  openDuration = 0.9,
  closeDuration = 0.75,
}: ImmersiveFullscreenNavProps) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);
  const linksRef = useRef<(HTMLDivElement | null)[]>([]);
  const previewCardsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);
  const isAnimatingRef = useRef(false);

  const reduceMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const { closedInitial, open: openClipPath, closedFinal } =
    CLIPS[clipOrigin] ?? CLIPS.bottom;

  useFocusTrap({
    active: isOpen,
    containerRef: rootRef,
    onEscape: onClose,
  });

  // Body scroll locking while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const onOpenMenu = useCallback(() => {
    timelineRef.current?.kill();
    const isReduced = reduceMotion();

    gsap.set(overlayRef.current, { clipPath: closedInitial });
    gsap.set(contentWrapperRef.current, { opacity: 1, scale: 1 });

    if (isReduced) {
      gsap.set(overlayRef.current, {
        clipPath: openClipPath,
        autoAlpha: 0,
      });

      timelineRef.current = gsap.to(overlayRef.current, {
        autoAlpha: 1,
        duration: REDUCED_MOTION_FADE_DURATION,
        ease: "power2.out",
        onStart: () => {
          isAnimatingRef.current = true;
        },
        onComplete: () => {
          isAnimatingRef.current = false;
        },
      });
      return;
    }

    const timeline = gsap.timeline({
      onStart: () => {
        isAnimatingRef.current = true;
      },
      onComplete: () => {
        isAnimatingRef.current = false;
      },
    });

    timelineRef.current = timeline;

    timeline.to(overlayRef.current, {
      clipPath: openClipPath,
      duration: openDuration,
      ease: "power4.inOut",
    });

    // Stagger links and preview cards
    timeline.fromTo(
      linksRef.current,
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.05,
      },
      "-=0.55"
    );

    timeline.fromTo(
      previewCardsRef.current,
      { scale: 0.88, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.65,
        ease: "power3.out",
        stagger: 0.08,
      },
      "-=0.5"
    );
  }, [closedInitial, openClipPath, openDuration]);

  const onCloseMenu = useCallback(() => {
    timelineRef.current?.kill();
    const isReduced = reduceMotion();

    if (isReduced) {
      timelineRef.current = gsap.to(overlayRef.current, {
        autoAlpha: 0,
        duration: REDUCED_MOTION_FADE_DURATION,
        ease: "power2.out",
        onStart: () => {
          isAnimatingRef.current = true;
        },
        onComplete: () => {
          isAnimatingRef.current = false;
          gsap.set(overlayRef.current, { clipPath: closedFinal });
        },
      });
      return;
    }

    const timeline = gsap.timeline({
      onStart: () => {
        isAnimatingRef.current = true;
      },
      onComplete: () => {
        isAnimatingRef.current = false;
      },
    });

    timelineRef.current = timeline;

    timeline
      .to(contentWrapperRef.current, {
        opacity: 0.4,
        scale: 0.98,
        duration: 0.35,
        ease: "power2.in",
      })
      .to(
        overlayRef.current,
        {
          clipPath: closedFinal,
          duration: closeDuration,
          ease: "power4.inOut",
        },
        "-=0.2"
      );
  }, [closedFinal, closeDuration]);

  useEffect(() => {
    if (isOpen) {
      onOpenMenu();
    } else {
      onCloseMenu();
    }
  }, [isOpen, onOpenMenu, onCloseMenu]);

  return (
    <div ref={rootRef} aria-hidden={!isOpen} className="relative z-50">
      <nav
        ref={overlayRef}
        style={{ clipPath: closedInitial, backgroundColor: overlayBg }}
        className={`fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Site Navigation"
      >
        {/* Ambient Bloom */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute top-0 right-0 h-[38rem] w-[38rem] rounded-full bg-[#F5C518]/[0.035] blur-[160px]" />
          <div className="absolute bottom-0 left-0 h-[34rem] w-[34rem] rounded-full bg-[#F5C518]/[0.02] blur-[150px]" />
        </div>

        <div
          ref={contentWrapperRef}
          className="relative z-10 mx-auto flex min-h-screen w-full max-w-[96rem] 2xl:max-w-[104rem] flex-col justify-between px-5 py-8 sm:px-8 sm:py-10 lg:px-12 2xl:px-16"
        >
          {/* Top Bar inside overlay: Logo + Close button */}
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
            >
              <Logo />
            </Link>

            <div className="flex items-center gap-4">
              {onOpenInquiry && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInquiry();
                  }}
                  className="hidden sm:inline-flex min-h-10 items-center justify-center rounded-lg bg-[#F5C518] px-4 py-2 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-md hover:bg-[#ffd026] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
                >
                  Start a project
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="group flex h-11 items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-4 text-white transition-all hover:border-[#F5C518] hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
              >
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 group-hover:text-[#F5C518]">
                  CLOSE
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 group-hover:bg-[#F5C518] group-hover:text-black transition-colors">
                  <Icon name="close" className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>
          </div>

          {/* Main Content Area: Left Links + Right Previews */}
          <div className="my-8 grid grid-cols-1 gap-12 lg:my-12 lg:grid-cols-12 lg:gap-16 items-start">
            {/* Left Column: Studio Directory */}
            <div className="lg:col-span-7 flex flex-col space-y-4 sm:space-y-5">
              <div className="mb-2">
                <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-[#F5C518] block mb-1">
                  PUBLIC DIRECTORY
                </span>
                <p className="font-sans text-xs sm:text-sm text-zinc-400">
                  {tagline}
                </p>
              </div>

              {links.map((link, idx) => {
                const isCurrent = pathname === link.href;
                return (
                  <div
                    key={link.href}
                    ref={(el) => {
                      linksRef.current[idx] = el;
                    }}
                    className="border-b border-white/[0.06] pb-3"
                  >
                    <LinkAnim
                      label={link.label}
                      href={link.href}
                      indexBadge={link.badge}
                      subtitle={link.subtitle}
                      isCurrent={isCurrent}
                      onClick={onClose}
                      className="font-monument text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight text-white hover:text-[#F5C518]"
                    />
                  </div>
                );
              })}
            </div>

            {/* Right Column: Concept Previews + Quick Brief */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[#F5C518]">
                    FEATURED LAB PREVIEWS
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] font-semibold text-zinc-400 uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {previewCards.map((card, idx) => (
                    <Link
                      key={card.id}
                      href={card.href}
                      onClick={onClose}
                      ref={(el) => {
                        previewCardsRef.current[idx] = el;
                      }}
                      className="group relative block overflow-hidden rounded-xl border border-white/10 bg-black transition-all hover:border-[#F5C518]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <Image
                          src={card.image}
                          alt={card.title}
                          fill
                          sizes="200px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      </div>
                      <div className="p-3">
                        <span className="font-mono text-[0.5625rem] font-bold uppercase tracking-wider text-[#F5C518] block">
                          {card.category}
                        </span>
                        <span className="font-monument text-xs font-bold uppercase text-white block truncate group-hover:text-[#F5C518]">
                          {card.title}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-zinc-400">Direct studio line:</span>
                    <a
                      href="mailto:hello@thevirtuslabs.com"
                      className="font-mono font-bold text-[#F5C518] hover:underline"
                    >
                      hello@thevirtuslabs.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Direct Booking Card */}
              <div className="rounded-2xl border border-[#F5C518]/25 bg-[#F5C518]/[0.04] p-5 flex flex-col justify-between sm:flex-row sm:items-center gap-4">
                <div>
                  <span className="font-mono text-[0.625rem] font-bold uppercase tracking-wider text-[#F5C518] block">
                    Fast-Track Strategy
                  </span>
                  <p className="font-monument text-sm font-bold uppercase text-white mt-0.5">
                    Ready to launch your product?
                  </p>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    Book a 30-minute scope session directly with our pod directors.
                  </p>
                </div>
                <Link
                  href="/book"
                  onClick={onClose}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-4 py-2 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-md hover:bg-[#ffd026]"
                >
                  <span>Book Now</span>
                  <Icon name="arrow-right" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Footer Info Strip inside overlay */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-zinc-400 font-sans">
              <span className="font-mono font-bold text-white uppercase tracking-wider">
                {agencyName}
              </span>
              <span>·</span>
              <span>{location}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                OPEN FOR Q4/Q1 SPRINTS
              </span>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-zinc-400">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="hover:text-[#F5C518] transition-colors"
              >
                {SOCIAL_ICONS.github}
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:text-[#F5C518] transition-colors"
              >
                {SOCIAL_ICONS.linkedin}
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="hover:text-[#F5C518] transition-colors"
              >
                {SOCIAL_ICONS.twitter}
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-[#F5C518] transition-colors"
              >
                {SOCIAL_ICONS.instagram}
              </a>
              <a
                href="mailto:hello@thevirtuslabs.com"
                aria-label="Email Studio"
                className="hover:text-[#F5C518] transition-colors"
              >
                {SOCIAL_ICONS.mail}
              </a>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

// Re-export for standard library compatibility
export default ImmersiveFullscreenNav;
