import type { Service } from "./inquiryOptions";

export const LEGAL_CAMPAIGN_SLUGS = [
  "intake-and-conflicts",
  "document-assembly",
  "client-portal",
  "billing-automation",
] as const;

export type LegalCampaignSlug = (typeof LEGAL_CAMPAIGN_SLUGS)[number];

export type LegalModuleIcon =
  | "calendar-check"
  | "file-text"
  | "folder-lock"
  | "receipt"
  | "list-checks"
  | "mail"
  | "trending-up"
  | "brain-circuit";

export interface LegalModule {
  id: string;
  index: string;
  title: string;
  tagline: string;
  summary: string;
  icon: LegalModuleIcon;
  campaignSlug?: LegalCampaignSlug;
  inquiryService: Service;
  outcomes: readonly string[];
  capabilities: readonly string[];
  integrations: readonly string[];
}

export interface LegalBeforeAfterRow {
  area: string;
  before: string;
  after: string;
}

export interface LegalWorkflowStep {
  step: string;
  title: string;
  detail: string;
}

export interface LegalDeliverable {
  title: string;
  detail: string;
}

export interface LegalOutcomeStat {
  metric: string;
  label: string;
  detail: string;
}

export interface LegalFaqItem {
  q: string;
  a: string;
}

export interface LegalCampaignPage {
  slug: LegalCampaignSlug;
  eyebrow: string;
  moduleTitle: string;
  heroHeadline: string;
  heroAccent: string;
  heroSubhead: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  inquiryService: Extract<Service, "AI & Automation" | "Web & Digital">;
  outcomesStrip: readonly LegalOutcomeStat[];
  beforeAfter: readonly LegalBeforeAfterRow[];
  workflow: readonly LegalWorkflowStep[];
  deliverables: readonly LegalDeliverable[];
  confidentialityNotes: readonly string[];
  stackCompatibility: readonly string[];
  seo: {
    title: string;
    description: string;
  };
}

