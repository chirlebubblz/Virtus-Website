// Database store with in-memory persistence and Neon connection readiness
export { PORTAL_TOKEN_PATTERN, generatePortalToken } from "@/lib/tokens";

export interface Opportunity {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  stage: "new_inquiry" | "qualified" | "proposal_sent" | "in_review" | "won" | "lost";
  dealValue: number;
  recommendedTier: "Focused" | "Growth" | "Integrated";
  needs: string[];
  timeline: string;
  budgetBracket: string;
  message?: string;
  deliverables?: string[];
  createdAt: string;

  // 360° Prospect Profile Fields
  location?: string;
  timezone?: string;
  websiteUrl?: string;
  socialMedia?: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  industry?: string;
  currentBottleneck?: string;
  growthGoal?: string;
  howWeAssist?: string[];
  roleLeader?: string;
  leadScore?: "Hot" | "Warm" | "Cold";
  tags?: string[];
  internalNotes?: string;
}

export interface MediaAsset {
  id: string;
  clientId?: string | null; // null = General Library
  clientName?: string;
  title: string;
  filename: string;
  fileType: "document" | "image" | "video" | "audio";
  fileSize: string;
  url: string;
  category: "Templates" | "Brand Kit" | "Deliverables" | "Stock / Raw" | "Legal";
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  company: string;
  email: string;
  status: "Active" | "Completed" | "Onboarding";
  totalRevenue: number;
  activeProjectsCount: number;
  /** SHA-256 of the access token. The plaintext token is never stored. */
  portalTokenHash: string | null;
  portalTokenLast4: string | null;
  portalTokenExpiresAt: string | null;
  portalTokenRevokedAt: string | null;
  createdAt: string;
}

/** Client record safe to send to the browser: no token hash. */
export type ClientSummary = Omit<Client, "portalTokenHash">;

export function toClientSummary(client: Client): ClientSummary {
  const { portalTokenHash: _hash, ...rest } = client;
  return rest;
}

export interface RevisionTicket {
  id: string;
  clientId: string;
  round: number;
  categories: string[];
  targetArea: string;
  priority: "routine" | "important" | "blocker";
  details: string;
  referenceUrl: string;
  attachments: string[];
  submittedAt: string;
  submittedBy: string;
  submittedEmail: string;
}

export type ApprovalStatus = "pending" | "approved" | "changes_requested";

export interface ProjectDoc {
  title: string;
  url: string;
  type: string;
  size?: string;
}

export interface ProjectDeliverable {
  title: string;
  status: "Pending" | "In Review" | "Approved";
  url?: string;
  approvedAt?: string;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  phase: "Discover" | "Design" | "Build" | "Deliver" | "Support";
  progress: number;
  riskLevel: "On Track" | "Needs Review" | "At Risk";
  budget: number;
  startDate: string;
  targetDate: string;
  leadName?: string;
  leadRole?: string;
  podName?: string;
  teamMembers?: string[];
  docs?: ProjectDoc[];
  deliverables?: ProjectDeliverable[];
}

export interface Task {
  id: string;
  projectId?: string;
  projectTitle?: string;
  title: string;
  assignee: string;
  assigneeAvatar?: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  company?: string;
  invoiceNumber: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
  dueDate: string;
  paidAt?: string;
}

export interface Booking {
  id: string;
  clientName: string;
  company: string;
  email: string;
  bookingType: string;
  date: string;
  time: string;
  host: string;
  meetingUrl: string;
  status: "Confirmed" | "Pending" | "Completed" | "Rescheduled" | "Cancelled" | "Canceled";
  notes?: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  clientId: string;
  clientName: string;
  company: string;
  title: string;
  amount: number;
  status: "Draft" | "Sent" | "Accepted" | "Declined";
  validUntil: string;
  scopeSummary: string[];
  timeline: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientId: string;
  clientName: string;
  company: string;
  title: string;
  contractType: "Master Service Agreement (MSA)" | "Statement of Work (SOW)" | "Retainer Agreement" | "NDA";
  value: number;
  status: "Signed" | "Pending Signature" | "Draft";
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  body: string;
  timestamp: string;
}

export interface EmailThread {
  id: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  folder: "inbox" | "inquiries" | "sent" | "starred";
  clientName?: string;
  starred?: boolean;
  messageId?: string;
  inReplyTo?: string;
  messages?: EmailMessage[];
  isMock?: boolean;
}

export interface TeamPod {
  id: string;
  name: string;
  focusArea: string;
  leaderId: string;
  leaderName: string;
  leaderRole: string;
  memberIds: string[];
  color: string;
  activeProjectsCount: number;
  createdAt: string;
}

export interface TeamMemberUser {
  id: string;
  name: string;
  roleTitle: string;
  teamId?: string;
  teamName?: string;
  isLeader?: boolean;
  email: string;
  permission: "Owner / Admin" | "Pod Lead" | "Specialist" | "Client Guest";
  avatar: string;
  activeProjects: string[];
  status: "Active" | "Away";
}

export interface ActivityItem {
  id: string;
  description: string;
  category: "lead" | "project" | "invoice" | "media" | "task" | "milestone" | "proposal" | "contract";
  timestamp: string;
}

// Global in-memory / persistent mock store
/** Collision-safe id. Date.now() alone repeats when two records are created in the same millisecond. */
export function uid(prefix: string): string {
  const c = globalThis.crypto as Crypto | undefined;
  const raw = c?.randomUUID ? c.randomUUID().replace(/-/g, "") : Math.random().toString(16).slice(2).padEnd(12, "0");
  return `${prefix}-${raw.slice(0, 10)}`;
}

