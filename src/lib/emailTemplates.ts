export interface AutomatedEmailTemplate {
  id: "brief_confirmation" | "booking_confirmation" | "internal_alert" | "upsell_confirmation";
  name: string;
  description: string;
  triggerEvent: string;
  subject: string;
  body: string;
  enabled: boolean;
  variables: string[];
}

export const DEFAULT_TEMPLATES: Record<string, AutomatedEmailTemplate> = {
  brief_confirmation: {
    id: "brief_confirmation",
    name: "Client Brief Auto-Responder",
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

  internal_alert: {
    id: "internal_alert",
    name: "Internal Team Inbound Alert",
    description: "Sent to hello@thevirtuslabs.com and assigned Role Leaders whenever a new inquiry or call is booked.",
    triggerEvent: "When a new lead or calendar booking is registered",
    subject: "🔔 New Inbound Lead: {{clientName}} ({{company}}) — {{dealValue}}",
    body: `Team Alert,

A new inbound opportunity has been captured on the website:

• Client Name: {{clientName}}
• Company: {{company}}
• Email: {{clientEmail}}
• Phone: {{phone}}
• Service Pillar: {{service}}
• Estimated Value: {{dealValue}}
• Stated Bottleneck: {{bottleneck}}

Inspect the 360° Prospect Profile in the Operations OS:
https://thevirtuslabs.com/admin#leads

The Virtus Labs OS`,
    enabled: true,
    variables: ["{{clientName}}", "{{company}}", "{{clientEmail}}", "{{phone}}", "{{service}}", "{{dealValue}}", "{{bottleneck}}"],
  },

  upsell_confirmation: {
    id: "upsell_confirmation",
    name: "Accelerated Sprint Upsell Confirmation",
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