export const LEGAL_MODULES: readonly LegalModule[] = [
  {
    id: "intake-and-conflicts",
    index: "01",
    title: "Intake & Conflict Checks",
    tagline: "Screen prospective clients, check for conflicts, and book consultations without phone tag.",
    summary:
      "Replace back-and-forth intake calls with a clear online questionnaire that gathers practice area, matter summary, and opposing party names upfront, runs a conflict check against existing matters, and books consultations onto the right attorney's calendar.",
    icon: "calendar-check",
    campaignSlug: "intake-and-conflicts",
    inquiryService: "AI & Automation",
    outcomes: [
      "Keep out-of-scope or unviable inquiries off attorney calendars",
      "Run conflict checks on adverse and related parties before the consultation",
      "Send instant calendar invites, video links, and reminders to reduce no-shows",
    ],
    capabilities: [
      "Practice-area intake questions tailored to your firm",
      "Automated conflict-check lookup against existing contacts and matters",
      "Attorney calendar routing by practice area, office, or availability",
      "Optional consultation fee payment via LawPay or Stripe before booking",
    ],
    integrations: ["Clio", "MyCase", "Outlook / Microsoft 365", "Google Workspace", "LawPay / Stripe"],
  },
  {
    id: "document-assembly",
    index: "02",
    title: "Document Assembly & E-Sign",
    tagline: "Generate engagement letters, retainers, and standard filings straight from intake data.",
    summary:
      "Turn approved intake and matter details into accurate engagement letters, fee agreements, and standard client packets in seconds—then route them for e-signature and retainer payment without manual copy-and-paste.",
    icon: "file-text",
    campaignSlug: "document-assembly",
    inquiryService: "AI & Automation",
    outcomes: [
      "Send engagement letters within minutes of a consultation instead of days later",
      "Eliminate copy-paste typos in client names, matter numbers, and fee terms",
      "Track unsigned retainers with polite automatic follow-up reminders",
    ],
    capabilities: [
      "Firm-approved templates for engagement letters, retainers, and intake forms",
      "Automatic field population from Clio, MyCase, or intake submissions",
      "Integrated e-signature routing with DocuSign, PandaDoc, or Adobe Sign",
      "Automatic matter opening and folder creation once the retainer is signed",
    ],
    integrations: ["DocuSign", "Clio Manage", "MyCase", "Microsoft Word / 365", "LawPay"],
  },
  {
    id: "client-portal",
    index: "03",
    title: "Client Matter Portal",
    tagline: "One secure place for clients to check matter progress, upload files, and pay invoices.",
    summary:
      "Give clients a simple, branded portal on your firm's website where they can see plain-English matter milestones, upload requested discovery docs or IDs through a clear checklist, and message your team without digging through email threads.",
    icon: "folder-lock",
    campaignSlug: "client-portal",
    inquiryService: "Web & Digital",
    outcomes: [
      "Cut routine 'any update on my case?' calls and emails significantly",
      "Collect complete, legible client documents without chasing attachments",
      "Give clients an organized, reassuring experience from intake to closing",
    ],
    capabilities: [
      "Passwordless sign-in on your firm's own domain (portal.yourfirm.com)",
      "Clear matter progress milestones written in plain language for clients",
      "Guided document upload checklists with automatic reminders for missing files",
      "Direct access to signed engagement letters, invoices, and consultation links",
    ],
    integrations: ["Clio", "MyCase", "SharePoint / OneDrive", "Google Workspace", "LawPay / Stripe"],
  },
  {
    id: "billing-automation",
    index: "04",
    title: "Time & Billing Automation",
    tagline: "Clean pre-bills, trust-account threshold alerts, and steady invoice follow-ups.",
    summary:
      "Help attorneys and paralegals capture billable time accurately, prepare pre-bills for partner review, alert clients when trust-account thresholds run low, and send polite invoice reminders so receivables do not sit uncollected.",
    icon: "receipt",
    campaignSlug: "billing-automation",
    inquiryService: "AI & Automation",
    outcomes: [
      "Reduce unbilled time leakage across attorney and paralegal calendars and emails",
      "Keep evergreen retainers funded with automatic low-trust-balance notices",
      "Shorten payment cycles with consistent, polite invoice follow-ups",
    ],
    capabilities: [
      "Automated time-entry prompts from calendar events, calls, and matter emails",
      "Scheduled pre-bill preparation and partner approval summaries",
      "Trust-account threshold monitoring and evergreen retainer replenishment links",
      "Automated aging-invoice reminders connected to LawPay, Clio, or QuickBooks",
    ],
    integrations: ["Clio Manage", "LawPay", "QuickBooks Online", "Xero", "MyCase"],
  },
  {
    id: "matter-deadlines",
    index: "05",
    title: "Matter & Deadline Tracking",
    tagline: "Court dates, filing checklists, and paralegal handoffs tracked automatically.",
    summary:
      "Turn statutory deadlines, court rules, and closing checklists into active task sequences. When a key date is entered, dependent tasks and reminders assign automatically to the responsible attorney and paralegal.",
    icon: "list-checks",
    inquiryService: "AI & Automation",
    outcomes: [
      "Keep every matter moving with clear ownership between partners and paralegals",
      "Surface upcoming 14-day, 7-day, and 48-hour deadlines before they become urgent",
      "Cut down on internal status-check meetings across active caseloads",
    ],
    capabilities: [
      "Reusable matter checklists by practice area (litigation, corporate, family, real estate)",
      "Automatic deadline calculation and calendar syncing from trigger dates",
      "Role-based handoffs between attorneys, paralegals, and legal assistants",
      "Daily summary of due-today, overdue, and awaiting-client items",
    ],
    integrations: ["Clio", "MyCase", "Microsoft Planner / Teams", "Asana", "Google Calendar"],
  },
  {
    id: "email-matter-filing",
    index: "06",
    title: "Email & Matter Filing",
    tagline: "Sort court notices, opposing counsel mail, and client threads into the right matter.",
    summary:
      "Organize busy Outlook and Gmail inboxes by urgency and matter. Court notices and opposing counsel replies are flagged immediately, attachments are filed to the right matter folder, and draft replies wait in your Drafts folder for attorney sign-off.",
    icon: "mail",
    inquiryService: "AI & Automation",
    outcomes: [
      "Spot court notices, hearing updates, and opposing counsel deadlines right away",
      "File emails and PDF attachments to the right matter without manual dragging",
      "Save attorneys an hour or more of morning inbox sorting every day",
    ],
    capabilities: [
      "Priority sorting for Court Notices, Opposing Counsel, Clients, and New Inquiries",
      "Automatic date and case-number extraction for paralegal verification",
      "One-click filing of emails and attachments into Clio, SharePoint, or Drive",
      "Pre-written draft replies saved for attorney review—never auto-sent",
    ],
    integrations: ["Microsoft Outlook / Exchange", "Google Workspace", "Clio Manage", "SharePoint", "Microsoft Teams"],
  },
  {
    id: "management-reporting",
    index: "07",
    title: "Management & Revenue Reporting",
    tagline: "Clear partner reporting on new inquiries, retainers, caseloads, and collections.",
    summary:
      "Give managing partners a straightforward view of firm health without waiting on end-of-month spreadsheets—tracking consultation volume, signed retainers, attorney workload, unbilled WIP, and receivables by practice area.",
    icon: "trending-up",
    inquiryService: "Web & Digital",
    outcomes: [
      "See where prospective clients drop off between initial call and signed retainer",
      "Balance attorney and paralegal workloads before bottlenecks build up",
      "Track collections, trust balances, and referral sources in one weekly report",
    ],
    capabilities: [
      "Consultation-to-retainer tracking across practice areas and referral sources",
      "Attorney and paralegal caseload and utilization snapshots",
      "Work-in-progress (WIP), billed, and collected revenue summaries",
      "Automated weekly summary emailed to managing partners",
    ],
    integrations: ["Clio", "MyCase", "QuickBooks / Xero", "LawPay", "Microsoft Excel / Looker Studio"],
  },
  {
    id: "private-ai-assistant",
    index: "08",
    title: "Private Firm AI Assistant",
    tagline: "Search your firm's own precedents and summarize discovery docs safely.",
    summary:
      "Give attorneys and paralegals a private assistant grounded strictly in your firm's approved templates, past briefs, and uploaded discovery docs—returning page-cited summaries and first drafts with zero public AI model training.",
    icon: "brain-circuit",
    inquiryService: "AI & Automation",
    outcomes: [
      "Summarize lengthy discovery docs, transcripts, and contracts with page citations",
      "Find relevant clauses and past memos from your firm's own work in seconds",
      "Keep client information out of public consumer AI tools",
    ],
    capabilities: [
      "Private search across your approved motion bank, templates, and playbooks",
      "Document and discovery summarization with exact page and file references",
      "First-draft client updates and correspondence reviewed by an attorney",
      "Matter-level access controls and zero-data-retention enterprise endpoints",
    ],
    integrations: ["Private Azure / AWS Endpoints", "SharePoint / OneDrive", "Google Drive", "NetDocuments", "Clio"],
  },
];