interface DemoSeed {
  opportunities: Opportunity[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  bookings: Booking[];
  mediaAssets: MediaAsset[];
  activity: ActivityItem[];
  proposals: Proposal[];
  contracts: Contract[];
  emails: EmailThread[];
}

class AgencyDatabase {
  private opportunities: Opportunity[] = [
    {
      id: "opp-1",
      name: "Arthur Pendelton",
      company: "Tidewater Roast Co.",
      email: "arthur@tidewater.coffee",
      phone: "+1 (206) 555-0192",
      stage: "won",
      dealValue: 5500,
      recommendedTier: "Growth",
      needs: ["Brand & Creative", "Web & Digital"],
      timeline: "In a few weeks",
      budgetBracket: "$3k – $7k",
      message: "Looking for complete identity refresh and custom high-converting storefront.",
      deliverables: ["Visual Identity System", "Custom Responsive Storefront", "Packaging Templates"],
      createdAt: "2026-09-21T09:30:00Z",
      location: "Seattle, WA · USA",
      timezone: "PST (UTC-8)",
      websiteUrl: "https://tidewater.coffee",
      socialMedia: {
        instagram: "@tidewaterroast",
        linkedin: "linkedin.com/company/tidewater-coffee",
      },
      industry: "Specialty Coffee / E-Commerce",
      currentBottleneck: "High mobile bounce rate on legacy theme; manual order fulfillment notifications.",
      growthGoal: "Scale direct-to-consumer subscriber base from 400 to 2,000 monthly members.",
      howWeAssist: [
        "Dark luxury 3D product visual assets for packaging & checkout",
        "Next.js headless high-speed digital storefront (<0.8s load)",
        "Automated subscription reminder & retention sequences",
      ],
      roleLeader: "Kai (Brand Lead)",
      leadScore: "Hot",
      tags: ["#ECommerce", "#BrandRefresh", "#HotLead"],
      internalNotes: "Met Arthur at Coffee Fest Seattle. Highly enthusiastic about our 3D render capabilities. Proposal executed and deposit cleared.",
    },
    {
      id: "opp-2",
      name: "Dr. Elena Vance",
      company: "Meridian Clinic",
      email: "elena@meridianhealth.org",
      phone: "+1 (415) 890-2341",
      stage: "in_review",
      dealValue: 7200,
      recommendedTier: "Integrated",
      needs: ["Web & Digital", "AI & Automation"],
      timeline: "One to two months",
      budgetBracket: "$7k+",
      message: "Needs an automated booking system and modern patient intake portal.",
      deliverables: ["Patient Intake UX", "HIPAA-aligned Automation", "Modern Web Platform"],
      createdAt: "2026-09-22T14:15:00Z",
      location: "San Francisco, CA · USA",
      timezone: "PST (UTC-8)",
      websiteUrl: "https://meridianhealth.org",
      socialMedia: {
        linkedin: "linkedin.com/in/elena-vance-md",
      },
      industry: "Healthcare & Concierge Wellness",
      currentBottleneck: "Front-desk staff spends 18 hrs/week manually keying intake PDFs and scheduling patient calls.",
      growthGoal: "Transition to 100% digital self-service booking with automated pre-consultation reminders.",
      howWeAssist: [
        "Cal.com HIPAA-compliant calendar scheduling with two-way Google Calendar sync",
        "Interactive digital intake portal with automated validation",
        "Automated appointment confirmation & SMS/email reminder sequence",
      ],
      roleLeader: "Ren (Engineering Lead)",
      leadScore: "Hot",
      tags: ["#Healthcare", "#Automation", "#HighBudget"],
      internalNotes: "Board review meeting scheduled for next Tuesday. Elena requested a prototype walk-through of the intake portal.",
    },
    {
      id: "opp-3",
      name: "Marcus Brody",
      company: "Harbor Freight Logistics",
      email: "marcus@harborfreight.coop",
      phone: "+1 (312) 441-9872",
      stage: "proposal_sent",
      dealValue: 4800,
      recommendedTier: "Focused",
      needs: ["AI & Automation"],
      timeline: "Flexible",
      budgetBracket: "$3k – $7k",
      message: "We need automated freight quoting algorithms and client intake workflows.",
      deliverables: ["Custom Quoting Engine", "Email Parsing Automation"],
      createdAt: "2026-09-23T08:00:00Z",
      location: "Chicago, IL · USA",
      timezone: "CST (UTC-6)",
      websiteUrl: "https://harborfreight.coop",
      socialMedia: {
        linkedin: "linkedin.com/company/harbor-freight-logistics",
      },
      industry: "B2B Freight & Supply Chain Logistics",
      currentBottleneck: "Manual rate card lookups take 45 mins per quote request; high quote abandonment.",
      growthGoal: "Provide instant rate estimations to capture logistics contracts before competitors reply.",
      howWeAssist: [
        "Automated algorithm-based instant quote calculator widget",
        "Inbound lead intake webhook syncing directly into Virtus OS Pipeline",
        "Automated branded PDF proposal generation",
      ],
      roleLeader: "Sora (Strategy Lead)",
      leadScore: "Warm",
      tags: ["#Logistics", "#B2B", "#QuotingEngine"],
      internalNotes: "Sent custom pricing matrix proposal. Awaiting confirmation on target API integrations.",
    },
    {
      id: "opp-4",
      name: "Jackson Meyer",
      company: "Nova AI Audio",
      email: "jackson@novaaudio.ai",
      phone: "+1 (512) 839-4410",
      stage: "new_inquiry",
      dealValue: 6800,
      recommendedTier: "Integrated",
      needs: ["Brand & Creative", "Web & Digital", "Content Engine"],
      timeline: "Urgent (< 2 weeks)",
      budgetBracket: "$7k+",
      message: "New project brief submitted via interactive auto-quote builder.",
      deliverables: ["Sonic Brand Architecture", "Custom Web Experience", "Interactive Audio Renders", "Content Engine"],
      createdAt: "2026-10-01T16:30:00Z",
      location: "Austin, TX · USA",
      timezone: "CST (UTC-6)",
      websiteUrl: "https://novaaudio.ai",
      socialMedia: {
        linkedin: "linkedin.com/company/nova-ai-audio",
      },
      industry: "AI Audio & Spatial Synthesis",
      currentBottleneck: "Announcing seed round in 3 weeks; current landing page is a placeholder Notion site with 0 conversion capability.",
      growthGoal: "Drive 10,000 developer waitlist signups and executive launch visibility within 14 days of PR drop.",
      howWeAssist: [
        "High-fidelity interactive 3D WebGL sound wave hero visualization",
        "Next.js high-speed conversion funnel with waitlist referral engine",
        "Automated press kit and investor teaser documentation portal",
      ],
      roleLeader: "Kai (Brand Lead)",
      leadScore: "Hot",
      tags: ["#AIAudio", "#Inquiry", "#HotLead", "#Urgent"],
      internalNotes: "Inbound via interactive website brief engine. High budget urgency. Ready for immediate kickoff alignment.",
    },
  ];

  private revisions: RevisionTicket[] = [];
  private approvals: Record<string, ApprovalStatus> = {};

  private clients: Client[] = [
    {
      id: "cli-1",
      name: "Arthur Pendelton",
      contactName: "Arthur Pendelton",
      company: "Tidewater Coffee",
      email: "arthur@tidewater.coffee",
      status: "Active",
      totalRevenue: 5500,
      activeProjectsCount: 1,
      portalTokenHash: "650b0796b2d2749faee961dae06277ce5f946c87b9e56f7cfead173469d93b28", // demo token, dev only
      portalTokenLast4: "afcb",
      portalTokenExpiresAt: "2099-01-01T00:00:00.000Z",
      portalTokenRevokedAt: null,
      createdAt: "2026-09-21T10:00:00Z",
    },
    {
      id: "cli-2",
      name: "Elena Vance",
      contactName: "Dr. Elena Vance",
      company: "Meridian Clinic",
      email: "elena@meridianhealth.org",
      status: "Onboarding",
      totalRevenue: 3600,
      activeProjectsCount: 1,
      portalTokenHash: "a94fd9b3bd710ecd4d48095ff5671c0ca7e91b6bc62db8426730cec97b702927", // demo token, dev only
      portalTokenLast4: "1e7f",
      portalTokenExpiresAt: "2099-01-01T00:00:00.000Z",
      portalTokenRevokedAt: null,
      createdAt: "2026-09-22T15:00:00Z",
    },
    {
      id: "cli-3",
      name: "Marcus Brody",
      contactName: "Marcus Brody",
      company: "Harbor Freight Logistics",
      email: "marcus@harborfreight.coop",
      status: "Active",
      totalRevenue: 8400,
      activeProjectsCount: 1,
      portalTokenHash: null,
      portalTokenLast4: "9b4c",
      portalTokenExpiresAt: "2099-01-01T00:00:00.000Z",
      portalTokenRevokedAt: null,
      createdAt: "2026-09-23T08:00:00Z",
    },
    {
      id: "cli-4",
      name: "Aaron Vance",
      contactName: "Aaron Vance",
      company: "Nova AI Audio",
      email: "aaron@novaaudio.ai",
      status: "Completed",
      totalRevenue: 4200,
      activeProjectsCount: 0,
      portalTokenHash: null,
      portalTokenLast4: null,
      portalTokenExpiresAt: null,
      portalTokenRevokedAt: null,
      createdAt: "2026-09-24T12:00:00Z",
    },
  ];

