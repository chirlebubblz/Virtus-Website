// Shared by the inquiry dialog (client) and /api/brief (server) so allowlists never drift.
// Pure data only: no pricing, no quotation engine.

export const SERVICES = [
  "Brand & Creative",
  "Web & Digital",
  "Content & Video",
  "AI & Automation",
] as const;
export type Service = (typeof SERVICES)[number];

export const STAGES = ["Starting fresh", "Improving what exists", "Fixing something broken"] as const;
export const TIMELINES = ["As soon as possible", "In 1–2 months", "Flexible"] as const;
export const CONTACTS = ["Email", "A call"] as const;

export const SERVICE_BLURBS: Record<Service, string> = {
  "Brand & Creative": "Identity, logo, guidelines and campaign creative.",
  "Web & Digital": "Sites, landing pages, stores and web apps.",
  "Content & Video": "Video, ads, social and launch content.",
  "AI & Automation": "Workflows, assistants and internal tools.",
};

export interface ServiceQuestion {
  label: string;
  options: readonly string[];
}

export const SERVICE_QUESTIONS: Record<Service, { scope: ServiceQuestion; extra: ServiceQuestion }> = {
  "Brand & Creative": {
    scope: {
      label: "What are we making?",
      options: ["Full brand identity", "Logo & visual refresh", "Brand guidelines", "Campaign or social creative"],
    },
    extra: {
      label: "Where will it show up?",
      options: ["Website & app", "Social media", "Packaging & print", "Everywhere"],
    },
  },
  "Web & Digital": {
    scope: {
      label: "What kind of site?",
      options: ["Landing page", "Business website", "E-commerce store", "Web app or portal"],
    },
    extra: {
      label: "What matters most?",
      options: ["More leads or bookings", "Sell products", "Look more credible", "Easier to update"],
    },
  },
  "Content & Video": {
    scope: {
      label: "What content?",
      options: ["Short-form video", "Ad creative", "Social content system", "Launch campaign"],
    },
    extra: {
      label: "How often?",
      options: ["One-off project", "Monthly ongoing", "Launch burst"],
    },
  },
  "AI & Automation": {
    scope: {
      label: "What should it automate?",
      options: ["Lead handling", "Content pipeline", "Internal tools", "Data & reporting"],
    },
    extra: {
      label: "Current setup?",
      options: ["Mostly manual", "Some tools already", "Existing system to connect"],
    },
  },
};

export const LIMITS = { name: 100, email: 254, company: 100, link: 300, message: 2000, phone: 30 } as const;

export interface InquiryPayload {
  name: string;
  email: string;
  service: Service;
  scope: string;
  extra: string;
  stage: (typeof STAGES)[number];
  timeline: (typeof TIMELINES)[number];
  contact: (typeof CONTACTS)[number];
  phone?: string;
  company?: string;
  link?: string;
  message?: string;
}

export type InquiryField = keyof InquiryPayload;

export const isService = (value: unknown): value is Service =>
  typeof value === "string" && (SERVICES as readonly string[]).includes(value);

// Allows +, spaces, dots, dashes and brackets; needs 7-15 digits (E.164 max).
export const isValidPhone = (value: string): boolean => {
  if (value.length > LIMITS.phone || !/^[+\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
};