export const LEGAL_CAMPAIGNS: Record<LegalCampaignSlug, LegalCampaignPage> = {
  "intake-and-conflicts": {
    slug: "intake-and-conflicts",
    eyebrow: "Law Office Automation // 01 — Client Intake & Conflict Checks",
    moduleTitle: "Client Intake, Conflict Checks & Booking",
    heroHeadline: "Qualify new matters and run conflict checks",
    heroAccent: "before the consultation.",
    heroSubhead:
      "Replace missed calls and intake phone tag with a clear online flow that screens practice fit, gathers opposing party names for conflict checks, collects consultation fees if needed, and books directly onto the right attorney's calendar.",
    primaryCtaLabel: "Book a 15-Min Walkthrough",
    secondaryCtaLabel: "Request a Workflow Review",
    inquiryService: "AI & Automation",
    outcomesStrip: [
      {
        metric: "< 2 Minutes",
        label: "24/7 Intake & Conflict Screen",
        detail: "Prospects submit matter details and adverse parties anytime instead of waiting days for a callback.",
      },
      {
        metric: "3–5 Hrs / Wk",
        label: "Saved on Phone Screening",
        detail: "Keep out-of-scope inquiries off attorney calendars and cut back-and-forth scheduling.",
      },
      {
        metric: "Zero Switch",
        label: "Keeps Your Current Software",
        detail: "Connects directly to Clio, MyCase, PracticePanther, Outlook, and Google Calendar.",
      },
    ],
    beforeAfter: [
      {
        area: "Matter Screening",
        before: "Staff spend 20 minutes on the phone only to discover the case is outside your jurisdiction or practice areas.",
        after: "Guided intake questions screen matter type, location, and urgency before an appointment slot is offered.",
      },
      {
        area: "Conflict Checks",
        before: "Paralegals chase opposing and related party names by email hours after a consultation is already scheduled.",
        after: "Adverse parties and co-parties are collected during booking and checked against your existing matter list automatically.",
      },
      {
        area: "Consultation No-Shows",
        before: "Free consultation slots get missed or arrive with little context on the attorney's calendar.",
        after: "Optional LawPay or Stripe fee checkout, automated SMS/email reminders, and a clean matter summary on the invite.",
      },
      {
        area: "After-Hours Inquiries",
        before: "Prospective clients who reach out in the evening wait days for a callback and hire another firm first.",
        after: "Qualified prospects complete intake and schedule a consultation in under two minutes, day or night.",
      },
    ],
    workflow: [
      {
        step: "01",
        title: "Guided Intake & Party Capture",
        detail:
          "Prospective clients answer clear, practice-specific questions—matter type, key dates, jurisdiction, and all opposing or related parties—without legal jargon.",
      },
      {
        step: "02",
        title: "Automated Conflict Check & Routing",
        detail:
          "Submitted names are checked against Clio, MyCase, or your contact list. Cleared matters route to the right attorney calendar with optional consultation fee payment.",
      },
      {
        step: "03",
        title: "Calendar Invite & Matter Brief",
        detail:
          "Both the client and attorney receive calendar invites, video links, and a formatted intake summary ready for the consultation.",
      },
    ],
    deliverables: [
      {
        title: "Practice-Specific Intake Forms",
        detail: "Clear branching questions tailored to each practice area your firm handles.",
      },
      {
        title: "Conflict-Check Workflow",
        detail: "Automated lookup of opposing and related parties against existing firm records with paralegal review alerts.",
      },
      {
        title: "Attorney Calendar & Fee Routing",
        detail: "Live sync with Outlook 365 or Google Calendar, buffer times, and optional consultation fee checkout.",
      },
      {
        title: "Practice Management Sync",
        detail: "Clean contact, conflict-note, and consultation record creation inside Clio or MyCase.",
      },
    ],
    confidentialityNotes: [
      "Explicit pre-representation disclaimers confirm that submitting an intake form does not create an attorney-client relationship.",
      "Zero public AI model training—all intake records stay inside encrypted, firm-controlled storage.",
      "Role-based permissions ensure sensitive intake notes are visible only to assigned attorneys and staff.",
    ],
    stackCompatibility: [
      "Clio Grow & Manage",
      "MyCase",
      "Microsoft Outlook / 365",
      "Google Workspace",
      "LawPay & Stripe",
      "Zoom & Microsoft Teams",
    ],
    seo: {
      title: "Client Intake, Conflict Checks & Booking for Law Firms | The Virtus Labs",
      description:
        "Automate legal client intake, conflict checks, and attorney consultation booking alongside Clio, MyCase, Outlook, and Google Workspace.",
    },
  },
  "document-assembly": {
    slug: "document-assembly",
    eyebrow: "Law Office Automation // 02 — Document Assembly & E-Sign",
    moduleTitle: "Document Assembly & Retainer E-Sign",
    heroHeadline: "Send accurate engagement letters and retainers",
    heroAccent: "minutes after the consult.",
    heroSubhead:
      "Stop re-typing client names, opposing parties, and fee terms into Word templates. Generate firm-approved engagement letters, retainer agreements, and standard forms straight from your intake data and route them for e-signature.",
    primaryCtaLabel: "Book a 15-Min Walkthrough",
    secondaryCtaLabel: "Request a Workflow Review",
    inquiryService: "AI & Automation",
    outcomesStrip: [
      {
        metric: "Same-Day",
        label: "Engagement Letters Sent",
        detail: "Generate and send retainers minutes after the consultation instead of two or three days later.",
      },
      {
        metric: "20+ Min / Matter",
        label: "Saved on Manual Re-Keying",
        detail: "Client names, opposing parties, and fee terms pull straight from intake or practice records.",
      },
      {
        metric: "Zero Switch",
        label: "Uses Your Approved Templates",
        detail: "Runs with your existing Word clauses, DocuSign or PandaDoc, Clio, MyCase, and LawPay.",
      },
    ],
    beforeAfter: [
      {
        area: "Drafting Engagement Letters",
        before: "Attorneys or paralegals duplicate an old Word file and manually edit client names, scope, and retainer amounts.",
        after: "Approved templates auto-fill directly from Clio, MyCase, or intake records with zero manual re-keying.",
      },
      {
        area: "Slow Retainer Turnaround",
        before: "Busy attorneys take two or three days to send the fee agreement, giving the prospect time to cool off.",
        after: "Right after the consultation, one click generates the engagement letter and sends it for mobile-friendly e-sign.",
      },
      {
        area: "Chasing Signatures & Deposits",
        before: "Staff manually check who still owes a signed agreement or initial trust deposit each Friday.",
        after: "Polite automatic reminders follow up on unsigned agreements and link straight to LawPay retainer checkout.",
      },
      {
        area: "Matter Setup",
        before: "Once signed, someone still has to create matter folders, add tasks, and notify the paralegal team.",
        after: "Completed signatures automatically create the matter folders, assign kickoff checklists, and alert the team.",
      },
    ],
    workflow: [
      {
        step: "01",
        title: "Template & Clause Mapping",
        detail:
          "We convert your firm's existing engagement letters, fee agreements, and standard forms into structured templates with approved clause options.",
      },
      {
        step: "02",
        title: "One-Click Draft & Review",
        detail:
          "After a consultation, attorney or paralegal approval fills the document from your intake or CRM data—ready to preview before sending.",
      },
      {
        step: "03",
        title: "E-Sign, Retainer & Matter Kickoff",
        detail:
          "The client signs on any device, pays the initial retainer via LawPay or Stripe, and the signed PDF files straight into the matter folder.",
      },
    ],
    deliverables: [
      {
        title: "Firm Template Library Setup",
        detail: "Automated Word/PDF assembly for your engagement letters, retainers, conflict waivers, and intake packets.",
      },
      {
        title: "CRM & Matter Data Sync",
        detail: "Two-way field mapping with Clio, MyCase, or your intake database so information is entered once.",
      },
      {
        title: "E-Signature & Retainer Flow",
        detail: "Connected DocuSign, PandaDoc, or Adobe Sign routing paired with LawPay trust/operating deposit links.",
      },
      {
        title: "Post-Signature Matter Triggers",
        detail: "Automatic folder provisioning, signed-document filing, and paralegal kickoff notifications.",
      },
    ],
    confidentialityNotes: [
      "Deterministic template assembly—your approved legal wording is never altered or improvised without attorney review.",
      "Full audit trail of who generated, reviewed, sent, and signed every engagement document.",
      "Signed agreements and fee schedules store directly in your firm's SharePoint, Google Drive, or DMS.",
    ],
    stackCompatibility: [
      "Microsoft Word / 365",
      "DocuSign & PandaDoc",
      "Clio Manage",
      "MyCase",
      "LawPay & Stripe",
      "SharePoint & Google Drive",
    ],
    seo: {
      title: "Law Firm Document Assembly & Retainer E-Sign | The Virtus Labs",
      description:
        "Generate engagement letters, retainer agreements, and standard legal forms automatically from intake data and collect e-signatures faster.",
    },
  },
  "client-portal": {
    slug: "client-portal",
    eyebrow: "Law Office Automation // 03 — Client Matter Portal",
    moduleTitle: "Client Matter Portal & Document Collection",
    heroHeadline: "End 'any update on my case?'",
    heroAccent: "calls and emails.",
    heroSubhead:
      "Give clients one simple, firm-branded portal on your own domain where they can check matter progress in plain language, upload requested discovery docs and records through guided checklists, and pay retainers or invoices.",
    primaryCtaLabel: "Book a 15-Min Walkthrough",
    secondaryCtaLabel: "Request a Workflow Review",
    inquiryService: "Web & Digital",
    outcomesStrip: [
      {
        metric: "24/7 Access",
        label: "Self-Serve Case Updates",
        detail: "Clients check plain-English matter milestones anytime instead of calling your front desk for updates.",
      },
      {
        metric: "3–4 Hrs / Wk",
        label: "Less Document Chasing",
        detail: "Guided upload checklists collect complete discovery files without scattered email attachments.",
      },
      {
        metric: "Zero Switch",
        label: "Layers Onto Your Software",
        detail: "Syncs cleanly with Clio, MyCase, PracticePanther, SharePoint, and Google Drive on your domain.",
      },
    ],
    beforeAfter: [
      {
        area: "Routine Status Calls",
        before: "Paralegals lose hours every week answering 'where are we at?' emails and phone calls.",
        after: "Clients sign in anytime to see plain-English matter stages, recent updates, and what happens next.",
      },
      {
        area: "Collecting Client Documents",
        before: "Clients email blurry photos across a dozen separate threads, missing pages and slowing down filings.",
        after: "Clear upload checklists show exactly which discovery docs or IDs are needed and send gentle reminders.",
      },
      {
        area: "Folder & File Organization",
        before: "Staff manually rename attachments and drag them from Outlook into nested network folders.",
        after: "Uploaded files are automatically renamed to your firm's convention and filed into the right matter folder.",
      },
      {
        area: "Client Experience",
        before: "Generic file-sharing links and scattered email threads make communication feel disorganized.",
        after: "A calm, mobile-friendly portal at portal.yourfirm.com that reflects the quality of your practice.",
      },
    ],
    workflow: [
      {
        step: "01",
        title: "Branded Portal Setup",
        detail:
          "We launch a clean client portal under your firm's domain with secure one-time login links—so clients never forget another password.",
      },
      {
        step: "02",
        title: "Matter Milestones & Document Checklists",
        detail:
          "When a matter opens in Clio or MyCase, the client automatically receives their milestone tracker and list of required documents.",
      },
      {
        step: "03",
        title: "Organized Matter Filing",
        detail:
          "Every file the client uploads is checked, renamed consistently, and routed straight into SharePoint, Google Drive, or your DMS.",
      },
    ],
    deliverables: [
      {
        title: "Custom-Domain Client Portal",
        detail: "Mobile-ready client workspace branded for your firm with passwordless sign-in.",
      },
      {
        title: "Guided Document Checklists",
        detail: "Per-matter upload lists showing Requested, Received, and Approved status with polite follow-ups.",
      },
      {
        title: "Automatic Folder & Naming Sync",
        detail: "Standardized matter folders and clean file naming inside SharePoint, OneDrive, Google Drive, or your DMS.",
      },
      {
        title: "Invoices & Message Threading",
        detail: "One place for clients to view balances, pay via LawPay/Stripe, and message their legal team.",
      },
    ],
    confidentialityNotes: [
      "Replaces unencrypted email attachments with authenticated portal uploads and complete view/download logs.",
      "Matter-scoped access ensures clients only ever see their own files, milestones, and invoices.",
      "Works alongside Clio, MyCase, SharePoint, and Google Workspace without replacing your existing accounting.",
    ],
    stackCompatibility: [
      "Clio Manage",
      "MyCase",
      "SharePoint & OneDrive",
      "Google Workspace",
      "LawPay & Stripe",
      "DocuSign",
    ],
    seo: {
      title: "Client Matter Portal & Document Collection for Law Firms | The Virtus Labs",
      description:
        "Give legal clients a branded portal for matter updates, guided discovery and intake document uploads, and simple invoice payments.",
    },
  },
  "billing-automation": {
    slug: "billing-automation",
    eyebrow: "Law Office Automation // 04 — Time Capture & Billing",
    moduleTitle: "Time Capture, Invoicing & Payment Follow-Ups",
    heroHeadline: "Cleaner pre-bills, funded retainers,",
    heroAccent: "and faster collections.",
    heroSubhead:
      "Stop losing billable time to end-of-month reconstruction or chasing unpaid invoices by hand. Capture matter activity accurately, prepare pre-bills for partner review, watch trust-account thresholds, and automate polite payment reminders.",
    primaryCtaLabel: "Book a 15-Min Walkthrough",
    secondaryCtaLabel: "Request a Workflow Review",
    inquiryService: "AI & Automation",
    outcomesStrip: [
      {
        metric: "Daily Prompts",
        label: "Faster Time Capture",
        detail: "Matter calls, meetings, and emails turn into draft time entries ready for quick attorney sign-off.",
      },
      {
        metric: "4+ Hrs / Mo",
        label: "Saved on Pre-Bills & Chasing",
        detail: "Streamline partner pre-bill review, trust-threshold notices, and polite overdue reminders.",
      },
      {
        metric: "Zero Switch",
        label: "Fits Your Billing Setup",
        detail: "Works alongside Clio, MyCase, PracticePanther, LawPay, QuickBooks, and Xero.",
      },
    ],
    beforeAfter: [
      {
        area: "Time Capture",
        before: "Attorneys reconstruct the past two weeks from sent emails and calendar slots right before billing closes.",
        after: "Daily draft time entries are compiled from matter calls, meetings, and emails for quick review and approval.",
      },
      {
        area: "Pre-Bill Review",
        before: "Paralegals spend days formatting pre-bill PDFs and chasing partner edits over email.",
        after: "Pre-bills organize cleanly by matter with summary flags so managing partners can review and approve faster.",
      },
      {
        area: "Trust-Account Thresholds",
        before: "Teams notice a depleted retainer only after work has already gone unbilled for weeks.",
        after: "Low trust-account thresholds trigger automatic client replenishment notices with a one-click LawPay link.",
      },
      {
        area: "Overdue Invoices",
        before: "Aging receivables sit untouched because nobody wants to make awkward collection calls.",
        after: "Consistent, respectful 7-, 15-, and 30-day reminders go out automatically with direct online payment links.",
      },
    ],
    workflow: [
      {
        step: "01",
        title: "Activity & Time Capture",
        detail:
          "Calendar meetings, document milestones, and client correspondence generate suggested time entries in your firm's billing descriptions—held for attorney approval.",
      },
      {
        step: "02",
        title: "Pre-Bill & Trust Threshold Checks",
        detail:
          "Before invoicing runs, pre-bills are grouped for partner review and matters dipping below their trust-account threshold are flagged automatically.",
      },
      {
        step: "03",
        title: "Invoicing & Scheduled Follow-Ups",
        detail:
          "Approved invoices issue through Clio, QuickBooks, or LawPay with scheduled, firm-toned reminders until paid.",
      },
    ],
    deliverables: [
      {
        title: "Daily Time-Entry Prompts",
        detail: "Automated activity summaries from Outlook, Google Calendar, and matter work ready for attorney confirmation.",
      },
      {
        title: "Pre-Bill Preparation Workflow",
        detail: "Streamlined pre-bill summaries and approval routing for billing attorneys and managing partners.",
      },
      {
        title: "Trust Replenishment Alerts",
        detail: "Automated evergreen-retainer alerts when matter trust balances cross your configured threshold.",
      },
      {
        title: "Invoice & Collections Cadence",
        detail: "Polite automated reminders linked directly to LawPay, Clio Payments, or QuickBooks checkout.",
      },
    ],
    confidentialityNotes: [
      "Attorney and billing-partner approval stays required before any time entry or invoice is finalized.",
      "IOLTA / trust-account separation respected—payment links route strictly to the designated trust or operating account.",
      "Zero public AI training on client billing descriptions or matter narratives.",
    ],
    stackCompatibility: [
      "Clio Manage & Clio Payments",
      "LawPay",
      "QuickBooks Online",
      "Xero",
      "MyCase",
      "Outlook & Google Calendar",
    ],
    seo: {
      title: "Law Firm Time Capture, Invoicing & Payment Automation | The Virtus Labs",
      description:
        "Automate legal time capture prompts, pre-bill prep, trust-account threshold alerts, and polite invoice follow-ups with Clio, LawPay, and QuickBooks.",
    },
  },
};