  private projects: Project[] = [
    {
      id: "proj-1",
      clientId: "cli-1",
      clientName: "Tidewater Coffee",
      title: "Coastal Brand & E-Commerce Flagship",
      phase: "Build",
      progress: 68,
      riskLevel: "On Track",
      budget: 5500,
      startDate: "2026-09-21",
      targetDate: "2026-10-15",
      leadName: "Kai",
      leadRole: "Brand & Creative Lead",
      podName: "Brand & Creative Pod",
      teamMembers: ["Kai (Brand Lead)", "Ren (Frontend)", "Sora (UX)"],
      docs: [
        { title: "Brand Identity & Stylebook (PDF)", url: "/assets/brand-guide.pdf", type: "Brand Kit", size: "14.2 MB" },
        { title: "Next.js & Shopify Headless Spec", url: "https://github.com/chirlebubblz/Virtus-Website", type: "Technical Architecture", size: "Cloud" },
        { title: "Figma UI/UX Prototypes & Flows", url: "https://figma.com/@virtuslabs/tidewater", type: "Design System", size: "Figma" },
      ],
      deliverables: [
        { title: "Brand Identity System & Assets", status: "Approved", url: "/assets/brand-guide.pdf", approvedAt: "2026-09-24" },
        { title: "Responsive Headless Storefront", status: "In Review", url: "https://thevirtuslabs.com/work/web" },
        { title: "Custom Stripe Checkout & Inventory", status: "Pending" },
      ],
    },
    {
      id: "proj-2",
      clientId: "cli-2",
      clientName: "Meridian Clinic",
      title: "Patient Experience & Intake Portal",
      phase: "Design",
      progress: 35,
      riskLevel: "On Track",
      budget: 7200,
      startDate: "2026-09-22",
      targetDate: "2026-11-01",
      leadName: "Ren",
      leadRole: "Lead Frontend Engineer",
      podName: "Engineering & Architecture Pod",
      teamMembers: ["Ren (Frontend)", "Sora (UX)", "Paks (Studio Director)"],
      docs: [
        { title: "HIPAA Compliant Data Handling Spec", url: "/assets/sow-template.pdf", type: "Security Spec", size: "820 KB" },
        { title: "Interactive Patient Journey Map", url: "https://figma.com/@virtuslabs/meridian", type: "Figma Blueprint", size: "Figma" },
        { title: "Neon Postgres Database Schema", url: "/api/health", type: "Data Model", size: "Live Schema" },
      ],
      deliverables: [
        { title: "HIPAA Security Architecture Blueprint", status: "Approved", approvedAt: "2026-09-25" },
        { title: "Patient Appointment Booking UI", status: "In Review" },
        { title: "Clinical Intake & EHR Sync Engine", status: "Pending" },
      ],
    },
  ];

  private tasks: Task[] = [
    {
      id: "task-1",
      projectId: "proj-1",
      projectTitle: "Tidewater Coffee",
      title: "Finalize vector SVG logo exports and brand stylebook",
      assignee: "Kai (Brand Lead)",
      status: "review",
      priority: "high",
      dueDate: "Tomorrow",
    },
    {
      id: "task-2",
      projectId: "proj-1",
      projectTitle: "Tidewater Coffee",
      title: "Connect Stripe checkout to custom product catalog",
      assignee: "Ren (Frontend)",
      status: "in_progress",
      priority: "urgent",
      dueDate: "Sep 26",
    },
    {
      id: "task-3",
      projectId: "proj-2",
      projectTitle: "Meridian Clinic",
      title: "Wireframe mobile-first appointment booking flow",
      assignee: "Sora (UX)",
      status: "todo",
      priority: "medium",
      dueDate: "Sep 28",
    },
  ];

  private invoices: Invoice[] = [
    {
      id: "inv-1",
      clientId: "cli-1",
      clientName: "Tidewater Coffee",
      invoiceNumber: "INV-2026-001",
      amount: 2750,
      status: "Paid",
      dueDate: "2026-09-21",
      paidAt: "2026-09-21",
    },
    {
      id: "inv-2",
      clientId: "cli-2",
      clientName: "Meridian Clinic",
      invoiceNumber: "INV-2026-002",
      amount: 3600,
      status: "Paid",
      dueDate: "2026-09-22",
      paidAt: "2026-09-22",
    },
    {
      id: "inv-3",
      clientId: "cli-1",
      clientName: "Tidewater Coffee",
      invoiceNumber: "INV-2026-003",
      amount: 2750,
      status: "Pending",
      dueDate: "2026-10-15",
    },
  ];

  private bookings: Booking[] = [
    {
      id: "book-1",
      clientName: "Arthur Pendelton",
      company: "Tidewater Coffee",
      email: "arthur@tidewater.coffee",
      bookingType: "Strategy & Scope (45 min)",
      date: "2026-09-24",
      time: "10:00 AM - 10:45 AM",
      host: "Paks (Studio Director)",
      meetingUrl: "https://meet.google.com/tvl-disc-7641",
      status: "Confirmed",
      notes: "Review packaging mockups and finalize Shopify milestone 1.",
      createdAt: "2026-09-22",
    },
    {
      id: "book-2",
      clientName: "Dr. Elena Vance",
      company: "Meridian Clinic",
      email: "elena@meridianhealth.org",
      bookingType: "Discovery Call (30 min)",
      date: "2026-09-25",
      time: "02:00 PM - 02:30 PM",
      host: "Kai (Brand Lead)",
      meetingUrl: "https://meet.google.com/tvl-disc-8922",
      status: "Confirmed",
      notes: "Review AI automation and intake patient journey map.",
      createdAt: "2026-09-23",
    },
    {
      id: "book-3",
      clientName: "Marcus Brody",
      company: "Harbor Freight Logistics",
      email: "marcus@harborfreight.coop",
      bookingType: "Kickoff Meeting (60 min)",
      date: "2026-09-26",
      time: "11:00 AM - 12:00 PM",
      host: "Ren (Lead Engineer)",
      meetingUrl: "https://meet.google.com/tvl-kick-1104",
      status: "Confirmed",
      notes: "Sprint 1 kickoff for custom freight quoting algorithms.",
      createdAt: "2026-09-23",
    },
    {
      id: "book-4",
      clientName: "Sarah Lin",
      company: "Northstar Studio",
      email: "sarah@northstar.video",
      bookingType: "Sprint Demo",
      date: "2026-09-29",
      time: "04:00 PM - 04:30 PM",
      host: "Paks (Studio Director)",
      meetingUrl: "https://meet.google.com/tvl-demo-3320",
      status: "Confirmed",
      notes: "Walkthrough of video editing system and multi-channel cuts.",
      createdAt: "2026-09-23",
    },
  ];

