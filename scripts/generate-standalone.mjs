import fs from "fs";

console.log("==> Building complete standalone Virtus Website HTML...");

// 1. Read CSS
const css1 = fs.readFileSync(".next/static/css/06a0bd80dd6d97cc.css", "utf8");
const css2 = fs.readFileSync(".next/static/css/579dd1e8bfbcd6d4.css", "utf8");
const globalsCss = fs.readFileSync("src/styles/globals.css", "utf8");

const customGlobals = globalsCss
  .replace(/@tailwind\s+[^;]+;/g, "")
  .replace(/@import\s+[^;]+;/g, "");

let combinedCss = `${css1}\n${css2}\n${customGlobals}`;

// Rewrite any relative urls in CSS to absolute Vercel URLs
combinedCss = combinedCss.replace(/url\(\s*['"]?\/([^'")]+)['"]?\s*\)/g, (match, p1) => {
  return `url('https://virtuswebsite.vercel.app/${p1}')`;
});

// 2. Read and extract S:0 from pages
function getS0(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const s0Match = html.match(/<div hidden id="S:0">([\s\S]*?)<\/div>(?:<!--\/\$-->)?<script/i);
  return s0Match ? s0Match[1] : "";
}

function extractMain(s0) {
  const mainMatch = s0.match(/<main id="main"[^>]*>([\s\S]*?)<\/main>/i);
  return mainMatch ? mainMatch[1] : "";
}

const indexS0 = getS0(".next/server/app/index.html");
const workWebS0 = getS0(".next/server/app/work/web.html");
const workBrandS0 = getS0(".next/server/app/work/brand.html");
const workContentS0 = getS0(".next/server/app/work/content.html");
const workAutomationS0 = getS0(".next/server/app/work/automation.html");
const bookS0 = getS0(".next/server/app/book.html");

const mainStart = indexS0.indexOf('<main id="main"');
const mainEnd = indexS0.indexOf("</main>") + 7;

const preMain = indexS0.substring(0, mainStart);
let indexMain = extractMain(indexS0);
const workWebMain = extractMain(workWebS0);
const workBrandMain = extractMain(workBrandS0);
const workContentMain = extractMain(workContentS0);
const workAutomationMain = extractMain(workAutomationS0);
const bookMain = extractMain(bookS0);
const postMain = indexS0.substring(mainEnd);

// 3. Populate Interactive Team Showcase in indexMain
const teamSkeletonRegex = /<div class="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start animate-pulse" aria-busy="true" aria-label="Loading Specialist Deck">[\s\S]*?<\/div><\/div><\/div><\/div>/;