export const LEGAL_CAMPAIGN_FAQS: readonly LegalFaqItem[] = [
  {
    q: "Will this work alongside Clio, MyCase, or PracticePanther?",
    a: "Yes. We connect directly to the practice management, email, and billing tools your office already relies on—including Clio, MyCase, PracticePanther, Outlook 365, Google Workspace, SharePoint, LawPay, and QuickBooks. Your attorneys and paralegals stay inside their familiar systems with no data migration.",
  },
  {
    q: "How do you protect client confidentiality and prevent public AI training?",
    a: "Client and matter records are never used to train public AI models. Workflows run on isolated, zero-data-retention infrastructure with firm-controlled storage and role-based permissions. Engagement letters, conflict flags, time entries, and client messages stay held for attorney or paralegal review before anything goes out.",
  },
  {
    q: "How long does setup take, and how much time does it take from our attorneys?",
    a: "Most single-workflow setups go live in 2 to 4 weeks. After a 15-minute walkthrough and a short review of your current forms, templates, or billing rules, we handle the build, testing, and staff handoff without pulling attorneys away from billable work.",
  },
  {
    q: "Can you tailor the workflow to our firm's specific practice areas?",
    a: "Yes. Whether your firm handles family law, civil litigation, estate planning, real estate, corporate, or personal injury, we adapt intake questions, conflict-check rules, engagement letter clauses, and matter checklists to match how your team already runs files.",
  },
];

export function getLegalCampaignBySlug(slug: string): LegalCampaignPage | undefined {
  if ((LEGAL_CAMPAIGN_SLUGS as readonly string[]).includes(slug)) {
    return LEGAL_CAMPAIGNS[slug as LegalCampaignSlug];
  }
  return undefined;
}

export function getOtherLegalCampaigns(current: LegalCampaignSlug): LegalCampaignPage[] {
  return LEGAL_CAMPAIGN_SLUGS.filter((s) => s !== current).map((s) => LEGAL_CAMPAIGNS[s]);
}