  private mediaAssets: MediaAsset[] = [
    // General Library
    {
      id: "med-1",
      clientId: null,
      title: "The Virtus Labs - Master Brand Identity Guide (PDF)",
      filename: "TVL_Brand_Stylebook_2026.pdf",
      fileType: "document",
      fileSize: "14.2 MB",
      url: "/assets/brand-guide.pdf",
      category: "Brand Kit",
      createdAt: "2026-09-20",
    },
    {
      id: "med-2",
      clientId: null,
      title: "Agency Master SOW & Engagement Agreement Boilerplate",
      filename: "TVL_Standard_SOW_Template.pdf",
      fileType: "document",
      fileSize: "820 KB",
      url: "/assets/sow-template.pdf",
      category: "Legal",
      createdAt: "2026-09-20",
    },
    {
      id: "med-3",
      clientId: null,
      title: "Cinematic Dark Atmospheric Reel (4K Prores)",
      filename: "agency_ambient_reel.mp4",
      fileType: "video",
      fileSize: "148 MB",
      url: "https://images.pexels.com/photos/29795384/pexels-photo-29795384.jpeg",
      category: "Stock / Raw",
      createdAt: "2026-09-21",
    },
    {
      id: "med-4",
      clientId: null,
      title: "Studio Podcast Opening Theme Audio (Master WAV)",
      filename: "tvl_sonic_intro.wav",
      fileType: "audio",
      fileSize: "28 MB",
      url: "/assets/audio-sample.mp3",
      category: "Templates",
      createdAt: "2026-09-21",
    },
    // Client Work Vault: Tidewater Coffee
    {
      id: "med-5",
      clientId: "cli-1",
      clientName: "Tidewater Coffee",
      title: "Final Vector Logo Suite (AI, SVG, PNG)",
      filename: "Tidewater_Logo_Suite_v1.zip",
      fileType: "document",
      fileSize: "42 MB",
      url: "/assets/tidewater-logo.zip",
      category: "Deliverables",
      createdAt: "2026-09-22",
    },
    {
      id: "med-6",
      clientId: "cli-1",
      clientName: "Tidewater Coffee",
      title: "Packaging Mockup Hero Render (High Res)",
      filename: "tidewater_canister_3d.png",
      fileType: "image",
      fileSize: "6.8 MB",
      url: "https://images.pexels.com/photos/29795384/pexels-photo-29795384.jpeg",
      category: "Deliverables",
      createdAt: "2026-09-22",
    },
    // Client Work Vault: Meridian Clinic
    {
      id: "med-7",
      clientId: "cli-2",
      clientName: "Meridian Clinic",
      title: "Patient Intake User Journey & Wireframe Spec",
      filename: "Meridian_UX_Architecture.pdf",
      fileType: "document",
      fileSize: "8.5 MB",
      url: "/assets/meridian-ux.pdf",
      category: "Deliverables",
      createdAt: "2026-09-23",
    },
  ];

  private activity: ActivityItem[] = [
    {
      id: "act-1",
      description: "Arthur Pendelton accepted proposal for Tidewater Coffee ($5,500)",
      category: "lead",
      timestamp: "2 hours ago",
    },
    {
      id: "act-2",
      description: "Payment collected: $3,600 from Meridian Clinic (INV-2026-002)",
      category: "invoice",
      timestamp: "4 hours ago",
    },
    {
      id: "act-3",
      description: "Ren updated task: 'Connect Stripe checkout' to In Progress",
      category: "task",
      timestamp: "5 hours ago",
    },
    {
      id: "act-4",
      description: "New media asset uploaded: Tidewater_Logo_Suite_v1.zip (42 MB)",
      category: "media",
      timestamp: "1 day ago",
    },
  ];

  private proposals: Proposal[] = [
    {
      id: "prop-1",
      proposalNumber: "PROP-2026-081",
      clientId: "cli-1",
      clientName: "Arthur Pendelton",
      company: "Tidewater Coffee",
      title: "Coastal Brand Identity & Custom Shopify Storefront",
      amount: 5500,
      status: "Accepted",
      validUntil: "2026-10-15",
      scopeSummary: ["Visual Identity System", "3D Canister Renderings", "Custom Shopify Theme", "Klaviyo Flows"],
      timeline: "4 Weeks Delivery",
      createdAt: "2026-09-18",
    },
    {
      id: "prop-2",
      proposalNumber: "PROP-2026-082",
      clientId: "cli-2",
      clientName: "Elena Vance",
      company: "Meridian Clinic",
      title: "Digital Patient Experience & Automated Intake Portal",
      amount: 7200,
      status: "Sent",
      validUntil: "2026-10-05",
      scopeSummary: ["HIPAA-compliant Intake Form", "Interactive Cal.com Booking", "Next.js Patient Portal", "SMS Reminders"],
      timeline: "6 Weeks Delivery",
      createdAt: "2026-09-21",
    },
    {
      id: "prop-3",
      proposalNumber: "PROP-2026-083",
      clientId: "cli-3",
      clientName: "Marcus Brody",
      company: "Harbor Freight Logistics",
      title: "AI Logistics Dashboard & Automated Quoting Engine",
      amount: 11500,
      status: "Draft",
      validUntil: "2026-10-20",
      scopeSummary: ["Freight Matrix Algorithm", "Multi-tenant Carrier API", "Real-time Dispatch UI", "Driver PWA"],
      timeline: "8 Weeks Delivery",
      createdAt: "2026-09-22",
    },
  ];

  private contracts: Contract[] = [
    {
      id: "cont-1",
      contractNumber: "MSA-2026-014",
      clientId: "cli-1",
      clientName: "Arthur Pendelton",
      company: "Tidewater Coffee",
      title: "Master Services Agreement (MSA) & IP Assignment",
      contractType: "Master Service Agreement (MSA)",
      value: 5500,
      status: "Signed",
      signedAt: "2026-09-19 14:22 UTC",
      signerName: "Arthur Pendelton",
      signerEmail: "arthur@tidewater.coffee",
      createdAt: "2026-09-18",
    },
    {
      id: "cont-2",
      contractNumber: "SOW-2026-022",
      clientId: "cli-2",
      clientName: "Elena Vance",
      company: "Meridian Clinic",
      title: "Statement of Work (SOW): Intake Portal Build",
      contractType: "Statement of Work (SOW)",
      value: 7200,
      status: "Pending Signature",
      createdAt: "2026-09-22",
    },
    {
      id: "cont-3",
      contractNumber: "NDA-2026-009",
      clientId: "cli-3",
      clientName: "Marcus Brody",
      company: "Harbor Freight Logistics",
      title: "Mutual Non-Disclosure Agreement (NDA)",
      contractType: "NDA",
      value: 0,
      status: "Signed",
      signedAt: "2026-09-22 09:15 UTC",
      signerName: "Marcus Brody",
      signerEmail: "marcus@harborfreight.coop",
      createdAt: "2026-09-21",
    },
  ];

  private emails: EmailThread[] = [
    {
      id: "mail-1",
      sender: "Arthur Pendelton",
      senderEmail: "arthur@tidewater.coffee",
      recipient: "paks@thevirtuslabs.com",
      subject: "Feedback on the Shopify staging build & canister renders",
      preview: "Hey Paks and team, reviewed the 3D canister mockups and they look breathtaking...",
      body: "Hey Paks and team,\n\nWe thoroughly reviewed the 3D canister mockups and the mobile checkout demo. The amber accent lighting on the dark roast bag is breathtaking! Elena and I had just two small notes regarding the cart drawer upsell banner.\n\nLet's discuss on our call tomorrow at 10 AM.\n\nBest,\nArthur",
      timestamp: "Today, 10:14 AM",
      isRead: false,
      folder: "inbox",
      clientName: "Tidewater Coffee",
      isMock: true,
    },
    {
      id: "mail-2",
      sender: "Website Brief Engine",
      senderEmail: "briefs@thevirtuslabs.com",
      recipient: "leads@thevirtuslabs.com",
      subject: "New Inbound Inquiry: Nova AI Audio ($6,800)",
      preview: "New project brief submitted via interactive auto-quote builder...",
      body: "New Lead Intake Details:\n\nContact: Jackson Meyer\nCompany: Nova AI Audio\nNeeds: Brand & Creative, Web & Digital, Content Engine\nUrgency: Urgent (< 2 weeks)\nEstimated Value: $6,800\nRecommended Tier: Integrated Studio\n\nView Opportunity in Pipeline ->",
      timestamp: "Yesterday, 4:30 PM",
      isRead: true,
      folder: "inquiries",
      clientName: "Nova AI Audio",
      isMock: true,
    },
    {
      id: "mail-3",
      sender: "Dr. Elena Vance",
      senderEmail: "elena@meridianhealth.org",
      recipient: "kai@thevirtuslabs.com",
      subject: "HIPAA compliance audit checklist & brand assets",
      preview: "Hi Kai, sending over our security officer's documentation checklist...",
      body: "Hi Kai,\n\nAttaching our clinic's security compliance checklist for the intake form fields. Looking forward to our alignment session on Friday.\n\nWarm regards,\nDr. Elena Vance",
      timestamp: "Sep 22, 2:15 PM",
      isRead: true,
      folder: "inbox",
      clientName: "Meridian Clinic",
      isMock: true,
    },
  ];

