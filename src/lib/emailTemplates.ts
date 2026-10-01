export interface AutomatedEmailTemplate {
  id: string;
  name: string;
  category: "Lead Acquisition" | "Commercial & Billing" | "Sprint Delivery" | "Custom";
  description: string;
  triggerEvent: string;
  subject: string;
  body: string;
  enabled: boolean;
  variables: string[];
  isCustom?: boolean;
}

export const DEFAULT_TEMPLATES: Record<string, AutomatedEmailTemplate> = {
  brief_confirmation: {
    id: "brief_confirmation",
    name: "Client Brief Auto-Responder",
    category: "Lead Acquisition",
    description: "Sent automatically to the prospect when they submit an inquiry or project brief on the website.",
    triggerEvent: "When a visitor submits the 'Start a Project' brief form",
    subject: "Received: Your Project Brief with The Virtus Labs",
    body: `Hello {{clientName}},

Thank you for reaching out to The Virtus Labs. We have received your project brief for {{company}}.

Our team is currently reviewing your scope and strategic requirements for {{service}}. A designated pod lead will review your objectives and reach out within 24 business hours.

In the meantime, you can explore our case studies and live work at https://thevirtuslabs.com.

Best regards,
The Virtus Labs Team
hello@thevirtuslabs.com · thevirtuslabs.com`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{service}}", "{{timeline}}", "{{budget}}"],
  },

  booking_confirmation: {
    id: "booking_confirmation",
    name: "Discovery Call Booking Confirmation",
    category: "Lead Acquisition",
    description: "Sent automatically to the client when they schedule a discovery call on your website calendar.",
    triggerEvent: "When a prospect books an appointment on the site calendar",
    subject: "Confirmed: Discovery Strategy Session with The Virtus Labs",
    body: `Hello {{clientName}},

Your discovery strategy session with The Virtus Labs has been confirmed!

Session Details:
• Company: {{company}}
• Date: {{bookingDate}}
• Time: {{bookingTime}}
• Video Link: {{meetingUrl}}
• Host / Pod Lead: {{hostName}}

Call Agenda:
1. Diagnose current business bottlenecks & tech architecture
2. Clarify scope, deliverables, and target launch timeline
3. Formulate tailored strategic recommendations

If you need to reschedule or invite additional team members, please reply directly to this email.

We look forward to speaking with you!

Best regards,
The Virtus Labs
hello@thevirtuslabs.com · thevirtuslabs.com`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{bookingDate}}", "{{bookingTime}}", "{{meetingUrl}}", "{{hostName}}"],
  },

  call_reminder: {
    id: "call_reminder",
    name: "24-Hour Discovery Call Reminder",
    category: "Lead Acquisition",
    description: "Dispatched 24 hours prior to a scheduled strategy session to maximize call attendance.",
    triggerEvent: "24 hours before a confirmed discovery meeting",
    subject: "Reminder: Tomorrow's Strategy Session with The Virtus Labs",
    body: `Hello {{clientName}},

This is a quick reminder regarding our scheduled discovery session tomorrow:

• Meeting Time: {{bookingTime}} ({{bookingDate}})
• Direct Video Room: {{meetingUrl}}
• Host: {{hostName}}

Please ensure you have any existing brand assets, Figma files, or technical specs handy if applicable. Feel free to forward this invitation to any co-founders or key stakeholders attending.

See you tomorrow!

Best regards,
The Virtus Labs Team
hello@thevirtuslabs.com · thevirtuslabs.com`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{bookingDate}}", "{{bookingTime}}", "{{meetingUrl}}", "{{hostName}}"],
  },

  proposal_sent: {
    id: "proposal_sent",
    name: "Formal Strategic Proposal & SOW Dispatched",
    category: "Commercial & Billing",
    description: "Sent when an admin or pod lead dispatches a tailored commercial proposal to the prospect.",
    triggerEvent: "When a proposal is moved to 'Sent' in the Proposals Engine",
    subject: "Proposal Prepared: {{company}} Strategic Engagement ({{dealValue}})",
    body: `Hello {{clientName}},

Following our discovery analysis, we have prepared your tailored engagement proposal for {{company}}.

Summary of Scope:
• Recommended Tier: {{service}}
• Estimated Investment: {{dealValue}}
• Target Delivery Sprint: {{timeline}}

You can review the full proposal breakdown, milestone deliverables, and terms here:
{{proposalUrl}}

This proposal is valid until {{validUntil}}. Please reply with any questions or adjustments you'd like our pod lead to make.

Best regards,
{{hostName}}
The Virtus Labs · Architectural Digital Systems`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{service}}", "{{dealValue}}", "{{timeline}}", "{{proposalUrl}}", "{{validUntil}}", "{{hostName}}"],
  },

  contract_ready: {
    id: "contract_ready",
    name: "Statement of Work (SOW) Ready for E-Signature",
    category: "Commercial & Billing",
    description: "Sent when an engagement agreement or MSA is generated and awaiting client execution.",
    triggerEvent: "When a contract is sent for signature in the Contracts Vault",
    subject: "Action Required: Review & Sign Engagement Agreement for {{company}}",
    body: `Hello {{clientName}},

Your Master Service Agreement & Statement of Work for {{company}} is now prepared for secure digital execution.

Agreement Details:
• Document: {{contractTitle}}
• Engagement Value: {{dealValue}}

Please review and execute your agreement via our secure portal:
{{signingUrl}}

Upon signature, our pod lead will initiate your onboarding and grant access to your private client portal.

Warm regards,
The Virtus Labs Executive Team
hello@thevirtuslabs.com`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{contractTitle}}", "{{dealValue}}", "{{signingUrl}}"],
  },

  invoice_issued: {
    id: "invoice_issued",
    name: "Milestone Invoice Issued",
    category: "Commercial & Billing",
    description: "Sent automatically when a project kickoff deposit or sprint milestone invoice is generated.",
    triggerEvent: "When an invoice is issued in the Accounting & Billing view",
    subject: "Invoice {{invoiceNumber}} Issued for {{company}} ({{invoiceAmount}})",
    body: `Hello {{clientName}},

Invoice {{invoiceNumber}} has been generated for your active engagement with The Virtus Labs.

Invoice Breakdown:
• Invoice Number: {{invoiceNumber}}
• Amount Due: {{invoiceAmount}}
• Payment Due Date: {{dueDate}}

View and settle this invoice via credit card, ACH, or wire:
{{invoiceUrl}}

Thank you for your partnership!

Best regards,
Accounting & Finance
The Virtus Labs · billing@thevirtuslabs.com`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{invoiceNumber}}", "{{invoiceAmount}}", "{{dueDate}}", "{{invoiceUrl}}"],
  },

  upsell_confirmation: {
    id: "upsell_confirmation",
    name: "Accelerated Sprint Upsell Confirmation",
    category: "Commercial & Billing",
    description: "Sent to the client when they add an accelerated sprint add-on to their initial project scope.",
    triggerEvent: "When a prospect accepts an upsell add-on after brief submission",
    subject: "Updated Scope: Accelerated Sprint Added for {{company}}",
    body: `Hello {{clientName}},

We have added your selected Accelerated Sprint add-on ({{upsellName}}) to your active project brief for {{company}}.

Your updated estimated project investment is {{dealValue}}. Our engineering and design leads will factor this into your preliminary scope of work.

Best regards,
The Virtus Labs Team
hello@thevirtuslabs.com · thevirtuslabs.com`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{upsellName}}", "{{dealValue}}"],
  },

  project_kickoff: {
    id: "project_kickoff",
    name: "Sprint Kickoff & Client Portal Access",
    category: "Sprint Delivery",
    description: "Sent to the client once the contract is signed to welcome them and provide portal access credentials.",
    triggerEvent: "When an opportunity is moved to 'Won' and project kicks off",
    subject: "Welcome to The Virtus Labs: Project Kickoff & Portal Access for {{company}}",
    body: `Hello {{clientName}},

Welcome to The Virtus Labs! We are thrilled to officially kick off production for {{company}}.

Your project pod has been assembled and your dedicated Pod Lead is {{hostName}}.

Your Private Client Portal:
• Portal URL: {{portalUrl}}
• One-Time Access Token: {{accessToken}}

Inside your portal you can review real-time sprint milestones, submit revision tickets, and download high-resolution project deliverables.

Our team will share our first progress demo within 3 business days.

Warm regards,
{{hostName}} & The Virtus Labs Studio Pod`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{hostName}}", "{{portalUrl}}", "{{accessToken}}"],
  },

  deliverable_review: {
    id: "deliverable_review",
    name: "Milestone Deliverables Ready for Approval",
    category: "Sprint Delivery",
    description: "Sent when design or engineering deliverables are uploaded and ready for client feedback.",
    triggerEvent: "When milestone deliverables are marked 'Ready for Review'",
    subject: "Review Ready: Milestone Deliverables for {{company}} ({{milestoneName}})",
    body: `Hello {{clientName}},

Our pod has completed the deliverables for {{milestoneName}} on the {{company}} engagement.

Preview & Sign-Off:
You can review the interactive prototypes, design systems, and staged deployment here:
{{reviewUrl}}

If you would like to request any modifications, you can submit revision tickets directly through the portal or reply to this email.

Best regards,
{{hostName}}
The Virtus Labs Studio Pod`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{milestoneName}}", "{{reviewUrl}}", "{{hostName}}"],
  },

  internal_alert: {
    id: "internal_alert",
    name: "Internal Team Inbound Alert",
    category: "Lead Acquisition",
    description: "Sent to hello@thevirtuslabs.com and assigned Role Leaders whenever a new inquiry or call is booked.",
    triggerEvent: "When a new lead or calendar booking is registered",
    subject: "🔔 Inbound Activity: {{clientName}} ({{company}}) — {{dealValue}}",
    body: `Team Alert,

A new commercial event has been recorded on the website:

• Client Name: {{clientName}}
• Company: {{company}}
• Email: {{clientEmail}}
• Phone: {{phone}}
• Service Pillar: {{service}}
• Estimated Value: {{dealValue}}
• Event / Context: {{bottleneck}}

Inspect the 360° Prospect Profile in the Operations OS:
https://thevirtuslabs.com/admin#leads

The Virtus Labs OS`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{clientEmail}}", "{{phone}}", "{{service}}", "{{dealValue}}", "{{bottleneck}}"],
  },
};

// In-memory runtime cache for templates
const g = globalThis as unknown as { __emailTemplates?: Record<string, AutomatedEmailTemplate> };
const store = g.__emailTemplates ?? (g.__emailTemplates = { ...DEFAULT_TEMPLATES });

export function getAutomatedTemplates(): AutomatedEmailTemplate[] {
  return Object.values(store);
}

export function getAutomatedTemplate(id: string): AutomatedEmailTemplate {
  return store[id] || DEFAULT_TEMPLATES[id];
}

export function saveAutomatedTemplate(template: AutomatedEmailTemplate): void {
  store[template.id] = { ...template };
}

export function deleteAutomatedTemplate(id: string): boolean {
  if (store[id]) {
    delete store[id];
    return true;
  }
  return false;
}

export function renderTemplate(
  template: AutomatedEmailTemplate,
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    subject = subject.replace(pattern, value);
    body = body.replace(pattern, value);
  }

  return { subject, body };
}