const interactiveTeamHtml = `
<div class="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start" id="interactive-team-deck">
  <!-- Left Column: Pod Selection & Personnel Roster -->
  <div class="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
    <div class="rounded-2xl border border-[#262626] bg-[#0E0E0E] p-4 sm:p-5 shadow-lg">
      <div class="flex items-center justify-between mb-4 pb-3 border-b border-[#222222]">
        <div>
          <span class="font-mono text-[10px] uppercase tracking-widest text-[#FBD227] font-bold block">Studio Architecture</span>
          <span class="font-monument text-sm font-bold uppercase text-white">Active Pods</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" id="team-prev-pod-btn" class="h-8 w-8 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#2e2e2e] text-gray-300 hover:text-[#FBD227] flex items-center justify-center transition-colors" title="Previous Pod">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="m15 18-6-6 6-6"></path></svg>
          </button>
          <button type="button" id="team-next-pod-btn" class="h-8 w-8 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#2e2e2e] text-gray-300 hover:text-[#FBD227] flex items-center justify-center transition-colors" title="Next Pod">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="m9 18 6-6-6-6"></path></svg>
          </button>
        </div>
      </div>

      <!-- Pod Tabs -->
      <div class="space-y-2 mb-4" id="team-pod-tabs">
        <button type="button" data-pod-index="0" class="team-pod-tab active w-full text-left p-3 rounded-xl border border-[#FBD227]/40 bg-[#161616] transition-all flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="h-2 w-2 rounded-full bg-[#FBD227]"></span>
              <span class="font-monument text-xs font-bold uppercase text-white">Brand & Creative</span>
            </div>
            <p class="font-sans text-[11px] text-gray-400">Visual Identity, Design Tokens & Motion</p>
          </div>
          <span class="font-mono text-[10px] text-[#FBD227] font-bold px-2 py-0.5 rounded bg-[#FBD227]/10">01</span>
        </button>

        <button type="button" data-pod-index="1" class="team-pod-tab w-full text-left p-3 rounded-xl border border-[#262626] bg-[#121212] hover:border-gray-600 transition-all flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="h-2 w-2 rounded-full bg-[#60A5FA]"></span>
              <span class="font-monument text-xs font-bold uppercase text-white">Engineering & Systems</span>
            </div>
            <p class="font-sans text-[11px] text-gray-400">Edge Platforms, Next.js 15 & WebGL</p>
          </div>
          <span class="font-mono text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded bg-[#202020]">02</span>
        </button>

        <button type="button" data-pod-index="2" class="team-pod-tab w-full text-left p-3 rounded-xl border border-[#262626] bg-[#121212] hover:border-gray-600 transition-all flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="h-2 w-2 rounded-full bg-[#818CF8]"></span>
              <span class="font-monument text-xs font-bold uppercase text-white">AI & Automation</span>
            </div>
            <p class="font-sans text-[11px] text-gray-400">Autonomous CRM, LLMs & Operations</p>
          </div>
          <span class="font-mono text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded bg-[#202020]">03</span>
        </button>
      </div>

      <!-- Personnel in Pod -->
      <div class="pt-3 border-t border-[#222222]">
        <span class="font-mono text-[10px] uppercase text-gray-400 tracking-wider block mb-2">Specialist Roster</span>
        <div class="space-y-1.5" id="team-roster-list">
          <div class="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#222222]">
            <div class="flex items-center gap-2.5">
              <span class="h-7 w-7 rounded-md bg-[#222222] text-[#FBD227] font-monument text-xs flex items-center justify-center font-bold">K</span>
              <div>
                <span class="font-sans text-xs font-bold text-white block">Kai</span>
                <span class="font-sans text-[10px] text-gray-400 block">Brand & Creative Lead</span>
              </div>
            </div>
            <span class="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#FBD227]/10 text-[#FBD227] border border-[#FBD227]/30">Active</span>
          </div>
          <div class="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#222222]">
            <div class="flex items-center gap-2.5">
              <span class="h-7 w-7 rounded-md bg-[#222222] text-[#60A5FA] font-monument text-xs flex items-center justify-center font-bold">R</span>
              <div>
                <span class="font-sans text-xs font-bold text-white block">Ren</span>
                <span class="font-sans text-[10px] text-gray-400 block">Full-Stack Lead Engineer</span>
              </div>
            </div>
            <span class="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#60A5FA]/10 text-[#60A5FA] border border-[#60A5FA]/30">Sprint</span>
          </div>
          <div class="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#222222]">
            <div class="flex items-center gap-2.5">
              <span class="h-7 w-7 rounded-md bg-[#222222] text-[#818CF8] font-monument text-xs flex items-center justify-center font-bold">S</span>
              <div>
                <span class="font-sans text-xs font-bold text-white block">Sora</span>
                <span class="font-sans text-[10px] text-gray-400 block">Lead UX & Systems</span>
              </div>
            </div>
            <span class="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#818CF8]/10 text-[#818CF8] border border-[#818CF8]/30">Optimal</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Column: Interactive Featured Specialist Showcase Card -->
  <div class="w-full flex-1 min-w-0" id="team-showcase-panel">
    <article class="relative flex flex-col justify-between rounded-2xl border border-[#2a2a2a] bg-[#0E0E0E] p-5 sm:p-7 transition-all shadow-2xl overflow-hidden group">
      <div id="team-accent-strip" class="absolute top-0 left-0 right-0 h-1.5 bg-[#FBD227] transition-all"></div>

      <!-- Card Top: Avatar & Titles -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-center gap-3.5 min-w-0">
          <div id="team-card-avatar" class="flex shrink-0 items-center justify-center rounded-xl font-monument font-bold text-black border border-[#FBD227] bg-[#FBD227] h-14 w-14 text-xl shadow-lg">
            K
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              <span id="team-card-pod-tag" class="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#202020] text-gray-300 border border-[#333333]">
                Brand & Creative Pod
              </span>
              <span class="inline-flex items-center gap-1 rounded bg-[#FBD227]/20 border border-[#FBD227]/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#FBD227]">
                <svg viewBox="0 0 24 24" fill="currentColor" class="h-2.5 w-2.5"><path d="m13 2-2 10h5l-6 10 2-10H7l6-10z"></path></svg>
                <span>Lead Specialist</span>
              </span>
            </div>
            <h3 id="team-card-name" class="font-monument text-xl sm:text-2xl font-bold uppercase text-white truncate">
              Kai
            </h3>
            <p id="team-card-role" class="font-sans text-xs text-gray-400 font-medium">
              Brand & Creative Lead · Art Direction & Visual Identity
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" id="team-card-prev" class="h-9 w-9 rounded-lg bg-[#1A1A1A] hover:bg-[#282828] border border-[#333333] text-gray-300 hover:text-[#FBD227] flex items-center justify-center transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="m15 18-6-6 6-6"></path></svg>
          </button>
          <button type="button" id="team-card-next" class="h-9 w-9 rounded-lg bg-[#1A1A1A] hover:bg-[#282828] border border-[#333333] text-gray-300 hover:text-[#FBD227] flex items-center justify-center transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="m9 18 6-6-6-6"></path></svg>
          </button>
        </div>
      </div>

      <p id="team-card-bio" class="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
        Directs visual identity architecture, tokenized design systems, and cinematic digital brand campaigns across all studio client engagements.
      </p>

      <!-- Skills Tags -->
      <div class="flex flex-wrap gap-2 mb-6" id="team-card-skills">
        <span class="font-mono text-[10px] px-2.5 py-1 rounded bg-[#181818] border border-[#2b2b2b] text-gray-300">Design Systems</span>
        <span class="font-mono text-[10px] px-2.5 py-1 rounded bg-[#181818] border border-[#2b2b2b] text-gray-300">Brand Identity</span>
        <span class="font-mono text-[10px] px-2.5 py-1 rounded bg-[#181818] border border-[#2b2b2b] text-gray-300">Typography</span>
        <span class="font-mono text-[10px] px-2.5 py-1 rounded bg-[#181818] border border-[#2b2b2b] text-gray-300">Design Tokens</span>
        <span class="font-mono text-[10px] px-2.5 py-1 rounded bg-[#181818] border border-[#2b2b2b] text-gray-300">Creative Direction</span>
      </div>

      <!-- Architectural Vector Blueprint Showcase HUD -->
      <div class="relative rounded-xl border border-[#262626] bg-[#0A0A0A] p-4 sm:p-5 overflow-hidden">
        <div class="flex items-center justify-between border-b border-[#222222] pb-2 text-[10px] font-mono text-gray-400">
          <span class="flex items-center gap-1.5">
            <span id="team-blueprint-dot" class="h-1.5 w-1.5 rounded-full bg-[#FBD227]"></span>
            <span id="team-blueprint-domain">SYS://tidewater.coffee</span>
          </span>
          <span class="text-gray-500 uppercase tracking-widest text-[9px]">VIEWPORT 1440x900</span>
        </div>

        <div class="my-5 flex items-center justify-center py-2" id="team-blueprint-svg">
          <svg class="w-full text-gray-400 h-24" viewBox="0 0 320 80" fill="none">
            <line x1="20" y1="40" x2="300" y2="40" stroke="#2a2a2a" stroke-dasharray="4 4" />
            <polygon points="160,10 200,65 120,65" stroke="#FBD227" stroke-width="1.5" fill="none" opacity="0.8" />
            <circle cx="160" cy="40" r="28" stroke="#444444" stroke-width="1" stroke-dasharray="2 3" />
            <circle cx="160" cy="40" r="3" fill="#FBD227" />
            <line x1="80" y1="20" x2="80" y2="60" stroke="#2a2a2a" />
            <line x1="240" y1="20" x2="240" y2="60" stroke="#2a2a2a" />
            <rect x="30" y="25" width="30" height="30" stroke="#2a2a2a" />
            <rect x="260" y="25" width="30" height="30" stroke="#2a2a2a" />
          </svg>
        </div>

        <div class="flex items-center justify-between border-t border-[#222222] pt-2 text-[9px] font-mono text-gray-500">
          <span>ARCHITECTURAL SPEC // PROD BUILD</span>
          <span id="team-blueprint-tag" class="text-[#FBD227] font-bold uppercase tracking-wider">PRIMARY PRODUCTION BUILD</span>
        </div>
      </div>
    </article>
  </div>
</div>
`;