  private teamPods: TeamPod[] = [
    {
      id: "pod-1",
      name: "Brand & Creative Pod",
      focusArea: "Visual Identity, Art Direction, Motion & Spatial Design",
      leaderId: "user-2",
      leaderName: "Kai",
      leaderRole: "Brand & Creative Lead",
      memberIds: ["user-2", "user-4"],
      color: "#FBD227",
      activeProjectsCount: 2,
      createdAt: "2026-09-20",
    },
    {
      id: "pod-2",
      name: "Engineering & Architecture Pod",
      focusArea: "Next.js Headless Platforms, Neon Cloud & API Integrations",
      leaderId: "user-3",
      leaderName: "Ren",
      leaderRole: "Lead Frontend Engineer",
      memberIds: ["user-3"],
      color: "#38BDF8",
      activeProjectsCount: 2,
      createdAt: "2026-09-20",
    },
    {
      id: "pod-3",
      name: "Strategy & Discovery Pod",
      focusArea: "Client Onboarding, Commercial Roadmaps & AI Sprints",
      leaderId: "user-1",
      leaderName: "Paks",
      leaderRole: "Studio Director & Owner",
      memberIds: ["user-1"],
      color: "#818CF8",
      activeProjectsCount: 3,
      createdAt: "2026-09-20",
    },
  ];

  private teamMembers: TeamMemberUser[] = [
    {
      id: "user-1",
      name: "Paks",
      roleTitle: "Studio Director & Owner",
      teamId: "pod-3",
      teamName: "Strategy & Discovery Pod",
      isLeader: true,
      email: "paks@thevirtuslabs.com",
      permission: "Owner / Admin",
      avatar: "P",
      activeProjects: ["Coastal Brand & E-Commerce Flagship", "AI Logistics Dashboard"],
      status: "Active",
    },
    {
      id: "user-2",
      name: "Kai",
      roleTitle: "Brand & Creative Lead",
      teamId: "pod-1",
      teamName: "Brand & Creative Pod",
      isLeader: true,
      email: "kai@thevirtuslabs.com",
      permission: "Pod Lead",
      avatar: "K",
      activeProjects: ["Coastal Brand & E-Commerce Flagship", "Patient Experience & Intake Portal"],
      status: "Active",
    },
    {
      id: "user-3",
      name: "Ren",
      roleTitle: "Lead Frontend Engineer",
      teamId: "pod-2",
      teamName: "Engineering & Architecture Pod",
      isLeader: true,
      email: "ren@thevirtuslabs.com",
      permission: "Specialist",
      avatar: "R",
      activeProjects: ["Coastal Brand & E-Commerce Flagship", "AI Logistics Dashboard"],
      status: "Active",
    },
    {
      id: "user-4",
      name: "Sora",
      roleTitle: "UX & Product Designer",
      teamId: "pod-1",
      teamName: "Brand & Creative Pod",
      isLeader: false,
      email: "sora@thevirtuslabs.com",
      permission: "Specialist",
      avatar: "S",
      activeProjects: ["Patient Experience & Intake Portal"],
      status: "Active",
    },
  ];

  // Sample records for demos and draft client cards. Kept active by default so the user always has
  // editable sample client cards and pipeline opportunities ready in the workspace.
  private demoSeed: DemoSeed;
  private demoLoaded = true;

  constructor() {
    this.demoSeed = structuredClone({
      opportunities: this.opportunities,
      clients: this.clients,
      projects: this.projects,
      tasks: this.tasks,
      invoices: this.invoices,
      bookings: this.bookings,
      mediaAssets: this.mediaAssets,
      activity: this.activity,
      proposals: this.proposals,
      contracts: this.contracts,
      emails: this.emails,
    });
    // Draft/sample clients and opportunities remain loaded and active by default.
  }

  public isDemoLoaded(): boolean {
    return this.demoLoaded;
  }

  /** Adds the sample records. Skips any that are already present, so it is safe to call twice. */
  public loadDemoData(): void {
    const seed = structuredClone(this.demoSeed);
    const merge = <T extends { id: string }>(current: T[], sample: T[]): T[] => [
      ...current,
      ...sample.filter((row) => !current.some((c) => c.id === row.id)),
    ];
    this.opportunities = merge(this.opportunities, seed.opportunities);
    this.clients = merge(this.clients, seed.clients);
    this.projects = merge(this.projects, seed.projects);
    this.tasks = merge(this.tasks, seed.tasks);
    this.invoices = merge(this.invoices, seed.invoices);
    this.bookings = merge(this.bookings, seed.bookings);
    this.mediaAssets = merge(this.mediaAssets, seed.mediaAssets);
    this.activity = merge(this.activity, seed.activity);
    this.proposals = merge(this.proposals, seed.proposals);
    this.contracts = merge(this.contracts, seed.contracts);
    this.emails = merge(this.emails, seed.emails);
    this.demoLoaded = true;
  }

  /**
   * Removes ONLY the sample records, matched by their fixed demo ids. Real records get random ids from uid(), so
   * they can never match. Also drops revision and approval state that belongs to the sample clients.
   */
  public clearDemoData(): number {
    const seed = this.demoSeed;
    const ids = (rows: { id: string }[]) => new Set(rows.map((r) => r.id));
    const drop = <T extends { id: string }>(current: T[], sample: { id: string }[]): T[] => {
      const demo = ids(sample);
      return current.filter((row) => !demo.has(row.id));
    };
    const before =
      this.opportunities.length + this.clients.length + this.projects.length + this.tasks.length +
      this.invoices.length + this.bookings.length + this.mediaAssets.length + this.activity.length +
      this.proposals.length + this.contracts.length + this.emails.length;

    const demoClientIds = ids(seed.clients);
    this.opportunities = drop(this.opportunities, seed.opportunities);
    this.clients = drop(this.clients, seed.clients);
    this.projects = drop(this.projects, seed.projects);
    this.tasks = drop(this.tasks, seed.tasks);
    this.invoices = drop(this.invoices, seed.invoices);
    this.bookings = drop(this.bookings, seed.bookings);
    this.mediaAssets = drop(this.mediaAssets, seed.mediaAssets);
    this.activity = drop(this.activity, seed.activity);
    this.proposals = drop(this.proposals, seed.proposals);
    this.contracts = drop(this.contracts, seed.contracts);
    this.emails = drop(this.emails, seed.emails);
    this.revisions = this.revisions.filter((r) => !demoClientIds.has(r.clientId));
    for (const id of demoClientIds) delete this.approvals[id];
    this.demoLoaded = false;

    const after =
      this.opportunities.length + this.clients.length + this.projects.length + this.tasks.length +
      this.invoices.length + this.bookings.length + this.mediaAssets.length + this.activity.length +
      this.proposals.length + this.contracts.length + this.emails.length;
    return before - after;
  }

