export interface Project {
  id: string;
  name: string;
  kind: string;
  liveUrl: string | null;
  pillar: string;
  statement: string;
  capabilities: string[];
  image: string;
  imageAlt: string;
  visualCredit: string;
}

export interface ServicePillar {
  id: string;
  slug: string;
  name: string;
  outcome: string;
  capabilities: string[];
  projectId: string;
}

export interface ProductFamily {
  id: string;
  name: string;
  desc: string;
}

export interface FAQItem {
  q: string;
  a: string;
}

export const siteData = {
  name: "The Virtus Labs",
  shortName: "TVL",
  tagline: "One Team. Limitless Possibilities.",
  seo: {
    description: "The Virtus Labs brings people, ideas and craft together to build what’s next.",
    socialDescription: "One Team. Limitless Possibilities.",
  },
  availability: "Accepting new projects",
  location: "Manila → Worldwide",
  nav: {
    links: [
      { label: "Work", href: "#work" },
      { label: "Services", href: "#services" },
      { label: "Products", href: "#products" },
      { label: "How we work", href: "#process" },
    ],
    action: { label: "Start a project" },
  },
  hero: {
    eyebrow: "Independent digital studio · Manila → Worldwide",
    displayLines: ["One Team.", "Limitless Possibilities."],
    headline: "Where brand, technology, and content move together.",
    body: "Brand, web, content and automation—planned, made and launched by one coordinated studio team.",
    primary: { label: "Start a project" },
    secondary: { label: "View lab projects", href: "#work" },
    disciplines: [
      "Brand & Creative",
      "Web & Digital",
      "Content & Video",
      "AI & Automation",
    ],
  },
  trust: {
    items: [
      {
        id: "01",
        title: "One coordinated team",
        desc: "Brand, web, content and automation stay inside one project workflow.",
      },
      {
        id: "02",
        title: "Built-in QA",
        desc: "Every deliverable is reviewed before it reaches you.",
      },
      {
        id: "03",
        title: "Remote-first",
        desc: "Structured to collaborate across US, UK, AU and CA time zones.",
      },
    ],
  },
  work: {
    title: "Lab projects",
    intro: "Selected concepts across brand, web, content and automation — built to show how we think, design and execute.",
    projects: [
      {
        id: "tidewater",
        name: "Tidewater Coffee",
        kind: "Lab Project",
        liveUrl: null,
        pillar: "Brand & Creative",
        statement: "A coastal coffee identity built to feel recognizable from shelf to social.",
        capabilities: ["Brand Strategy", "Visual Identity", "Packaging", "Social System"],
        image: "https://images.pexels.com/photos/29795384/pexels-photo-29795384.jpeg?auto=compress&cs=tinysrgb&w=1600",
        imageAlt: "Placeholder stock visual used to represent the Tidewater Coffee lab project.",
        visualCredit: "Concept visual · Pexels",
      },
      {
        id: "meridian",
        name: "Meridian Clinic",
        kind: "Lab Project",
        liveUrl: null,
        pillar: "Web & Digital",
        statement: "A calmer digital experience for finding care, understanding services and booking quickly.",
        capabilities: ["UX Strategy", "Information Architecture", "UI Design", "Responsive Web"],
        image: "https://images.pexels.com/photos/8015460/pexels-photo-8015460.jpeg?auto=compress&cs=tinysrgb&w=1600",
        imageAlt: "Placeholder stock visual of minimalist white product containers used to represent the Meridian Clinic lab project.",
        visualCredit: "Concept visual · Pexels",
      },
      {
        id: "harbor",
        name: "Harbor Freight Co-op",
        kind: "Lab Project",
        liveUrl: null,
        pillar: "AI & Automation",
        statement: "A quoting workflow designed to turn messy requests into structured estimates faster.",
        capabilities: ["Workflow Design", "AI Assistance", "Structured Data", "Internal Tool UX"],
        image: "https://images.pexels.com/photos/24244230/pexels-photo-24244230.jpeg?auto=compress&cs=tinysrgb&w=1600",
        imageAlt: "Placeholder stock visual of a logistics container terminal used to represent the Harbor Freight Co-op lab project.",
        visualCredit: "Concept visual · Pexels",
      },
      {
        id: "northstar",
        name: "Northstar Studio",
        kind: "Lab Project",
        liveUrl: null,
        pillar: "Content & Video",
        statement: "One launch story turned into a repeatable system for short-form, editorial and campaign content.",
        capabilities: ["Creative Direction", "Content System", "Video Editing", "Social Adaptation"],
        image: "https://images.pexels.com/photos/3753759/pexels-photo-3753759.jpeg?auto=compress&cs=tinysrgb&w=1600",
        imageAlt: "Placeholder stock visual of a modern creative editing workspace used to represent the Northstar Studio lab project.",
        visualCredit: "Concept visual · Pexels",
      },
      {
        id: "aster",
        name: "Aster Commerce",
        kind: "Lab Project",
        liveUrl: null,
        pillar: "Web & Digital",
        statement: "A launch-focused commerce experience built to keep product storytelling and conversion aligned.",
        capabilities: ["Campaign Strategy", "Web Design", "Commerce UX", "Creative Direction"],
        image: "https://images.pexels.com/photos/6483614/pexels-photo-6483614.jpeg?auto=compress&cs=tinysrgb&w=1600",
        imageAlt: "Placeholder stock visual of a clean laptop workspace used to represent the Aster Commerce lab project.",
        visualCredit: "Concept visual · Pexels",
      },
    ],
  },
  services: {
    title: "What we do",
    intro: "Four disciplines, one coordinated studio. Start with one, or bring them together when the project needs more.",
    closing: "Need more than one discipline? We build the team around the project, not the other way around.",
    pillars: [
      {
        id: "brand",
        slug: "brand",
        name: "Brand & Creative",
        outcome: "Build a brand people can recognize, remember and use consistently.",
        capabilities: [
          "Brand strategy",
          "Visual identity",
          "Logo systems",
          "Brand guidelines",
          "Campaign creative",
          "Social design",
          "Pitch decks",
          "Marketing assets",
        ],
        projectId: "tidewater",
      },
      {
        id: "web",
        slug: "web",
        name: "Web & Digital",
        outcome: "Turn attention into a digital experience that is clear, fast and built to convert.",
        capabilities: [
          "Landing pages",
          "Business websites",
          "Website redesign",
          "UX/UI",
          "Design systems",
          "Frontend development",
          "CMS integration",
          "E-commerce",
        ],
        projectId: "meridian",
      },
      {
        id: "content",
        slug: "content",
        name: "Content & Video",
        outcome: "Turn ideas, launches and campaigns into content systems that keep producing.",
        capabilities: [
          "Creative direction",
          "Short-form video",
          "Video editing",
          "Ad creative",
          "Social content",
          "Campaign assets",
          "Content systems",
          "Repurposing",
        ],
        projectId: "northstar",
      },
      {
        id: "ai",
        slug: "automation",
        name: "AI & Automation",
        outcome: "Remove repetitive work with AI-assisted systems designed around how your business actually operates.",
        capabilities: [
          "Workflow automation",
          "Internal tools",
          "AI assistants",
          "Lead workflows",
          "Content pipelines",
          "Data processing",
          "Knowledge systems",
          "System integrations",
        ],
        projectId: "harbor",
      },
    ],
  },
  products: {
    eyebrow: "Digital products",
    title: "Tools built to keep working after we leave.",
    intro: "Ready-made systems, templates and digital resources for teams that want to move faster without starting from zero.",
    note: "Products stand on their own. You do not need a service engagement to use them.",
    families: [
      {
        id: "workflow-tools",
        name: "Workflow Tools",
        desc: "Practical tools for repeatable operations, planning and execution.",
      },
      {
        id: "ai-systems",
        name: "AI Systems",
        desc: "Reusable AI-assisted systems built around focused business jobs.",
      },
      {
        id: "templates",
        name: "Templates",
        desc: "Structured starting points for teams that need consistency without a blank page.",
      },
      {
        id: "digital-resources",
        name: "Digital Resources",
        desc: "Focused references and practical assets designed to be used, not just read.",
      },
    ],
  },
  why: {
    title: "What guides us",
    intro: "A small studio with the standards of a great team.",
    points: [
      {
        name: "One Team",
        desc: "We win together. Every voice matters and every result is shared.",
      },
      {
        name: "Limitless",
        desc: "We push boundaries, experiment fearlessly and keep learning.",
      },
      {
        name: "Excellence",
        desc: "We hold ourselves to a high standard in everything we make.",
      },
    ],
  },
  process: {
    title: "How we work",
    intro: "Five stages. One clear owner at every step. You always know what is happening, what comes next and who is responsible.",
    steps: [
      {
        name: "Discover",
        desc: "Goals, audience, constraints, scope and success criteria are aligned before production begins.",
      },
      {
        name: "Design",
        desc: "Direction comes first, then the chosen route is developed with focused feedback.",
      },
      {
        name: "Build",
        desc: "Production stays visible through working previews and clear progress updates.",
      },
      {
        name: "Deliver",
        desc: "Final QA, handoff, walkthrough and agreed source files close the production phase.",
      },
      {
        name: "Support",
        desc: "A defined care period follows launch, with ongoing support available when the project needs it.",
      },
    ],
  },
  faq: {
    title: "Common questions",
    items: [
      {
        q: "How do payments work?",
        a: "The payment schedule and supported business payment channels are confirmed in the project proposal before kickoff.",
      },
      {
        q: "What is a typical timeline?",
        a: "Timeline depends on scope. We agree milestones before kickoff, keep progress visible and flag risks early.",
      },
      {
        q: "How do revisions work?",
        a: "Revision scope is agreed before the project starts so feedback stays focused and expectations stay clear.",
      },
      {
        q: "Who owns the files?",
        a: "Ownership, source-file handoff and any licensing terms are stated clearly in the project proposal before work begins.",
      },
      {
        q: "How do time zones work?",
        a: "Virtus is structured for async collaboration across US, UK, AU and CA business days, with written updates and agreed response expectations.",
      },
      {
        q: "How do you use AI in client work?",
        a: "AI is used where it improves speed or capability, but a person remains responsible for reviewing and refining what ships.",
      },
      {
        q: 'What does "Lab Project" mean?',
        a: "It is concept work created to demonstrate a capability, not paid client work. Lab Projects are labelled clearly and are replaced by real case studies as client work ships.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Start a project",
    line: "Have something worth building?",
    subline: "Let's make it move.",
    action: { label: "Start a project" },
  },
  footer: {
    built: "Manila → Worldwide",
    disclosure: "© 2026 The Virtus Labs. Lab Projects are clearly labelled.",
    email: "hello@thevirtuslabs.com",
    timezones: "Async across US, UK, AU and CA business days.",
  },
};