indexMain = indexMain.replace(teamSkeletonRegex, interactiveTeamHtml);

// 4. Clean Next.js specific script tags and comments
function cleanNextJsArtifacts(html) {
  return html
    .replace(/<script\b[^>]*\bsrc=["'][^"']*\/_next\/[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script\b[^>]*\bid=["']_R_["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*>self\.__next_f[\s\S]*?<\/script>/gi, "")
    .replace(/<!--\$-->/g, "")
    .replace(/<!--\/\$-->/g, "")
    .replace(/<!--\$\?-->/g, "")
    .replace(/<!--\/\$\?-->/g, "");
}

// 5. Rewrite Image URLs (decode Next.js image proxy URLs to raw image URLs)
function rewriteImages(html) {
  // Decode /_next/image?url=...
  html = html.replace(/(\b(?:src|srcSet|poster)=["'])\/_next\/image\?url=([^&"']+)[^"']*["']/gi, (match, prefix, encUrl) => {
    try {
      const decoded = decodeURIComponent(encUrl);
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        return `${prefix}${decoded}"`;
      }
      return `${prefix}https://virtuswebsite.vercel.app${decoded.startsWith("/") ? "" : "/"}${decoded}"`;
    } catch {
      return match;
    }
  });

  // Rewrite any remaining src="/..." (except /#...)
  html = html.replace(/(\b(?:src|poster)=["'])\/(?!\/)([^"']+)["']/gi, (match, prefix, p1) => {
    return `${prefix}https://virtuswebsite.vercel.app/${p1}"`;
  });

  return html;
}

// 6. Build the Combined Multi-Page HTML
const cleanPreMain = rewriteImages(cleanNextJsArtifacts(preMain));
const cleanIndexMain = rewriteImages(cleanNextJsArtifacts(indexMain));
const cleanWorkWebMain = rewriteImages(cleanNextJsArtifacts(workWebMain));
const cleanWorkBrandMain = rewriteImages(cleanNextJsArtifacts(workBrandMain));
const cleanWorkContentMain = rewriteImages(cleanNextJsArtifacts(workContentMain));
const cleanWorkAutomationMain = rewriteImages(cleanNextJsArtifacts(workAutomationMain));
const cleanBookMain = rewriteImages(cleanNextJsArtifacts(bookMain));
const cleanPostMain = rewriteImages(cleanNextJsArtifacts(postMain));

// 7. Interactive Vanilla JS Controller
const controllerScript = `
<script>
(function() {
  // --- 1. SPA Router ---
  const routes = {
    '/': document.querySelector('[data-page-route="/"]'),
    '/work/web': document.querySelector('[data-page-route="/work/web"]'),
    '/work/brand': document.querySelector('[data-page-route="/work/brand"]'),
    '/work/automation': document.querySelector('[data-page-route="/work/automation"]'),
    '/work/content': document.querySelector('[data-page-route="/work/content"]'),
    '/book': document.querySelector('[data-page-route="/book"]'),
  };

  function setRoute(path, hash) {
    let cleanPath = path || '/';
    if (!routes[cleanPath]) cleanPath = '/';

    Object.keys(routes).forEach(p => {
      const el = routes[p];
      if (el) {
        if (p === cleanPath) {
          el.style.display = 'block';
          el.classList.add('active');
        } else {
          el.style.display = 'none';
          el.classList.remove('active');
        }
      }
    });

    if (hash) {
      setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Intercept all link clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    // External link
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      return;
    }

    // Hash anchor link on current page (e.g., #services, #process, #team)
    if (href.startsWith('#')) {
      e.preventDefault();
      closeNav();
      setRoute('/', href);
      history.pushState(null, '', href);
      return;
    }

    // Relative link with hash (e.g. /#team or /#process)
    if (href.startsWith('/#')) {
      e.preventDefault();
      closeNav();
      const hash = href.replace('/', '');
      setRoute('/', hash);
      history.pushState(null, '', hash);
      return;
    }

    // Known SPA route (e.g. /work/web, /book)
    const [pathPart, hashPart] = href.split('#');
    if (routes[pathPart]) {
      e.preventDefault();
      closeNav();
      setRoute(pathPart, hashPart ? '#' + hashPart : null);
      history.pushState(null, '', href);
      return;
    }
  });

  window.addEventListener('popstate', function() {
    setRoute(window.location.pathname, window.location.hash);
  });

  // Check initial hash
  if (window.location.hash) {
    setRoute('/', window.location.hash);
  }

  // --- 2. Immersive Fullscreen Navigation ---
  const navDialog = document.querySelector('[role="dialog"][aria-label="Site Navigation"]');
  const menuBtn = document.querySelector('button[aria-label="Open immersive full screen navigation menu"]') || document.querySelector('button[aria-haspopup="dialog"] span.font-mono');
  const actualMenuBtn = menuBtn ? menuBtn.closest('button') : null;

  function openNav() {
    if (!navDialog) return;
    navDialog.classList.add('is-open');
    navDialog.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
    navDialog.style.pointerEvents = 'auto';
    navDialog.style.opacity = '1';
    if (actualMenuBtn) actualMenuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    if (!navDialog) return;
    navDialog.classList.remove('is-open');
    navDialog.style.clipPath = 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)';
    navDialog.style.pointerEvents = 'none';
    navDialog.style.opacity = '0';
    if (actualMenuBtn) actualMenuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (actualMenuBtn) {
    actualMenuBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openNav();
    });
  }

  // Close nav on close button or escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeNav();
  });

  if (navDialog) {
    const closeBtns = navDialog.querySelectorAll('button');
    closeBtns.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('close') || btn.getAttribute('aria-label')?.includes('close')) {
        btn.addEventListener('click', closeNav);
      }
    });
  }

  // --- 3. Inquiry & Lead Modal Dialogs ---
  const inquiryDialog = document.querySelectorAll('dialog.inquiry-dialog');

  function openInquiryModal() {
    const dlg = inquiryDialog[0];
    if (dlg) {
      closeNav();
      if (typeof dlg.showModal === 'function') {
        try { dlg.showModal(); } catch (err) { dlg.setAttribute('open', ''); }
      } else {
        dlg.setAttribute('open', '');
      }
      dlg.style.display = 'flex';
      dlg.style.alignItems = 'center';
      dlg.style.justifyContent = 'center';
    }
  }

  function closeInquiryModal(dlg) {
    if (!dlg) return;
    if (typeof dlg.close === 'function') {
      try { dlg.close(); } catch (err) { dlg.removeAttribute('open'); }
    } else {
      dlg.removeAttribute('open');
    }
    dlg.style.display = 'none';
  }

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const txt = btn.textContent.trim().toLowerCase();

    // Trigger modal
    if (txt.includes('start a project') || txt.includes('book a call') || txt.includes('initiate stage') || txt.includes('brief') || txt.includes('assemble a studio pod')) {
      if (btn.getAttribute('type') === 'submit') return; // form submits handled separately
      e.preventDefault();
      openInquiryModal();
      return;
    }

    // Close button
    if (btn.getAttribute('title')?.includes('Close') || btn.getAttribute('aria-label')?.includes('Close')) {
      const parentDlg = btn.closest('dialog');
      if (parentDlg) {
        e.preventDefault();
        closeInquiryModal(parentDlg);
      }
    }
  });

  // Handle modal submit simulation
  document.querySelectorAll('dialog form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Transmitting...';
      }
      setTimeout(() => {
        alert('Thank you! Your project brief has been received. A studio director will be in touch within 24 hours.');
        const parentDlg = form.closest('dialog');
        if (parentDlg) closeInquiryModal(parentDlg);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Brief';
        }
      }, 700);
    });
  });

  // --- 4. Interactive Process Section (#process) ---
  const processStages = [
    { num: '01', name: 'Discover', timeframe: 'Week 01', owner: 'Strategy Director', deliverable: 'Scope & Arch Spec', summary: 'Align business KPIs, audit tech requirements, and lock fixed sprint milestones upfront.' },
    { num: '02', name: 'Design', timeframe: 'Weeks 02–03', owner: 'Design Director', deliverable: 'Clickable Prototype', summary: 'Two curated visual directions, tokenized systems, and interactive Figma prototypes.' },
    { num: '03', name: 'Build', timeframe: 'Weeks 03–05', owner: 'Systems Engineer', deliverable: 'Production Codebase', summary: 'Type-safe Next.js & React 19 engineering with weekly live staging previews.' },
    { num: '04', name: 'Deliver', timeframe: 'Week 06', owner: 'Launch Lead', deliverable: '100% IP Transfer', summary: '95+ Lighthouse audits, zero-downtime cutover, and complete repository transfer.' },
    { num: '05', name: 'Support', timeframe: 'Ongoing', owner: 'Dedicated Tech Lead', deliverable: 'SLA & 24/7 Care', summary: '30-day launch warranty, 24/7 telemetry monitoring, and flexible evolution sprints.' }
  ];

  const processSection = document.getElementById('process');
  if (processSection) {
    const stageCards = processSection.querySelectorAll('.grid > div');
    const ctaBtn = processSection.querySelector('button span');

    stageCards.forEach((card, idx) => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function() {
        stageCards.forEach(c => {
          c.classList.remove('border-[#F5C518]', 'bg-[#0E0E12]');
          c.classList.add('border-white/10', 'bg-[#09090B]');
        });
        card.classList.remove('border-white/10', 'bg-[#09090B]');
        card.classList.add('border-[#F5C518]', 'bg-[#0E0E12]');

        const stage = processStages[idx] || processStages[0];
        if (ctaBtn) {
          ctaBtn.textContent = 'Initiate Stage ' + stage.num + ' (' + stage.name + ')';
        }
      });
    });
  }

  // --- 5. Interactive Team Showcase (#team) ---
  const teamData = [
    {
      pod: "Brand & Creative Pod",
      color: "#FBD227",
      name: "Kai",
      role: "Brand & Creative Lead · Art Direction & Visual Identity",
      bio: "Directs visual identity architecture, tokenized design systems, and cinematic digital brand campaigns across all studio client engagements.",
      skills: ["Design Systems", "Brand Identity", "Typography", "Design Tokens", "Creative Direction"],
      domain: "SYS://tidewater.coffee",
      tag: "BRAND SYSTEM & IDENTITY",
      svgType: "design"
    },
    {
      pod: "Engineering & Systems Pod",
      color: "#60A5FA",
      name: "Ren",
      role: "Principal Systems Engineer · Next.js & WebGL Architecture",
      bio: "Specializes in high-throughput React 19 platforms, edge rendering architectures, WebGL interactions, and zero-downtime headless cutovers.",
      skills: ["Next.js 15", "WebGL & 3D", "TypeScript", "Tailwind CSS", "Neon PostgreSQL"],
      domain: "SYS://apex.virtus.io",
      tag: "FULL-STACK PLATFORM BUILD",
      svgType: "webgl"
    },
    {
      pod: "AI & Automation Pod",
      color: "#818CF8",
      name: "Sora",
      role: "AI & Automation Lead · CRM Workflows & LLM Systems",
      bio: "Engineers autonomous agent pipelines, intelligent webhook workflows, CRM integrations, and predictive data transformations.",
      skills: ["AI Pipelines", "Workflow Automation", "CRM Architecture", "Python & Node", "Vector Databases"],
      domain: "SYS://ops.virtus.io",
      tag: "AUTONOMOUS OPS PIPELINE",
      svgType: "automation"
    }
  ];

  let currentPodIdx = 0;

  function updateTeamCard(idx) {
    currentPodIdx = ((idx % teamData.length) + teamData.length) % teamData.length;
    const member = teamData[currentPodIdx];

    const strip = document.getElementById('team-accent-strip');
    const avatar = document.getElementById('team-card-avatar');
    const podTag = document.getElementById('team-card-pod-tag');
    const name = document.getElementById('team-card-name');
    const role = document.getElementById('team-card-role');
    const bio = document.getElementById('team-card-bio');
    const skills = document.getElementById('team-card-skills');
    const dot = document.getElementById('team-blueprint-dot');
    const domain = document.getElementById('team-blueprint-domain');
    const tag = document.getElementById('team-blueprint-tag');

    if (strip) strip.style.backgroundColor = member.color;
    if (avatar) {
      avatar.textContent = member.name.charAt(0);
      avatar.style.backgroundColor = member.color;
      avatar.style.borderColor = member.color;
    }
    if (podTag) podTag.textContent = member.pod;
    if (name) name.textContent = member.name;
    if (role) role.textContent = member.role;
    if (bio) bio.textContent = member.bio;
    if (dot) dot.style.backgroundColor = member.color;
    if (domain) domain.textContent = member.domain;
    if (tag) {
      tag.textContent = member.tag;
      tag.style.color = member.color;
    }
    if (skills) {
      skills.innerHTML = member.skills.map(s => 
        '<span class="font-mono text-[10px] px-2.5 py-1 rounded bg-[#181818] border border-[#2b2b2b] text-gray-300">' + s + '</span>'
      ).join('');
    }

    document.querySelectorAll('.team-pod-tab').forEach((tab, i) => {
      if (i === currentPodIdx) {
        tab.classList.add('active', 'border-[#FBD227]/40', 'bg-[#161616]');
        tab.classList.remove('border-[#262626]', 'bg-[#121212]');
      } else {
        tab.classList.remove('active', 'border-[#FBD227]/40', 'bg-[#161616]');
        tab.classList.add('border-[#262626]', 'bg-[#121212]');
      }
    });
  }

  document.querySelectorAll('.team-pod-tab').forEach((tab, i) => {
    tab.addEventListener('click', () => updateTeamCard(i));
  });

  const prevPodBtn = document.getElementById('team-prev-pod-btn');
  const nextPodBtn = document.getElementById('team-next-pod-btn');
  const prevCardBtn = document.getElementById('team-card-prev');
  const nextCardBtn = document.getElementById('team-card-next');

  if (prevPodBtn) prevPodBtn.addEventListener('click', () => updateTeamCard(currentPodIdx - 1));
  if (nextPodBtn) nextPodBtn.addEventListener('click', () => updateTeamCard(currentPodIdx + 1));
  if (prevCardBtn) prevCardBtn.addEventListener('click', () => updateTeamCard(currentPodIdx - 1));
  if (nextCardBtn) nextCardBtn.addEventListener('click', () => updateTeamCard(currentPodIdx + 1));

  // --- 6. FAQ Accordion ---
  const faqSection = document.getElementById('faq');
  if (faqSection) {
    faqSection.querySelectorAll('button[aria-controls]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = btn.getAttribute('aria-controls');
        const panel = document.getElementById(id);
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';

        btn.setAttribute('aria-expanded', !isExpanded);
        if (panel) {
          panel.style.display = isExpanded ? 'none' : 'block';
          panel.hidden = isExpanded;
        }

        const icon = btn.querySelector('svg');
        if (icon) {
          icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      });
    });
  }

  // --- 7. Work Showcase Interactive Gallery ---
  const workSection = document.getElementById('work');
  if (workSection) {
    const thumbs = workSection.querySelectorAll('button[aria-pressed]');
    thumbs.forEach(btn => {
      btn.addEventListener('click', function() {
        thumbs.forEach(t => {
          t.setAttribute('aria-pressed', 'false');
          t.classList.remove('ring-2', 'ring-[#F5C518]');
        });
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('ring-2', 'ring-[#F5C518]');
      });
    });
  }

  console.log("Virtus Standalone Controller Initialized successfully.");
})();
</script>
`;

// 8. Custom CSS enhancements for standalone experience
const standaloneExtraCss = `
<style>
/* Standalone Single-File Enhancements */
:root {
  --font-display: 'League Gothic', 'Impact', sans-serif;
  --font-monument: 'Unbounded', sans-serif;
  --font-accent: 'Lexend Exa', sans-serif;
  --font-wordmark: 'Syncopate', sans-serif;
  --font-sans: 'Montserrat', 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;
}

[role="dialog"][aria-label="Site Navigation"] {
  transition: clip-path 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
[role="dialog"][aria-label="Site Navigation"].is-open {
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%) !important;
  pointer-events: auto !important;
  opacity: 1 !important;
}

dialog.inquiry-dialog {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1rem;
  background: #0C0C0E;
  color: #FFFFFF;
  padding: 0;
  max-width: 38rem;
  width: 90%;
}
dialog.inquiry-dialog::backdrop {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

.virtus-page-route {
  transition: opacity 0.25s ease-in-out;
}
</style>
`;

// 9. Assemble Complete Single HTML Document
const standaloneHtml = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#000000" />
  <meta name="color-scheme" content="dark" />
  <title>The Virtus Labs — Standalone Experiment Edition</title>
  <meta name="description" content="The Virtus Labs brings people, ideas and craft together under one roof - brand, web, content and automation delivered as one coordinated studio team." />

  <!-- Google Fonts: League Gothic, Unbounded, Montserrat, Plus Jakarta Sans, IBM Plex Mono, Lexend Exa, Syncopate -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Lexend+Exa:wght@300;400;600&family=Montserrat:ital,wght@0,300..900;1,300..900&family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&family=Syncopate:wght@700&family=Unbounded:wght@600;700;800;900&family=League+Gothic&display=swap" rel="stylesheet">

  <!-- Inlined Stylesheets -->
  <style>
${combinedCss}
  </style>
  ${standaloneExtraCss}
</head>
<body class="bg-black text-white min-h-screen antialiased selection:bg-[#FBD227]/30 selection:text-white">
  ${cleanPreMain}

  <main id="main">
    <div class="virtus-page-route active" data-page-route="/" style="display: block;">
      ${cleanIndexMain}
    </div>
    <div class="virtus-page-route" data-page-route="/work/web" style="display: none;">
      ${cleanWorkWebMain}
    </div>
    <div class="virtus-page-route" data-page-route="/work/brand" style="display: none;">
      ${cleanWorkBrandMain}
    </div>
    <div class="virtus-page-route" data-page-route="/work/automation" style="display: none;">
      ${cleanWorkAutomationMain}
    </div>
    <div class="virtus-page-route" data-page-route="/work/content" style="display: none;">
      ${cleanWorkContentMain}
    </div>
    <div class="virtus-page-route" data-page-route="/book" style="display: none;">
      ${cleanBookMain}
    </div>
  </main>

  ${cleanPostMain}

  ${controllerScript}
</body>
</html>
`;

fs.writeFileSync("virtus-standalone.html", standaloneHtml, "utf8");
console.log("==> Successfully generated virtus-standalone.html!");
const stat = fs.statSync("virtus-standalone.html");
console.log("File size:", Math.round(stat.size / 1024), "KB (" + stat.size + " bytes)");