  // Methods
  public getOverviewMetrics() {
    const pipelineValue = this.opportunities
      .filter((o) => o.stage !== "won" && o.stage !== "lost")
      .reduce((sum, o) => sum + o.dealValue, 0);

    const openLeadsCount = this.opportunities.filter(
      (o) => o.stage !== "won" && o.stage !== "lost"
    ).length;

    const activeProjectsCount = this.projects.filter(
      (p) => p.phase !== "Support"
    ).length;

    const collectedTotal = this.invoices
      .filter((i) => i.status === "Paid")
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      pipelineValue,
      openLeadsCount,
      activeProjectsCount,
      collectedTotal,
      deliveryPulse: this.projects,
      recentActivity: this.activity,
      focusTasks: this.tasks.filter((t) => t.status !== "done"),
    };
  }

  public getOpportunities(): Opportunity[] {
    return [...this.opportunities];
  }

  public removeOpportunity(id: string): void {
    this.opportunities = this.opportunities.filter((o) => o.id !== id);
  }

  public addOpportunity(opp: Omit<Opportunity, "id" | "createdAt">): Opportunity {
    const newOpp: Opportunity = {
      ...opp,
      id: uid("opp"),
      createdAt: new Date().toISOString(),
    };
    this.opportunities.unshift(newOpp);

    this.activity.unshift({
      id: uid("act"),
      description: `New website brief received from ${opp.name} (${opp.company}) — $${opp.dealValue}`,
      category: "lead",
      timestamp: "Just now",
    });

    return newOpp;
  }

  public updateOpportunityStage(id: string, stage: Opportunity["stage"]): Opportunity | null {
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) return null;

    const oldStage = opp.stage;
    opp.stage = stage;

    this.activity.unshift({
      id: uid("act"),
      description: `Opportunity "${opp.company}" moved from ${oldStage} → ${stage}`,
      category: "lead",
      timestamp: "Just now",
    });

    // Auto-convert to Client & Project when marked "won"
    if (stage === "won" && oldStage !== "won") {
      const newClientId = uid("cli");
      const newClient: Client = {
        id: newClientId,
        name: opp.name,
        company: opp.company,
        email: opp.email,
        status: "Active",
        totalRevenue: opp.dealValue,
        activeProjectsCount: 1,
        portalTokenHash: null,
        portalTokenLast4: null,
        portalTokenExpiresAt: null,
        portalTokenRevokedAt: null,
        createdAt: new Date().toISOString(),
      };
      this.clients.unshift(newClient);

      const newProject: Project = {
        id: uid("proj"),
        clientId: newClientId,
        clientName: opp.company,
        title: `${opp.company} - ${opp.recommendedTier} System`,
        phase: "Discover",
        progress: 10,
        riskLevel: "On Track",
        budget: opp.dealValue,
        startDate: new Date().toISOString().split("T")[0],
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };
      this.projects.unshift(newProject);

      this.activity.unshift({
        id: uid("act"),
        description: `Client account & project created for ${opp.company}!`,
        category: "project",
        timestamp: "Just now",
      });
    }

    return opp;
  }

  public updateOpportunity(id: string, updates: Partial<Opportunity>): Opportunity | null {
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) return null;
    if (updates.stage && updates.stage !== opp.stage) {
      this.updateOpportunityStage(id, updates.stage);
    }
    Object.assign(opp, updates);
    return opp;
  }

  public getProjects(): Project[] {
    return [...this.projects];
  }

  public getProjectById(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  public updateProject(id: string, updates: Partial<Omit<Project, "id">>): Project | null {
    const project = this.projects.find((p) => p.id === id);
    if (!project) return null;
    Object.assign(project, updates);
    this.activity.unshift({
      id: uid("act"),
      description: `Project updated: '${project.title}' (${project.progress}% progress)`,
      category: "project",
      timestamp: "Just now",
    });
    return project;
  }

  public getTasks(): Task[] {
    return [...this.tasks];
  }

  public updateTaskStatus(id: string, status: Task["status"]): Task | null {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.status = status;
    return task;
  }

  public addTask(task: Omit<Task, "id">): Task {
    const newTask: Task = {
      ...task,
      id: uid("task"),
    };
    this.tasks.push(newTask);
    this.activity.unshift({
      id: uid("act"),
      description: `Task created: '${task.title}' (${task.assignee})`,
      category: "task",
      timestamp: "Just now",
    });
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Omit<Task, "id">>): Task | null {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    Object.assign(task, updates);
    this.activity.unshift({
      id: uid("act"),
      description: `Task updated: '${task.title}'`,
      category: "task",
      timestamp: "Just now",
    });
    return task;
  }

  public deleteTask(id: string): boolean {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    return true;
  }

  public getMediaAssets(clientId?: string | null): MediaAsset[] {
    if (clientId === undefined) {
      return [...this.mediaAssets];
    }
    return this.mediaAssets.filter((m) => m.clientId === clientId);
  }

  public addMediaAsset(asset: Omit<MediaAsset, "id" | "createdAt">): MediaAsset {
    const newAsset: MediaAsset = {
      ...asset,
      id: uid("med"),
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.mediaAssets.unshift(newAsset);

    this.activity.unshift({
      id: uid("act"),
      description: `Asset uploaded: ${asset.filename} (${asset.fileSize})`,
      category: "media",
      timestamp: "Just now",
    });

    return newAsset;
  }

  public getClients(): Client[] {
    return [...this.clients];
  }

  public getClientById(id: string): Client | undefined {
    return this.clients.find((c) => c.id === id);
  }

  public getClientByTokenHash(hash: string): Client | undefined {
    return this.clients.find((c) => c.portalTokenHash !== null && c.portalTokenHash === hash);
  }

  /** Stores a freshly issued token hash and revokes nothing else: the old hash is simply replaced. */
  public setClientToken(
    id: string,
    token: { hash: string; last4: string; expiresAt: string }
  ): Client | null {
    const client = this.clients.find((c) => c.id === id);
    if (!client) return null;
    client.portalTokenHash = token.hash;
    client.portalTokenLast4 = token.last4;
    client.portalTokenExpiresAt = token.expiresAt;
    client.portalTokenRevokedAt = null;
    return client;
  }

  public getRevisions(clientId: string): RevisionTicket[] {
    return this.revisions.filter((r) => r.clientId === clientId);
  }

  public addRevision(
    ticket: Omit<RevisionTicket, "id" | "round" | "submittedAt">,
    assigned?: { id: string; round: number }
  ): RevisionTicket {
    const round = assigned?.round ?? this.getRevisions(ticket.clientId).length + 1;
    const created: RevisionTicket = {
      ...ticket,
      id: assigned?.id ?? uid(`REV-${new Date().getFullYear()}`).toUpperCase(),
      round,
      submittedAt: new Date().toISOString(),
    };
    this.revisions.unshift(created);
    this.approvals[ticket.clientId] = "changes_requested";
    this.activity.unshift({
      id: uid("act"),
      description: `Revision round ${round} requested by ${ticket.submittedBy} (${created.id})`,
      category: "milestone",
      timestamp: "Just now",
    });
    return created;
  }

  public getApproval(clientId: string): ApprovalStatus {
    return this.approvals[clientId] ?? "pending";
  }

  public setApproval(clientId: string, status: ApprovalStatus): ApprovalStatus {
    this.approvals[clientId] = status;
    this.activity.unshift({
      id: uid("act"),
      description: `Deliverable approval set to "${status}" by client ${clientId}`,
      category: "milestone",
      timestamp: "Just now",
    });
    return status;
  }

  public getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  public getBookings(): Booking[] {
    return [...this.bookings];
  }

  public addBooking(booking: Omit<Booking, "id" | "createdAt">): Booking {
    const newBooking: Booking = {
      ...booking,
      id: uid("book"),
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.bookings.unshift(newBooking);

    this.activity.unshift({
      id: uid("act"),
      description: `New booking scheduled: ${newBooking.bookingType} with ${newBooking.clientName} (${newBooking.company})`,
      category: "milestone",
      timestamp: "Just now",
    });

    return newBooking;
  }

  public updateBookingStatus(id: string, status: Booking["status"]): Booking | null {
    return this.updateBooking(id, { status });
  }

  public updateBooking(id: string, updates: Partial<Booking>): Booking | null {
    const b = this.bookings.find((item) => item.id === id);
    if (!b) return null;
    Object.assign(b, updates);
    this.activity.unshift({
      id: uid("act"),
      description: `Booking updated: ${b.bookingType} with ${b.clientName} (${b.status})`,
      category: "milestone",
      timestamp: "Just now",
    });
    return b;
  }

  public addClient(
    client: Omit<Client, "id" | "createdAt" | "totalRevenue" | "activeProjectsCount" | "portalTokenRevokedAt">
  ): Client {
    const newClient: Client = {
      ...client,
      id: uid("cli"),
      portalTokenRevokedAt: null,
      totalRevenue: 0,
      activeProjectsCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.clients.unshift(newClient);
    this.activity.unshift({
      id: uid("act"),
      description: `New client added: ${newClient.name} (${newClient.company})`,
      category: "lead",
      timestamp: "Just now",
    });
    return newClient;
  }

  public updateClient(id: string, updates: Partial<Client>): Client | null {
    const client = this.clients.find((c) => c.id === id);
    if (!client) return null;
    Object.assign(client, updates);
    this.activity.unshift({
      id: uid("act"),
      description: `Client card updated: ${client.company} (${client.name})`,
      category: "project",
      timestamp: "Just now",
    });
    return client;
  }

  public removeClient(id: string): boolean {
    const idx = this.clients.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    const [removed] = this.clients.splice(idx, 1);
    this.activity.unshift({
      id: uid("act"),
      description: `Client removed: ${removed.company}`,
      category: "project",
      timestamp: "Just now",
    });
    return true;
  }

  public markInvoicePaid(id: string): Invoice | null {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv || inv.status === "Paid") return inv ?? null;
    inv.status = "Paid";
    inv.paidAt = new Date().toISOString().slice(0, 10);
    this.activity.unshift({
      id: uid("act"),
      description: `Invoice paid: ${inv.invoiceNumber} (${inv.clientName})`,
      category: "invoice",
      timestamp: "Just now",
    });
    return inv;
  }

  public addInvoice(invoice: Omit<Invoice, "id">): Invoice {
    const newInvoice: Invoice = {
      ...invoice,
      id: uid("inv"),
    };
    this.invoices.unshift(newInvoice);
    this.activity.unshift({
      id: uid("act"),
      description: `Invoice issued: ${newInvoice.invoiceNumber} for $${newInvoice.amount.toLocaleString()} to ${newInvoice.clientName}`,
      category: "invoice",
      timestamp: "Just now",
    });
    return newInvoice;
  }

  public getProposals(): Proposal[] {
    return [...this.proposals];
  }

  public addProposal(prop: Omit<Proposal, "id" | "createdAt">): Proposal {
    const newProp: Proposal = {
      ...prop,
      id: uid("prop"),
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.proposals.unshift(newProp);
    this.activity.unshift({
      id: uid("act"),
      description: `Proposal generated: ${newProp.proposalNumber} (${newProp.title}) for $${newProp.amount.toLocaleString()}`,
      category: "proposal",
      timestamp: "Just now",
    });
    return newProp;
  }

  public updateProposalStatus(id: string, status: Proposal["status"]): Proposal | null {
    if (status === "Accepted") {
      const res = this.acceptProposal(id);
      return res ? res.proposal : null;
    }
    const p = this.proposals.find((item) => item.id === id);
    if (!p) return null;
    p.status = status;
    return p;
  }

  public updateProposal(id: string, updates: Partial<Omit<Proposal, "id">>): Proposal | null {
    const p = this.proposals.find((item) => item.id === id);
    if (!p) return null;

    const previousStatus = p.status;
    Object.assign(p, updates);

    if (updates.status === "Accepted" && previousStatus !== "Accepted") {
      this.acceptProposal(id);
    } else {
      this.activity.unshift({
        id: uid("act"),
        description: `Proposal updated: ${p.proposalNumber} (${p.title})`,
        category: "proposal",
        timestamp: "Just now",
      });
    }

    return p;
  }

  public deleteProposal(id: string): boolean {
    const idx = this.proposals.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    const [removed] = this.proposals.splice(idx, 1);
    this.activity.unshift({
      id: uid("act"),
      description: `Proposal deleted: ${removed.proposalNumber} (${removed.title})`,
      category: "proposal",
      timestamp: "Just now",
    });
    return true;
  }

  public acceptProposal(id: string): { proposal: Proposal; project: Project; invoice: Invoice } | null {
    const p = this.proposals.find((item) => item.id === id);
    if (!p) return null;
    p.status = "Accepted";

    // Auto-create or activate Project
    let project = this.projects.find((proj) => proj.clientId === p.clientId);
    if (!project) {
      project = {
        id: uid("proj"),
        clientId: p.clientId,
        clientName: p.company,
        title: p.title,
        phase: "Discover",
        progress: 10,
        riskLevel: "On Track",
        budget: p.amount,
        startDate: new Date().toISOString().slice(0, 10),
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      };
      this.projects.unshift(project);
    } else {
      project.budget = p.amount;
      project.phase = "Discover";
      project.progress = Math.max(project.progress, 15);
    }

    // Auto-create Kickoff Invoice (50% deposit)
    const invNumber = `INV-${new Date().getFullYear()}-${String(this.invoices.length + 1).padStart(3, "0")}`;
    const invoice: Invoice = {
      id: uid("inv"),
      invoiceNumber: invNumber,
      clientId: p.clientId,
      clientName: p.clientName,
      company: p.company,
      amount: p.amount * 0.5,
      status: "Pending",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    };
    this.invoices.unshift(invoice);

    // Update Client metrics
    const client = this.clients.find((c) => c.id === p.clientId);
    if (client) {
      client.status = "Active";
      client.activeProjectsCount = (client.activeProjectsCount || 0) + 1;
      client.totalRevenue = (client.totalRevenue || 0) + p.amount;
    }

    this.activity.unshift({
      id: uid("act"),
      description: `Proposal ${p.proposalNumber} accepted by ${p.company}! Active project initiated & deposit invoice issued.`,
      category: "proposal",
      timestamp: "Just now",
    });

    return { proposal: p, project, invoice };
  }

  public getContracts(): Contract[] {
    return [...this.contracts];
  }

  public addContract(cont: Omit<Contract, "id" | "createdAt">): Contract {
    const newCont: Contract = {
      ...cont,
      id: uid("cont"),
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.contracts.unshift(newCont);
    this.activity.unshift({
      id: uid("act"),
      description: `Contract drafted: ${newCont.contractNumber} (${newCont.title})`,
      category: "contract",
      timestamp: "Just now",
    });
    return newCont;
  }

  public signContract(id: string, signerName: string, signerEmail: string): Contract | null {
    const c = this.contracts.find((item) => item.id === id);
    if (!c) return null;
    c.status = "Signed";
    c.signerName = signerName;
    c.signerEmail = signerEmail;
    c.signedAt = `${new Date().toISOString().replace("T", " ").substring(0, 16)} UTC`;
    this.activity.unshift({
      id: uid("act"),
      description: `Contract executed & e-signed: ${c.contractNumber} by ${signerName}`,
      category: "contract",
      timestamp: "Just now",
    });
    return c;
  }

  public getEmailThreads(): EmailThread[] {
    return [...this.emails];
  }

  public sendEmail(email: Omit<EmailThread, "id" | "timestamp" | "isRead">): EmailThread {
    const newEmail: EmailThread = {
      ...email,
      id: uid("mail"),
      timestamp: "Just now",
      isRead: true,
      messages: email.messages || [
        {
          id: uid("msg"),
          sender: email.sender,
          senderEmail: email.senderEmail,
          recipient: email.recipient,
          body: email.body,
          timestamp: "Just now",
        },
      ],
    };
    this.emails.unshift(newEmail);
    return newEmail;
  }

  public toggleStar(threadId: string): boolean {
    const thread = this.emails.find((e) => e.id === threadId);
    if (!thread) return false;
    thread.starred = !thread.starred;
    return thread.starred;
  }

  public setEmailRead(threadId: string, isRead: boolean = true): boolean {
    const thread = this.emails.find((e) => e.id === threadId);
    if (!thread) return false;
    thread.isRead = isRead;
    return true;
  }

  public markAllEmailsRead(folder?: string): void {
    for (const thread of this.emails) {
      if (!folder || thread.folder === folder || (folder === "inbox" && (thread.folder === "inbox" || thread.folder === "inquiries"))) {
        thread.isRead = true;
      }
    }
  }

  public addReplyToThread(
    threadId: string,
    reply: { sender: string; senderEmail: string; recipient: string; body: string }
  ): EmailThread | null {
    const thread = this.emails.find((e) => e.id === threadId);
    if (!thread) return null;

    const newMsg: EmailMessage = {
      id: uid("msg"),
      sender: reply.sender,
      senderEmail: reply.senderEmail,
      recipient: reply.recipient,
      body: reply.body,
      timestamp: "Just now",
    };

    if (!thread.messages) {
      thread.messages = [
        {
          id: uid("msg-orig"),
          sender: thread.sender,
          senderEmail: thread.senderEmail,
          recipient: thread.recipient,
          body: thread.body,
          timestamp: thread.timestamp,
        },
      ];
    }

    thread.messages.push(newMsg);
    thread.preview = reply.body.substring(0, 70) + "...";
    thread.timestamp = "Just now";
    return thread;
  }

  public syncIncomingEmails(incoming: EmailThread[]): void {
    for (const inc of incoming) {
      const existing = this.emails.find(
        (e) => (e.messageId && inc.messageId && e.messageId === inc.messageId) ||
               (e.subject.toLowerCase() === inc.subject.toLowerCase() && e.senderEmail === inc.senderEmail)
      );

      if (!existing) {
        this.emails.unshift(inc);
      }
    }
  }

  public clearMockEmails(): void {
    this.emails = this.emails.filter((e) => !e.isMock);
  }

  public deleteEmail(id: string): boolean {
    const idx = this.emails.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    this.emails.splice(idx, 1);
    return true;
  }

  public getTeamMembers(): TeamMemberUser[] {
    return [...this.teamMembers];
  }

  public addTeamMember(member: Omit<TeamMemberUser, "id">): TeamMemberUser {
    const newMember: TeamMemberUser = {
      ...member,
      id: uid("user"),
    };
    this.teamMembers.push(newMember);

    // If attached to a pod, update the pod's memberIds
    if (newMember.teamId) {
      const pod = this.teamPods.find((p) => p.id === newMember.teamId);
      if (pod && !pod.memberIds.includes(newMember.id)) {
        pod.memberIds.push(newMember.id);
      }
    }

    this.activity.unshift({
      id: uid("act"),
      description: `Team member added: ${newMember.name} (${newMember.roleTitle})`,
      category: "project",
      timestamp: "Just now",
    });

    return newMember;
  }

  public updateTeamMember(id: string, updates: Partial<TeamMemberUser>): TeamMemberUser | null {
    const member = this.teamMembers.find((m) => m.id === id);
    if (!member) return null;

    Object.assign(member, updates);

    // If role/team changed, ensure pod memberIds sync
    if (updates.teamId !== undefined) {
      for (const pod of this.teamPods) {
        if (pod.id === updates.teamId) {
          if (!pod.memberIds.includes(id)) pod.memberIds.push(id);
        } else {
          pod.memberIds = pod.memberIds.filter((mId) => mId !== id);
        }
      }
    }

    this.activity.unshift({
      id: uid("act"),
      description: `Team member updated: ${member.name} (${member.roleTitle})`,
      category: "project",
      timestamp: "Just now",
    });

    return member;
  }

  public deleteTeamMember(id: string): boolean {
    const idx = this.teamMembers.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    const [removed] = this.teamMembers.splice(idx, 1);
    for (const pod of this.teamPods) {
      pod.memberIds = pod.memberIds.filter((mId) => mId !== id);
    }
    this.activity.unshift({
      id: uid("act"),
      description: `Team member removed: ${removed.name}`,
      category: "project",
      timestamp: "Just now",
    });
    return true;
  }

  // --- Pod / Team Management ---

  public getTeams(): TeamPod[] {
    return [...this.teamPods];
  }

  public getTeamById(id: string): TeamPod | undefined {
    return this.teamPods.find((p) => p.id === id);
  }

  public addTeam(pod: Omit<TeamPod, "id" | "createdAt">): TeamPod {
    const newPod: TeamPod = {
      ...pod,
      id: uid("pod"),
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.teamPods.push(newPod);

    // Assign leader's teamId and isLeader
    const leader = this.teamMembers.find((m) => m.id === newPod.leaderId);
    if (leader) {
      leader.teamId = newPod.id;
      leader.teamName = newPod.name;
      leader.isLeader = true;
    }

    this.activity.unshift({
      id: uid("act"),
      description: `New pod created: ${newPod.name} (Lead: ${newPod.leaderName})`,
      category: "project",
      timestamp: "Just now",
    });

    return newPod;
  }

  public updateTeam(id: string, updates: Partial<TeamPod>): TeamPod | null {
    const pod = this.teamPods.find((p) => p.id === id);
    if (!pod) return null;

    Object.assign(pod, updates);

    // If leader changed, update team members accordingly
    if (updates.leaderId) {
      for (const m of this.teamMembers) {
        if (m.teamId === pod.id) {
          m.isLeader = m.id === updates.leaderId;
        }
      }
    }

    this.activity.unshift({
      id: uid("act"),
      description: `Pod updated: ${pod.name} (Lead: ${pod.leaderName})`,
      category: "project",
      timestamp: "Just now",
    });

    return pod;
  }

  public deleteTeam(id: string): boolean {
    const idx = this.teamPods.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const [removed] = this.teamPods.splice(idx, 1);
    for (const m of this.teamMembers) {
      if (m.teamId === id) {
        m.teamId = undefined;
        m.teamName = undefined;
        m.isLeader = false;
      }
    }
    this.activity.unshift({
      id: uid("act"),
      description: `Pod dismantled: ${removed.name}`,
      category: "project",
      timestamp: "Just now",
    });
    return true;
  }
}

// Global singleton instance (shared across route bundles in dev)
const globalForDb = globalThis as unknown as { __agencyDb?: AgencyDatabase };
export const db = globalForDb.__agencyDb ?? (globalForDb.__agencyDb = new AgencyDatabase());
