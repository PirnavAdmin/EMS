// const escapeHtml = (value = "") =>
//   String(value).replace(/[&<>"']/g, (character) => ({
//     "&": "&amp;",
//     "<": "&lt;",
//     ">": "&gt;",
//     '"': "&quot;",
//     "'": "&#39;",
//   })[character]);

// export const getClientAcknowledgementTemplate = (request) => ({
//   subject: `We received your demo request - ${request.companyName}`,
//   text: `Hello ${request.fullName},\n\nThank you for requesting a demo of our EMS platform. Our team will review your requirements and contact you to confirm a suitable time.\n\nRequest ID: ${request.id}\nPreferred date: ${request.preferredDemoDate}\nPreferred time: ${request.preferredTime}\n\nRegards,\nThe EMS Team`,
// });

// export const getAdminReplyTemplate = (request) => ({
//   subject: `Re: Demo Request – ${request.companyName}`,
//   message: `Hello ${request.fullName},\n\nThank you for reaching out to us about ${request.companyName}. We would be happy to provide a personalized demonstration of our EMS platform. Our team will coordinate with you regarding your preferred time of ${request.preferredTime} on ${request.preferredDemoDate}.\n\nPlease let us know if you have any questions or would like to share additional context before the session.\n\nBest regards,\nEMS Demo Team`,
// });

// export const getAdminNotificationTemplate = (request) => ({
//   subject: `New demo request: ${request.companyName} (${request.id})`,
//   text: [
//     `A new demo request has been submitted.`,
//     `Request ID: ${request.id}`,
//     `Client: ${request.fullName} (${request.workEmail})`,
//     `Phone: ${request.phoneNumber}`,
//     `Company: ${request.companyName}`,
//     `Designation: ${request.designation}`,
//     `Industry: ${request.industry}`,
//     `Company size: ${request.companySize}`,
//     `Modules: ${(request.interestedModules || []).join(", ")}`,
//     `Preferred demo: ${request.preferredDemoDate} at ${request.preferredTime}`,
//     `Additional requirements: ${request.message || "None"}`,
//     `Submitted at: ${request.submittedAt}`,
//   ].join("\n"),
//   action: { label: "Reply to Client", requestId: request.id },
// });

// export const getReplyEmailPayload = (request, reply) => ({
//   to: request.workEmail,
//   subject: reply.subject,
//   text: reply.message,
//   inReplyTo: request.emailThreadId || null,
//   references: request.emailThreadId ? [request.emailThreadId] : [],
//   originalRequest: Object.fromEntries(
//     Object.entries(request).filter(([key]) => key !== "replies")
//   ),
// });

// export const renderEmailTextAsHtml = (text) =>
//   `<div>${escapeHtml(text).replace(/\r?\n/g, "<br>")}</div>`;
const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

export const getClientAcknowledgementTemplate = (request) => ({
  subject: `We received your demo request - ${request.companyName}`,
  text: `Hello ${request.fullName},\n\nThank you for requesting a demo of our EMS platform. Our team will review your requirements and contact you to confirm a suitable time.\n\nRequest ID: ${request.id}\nPreferred date: ${request.preferredDemoDate}\nPreferred time: ${request.preferredTime}\n\nRegards,\nThe Peoplehrsync Team`,
});

export const getAdminReplyTemplate = (request) => {
  const preferredDemoDate = String(request.preferredDemoDate ?? "").trim();

  return {
    message: [
      `We would be happy to provide a personalized demonstration of our EMS platform. ${
        preferredDemoDate
          ? `Our team will coordinate with you regarding your preferred demo date ${preferredDemoDate}.`
          : "Our team will coordinate with you to arrange a suitable demo date."
      }`,
        "Please let us know if you have any questions or would like to share additional context before the session.",
    ].join("\n\n"),
  };
};

export const getAdminNotificationTemplate = (request) => ({
  subject: `New demo request: ${request.companyName} (${request.id})`,
  text: [
    `A new demo request has been submitted.`,
    `Request ID: ${request.id}`,
    `Client: ${request.fullName} (${request.workEmail})`,
    `Phone: ${request.phoneNumber}`,
    `Company: ${request.companyName}`,
    `Designation: ${request.designation}`,
    `Industry: ${request.industry}`,
    `Company size: ${request.companySize}`,
    `Modules: ${(request.interestedModules || []).join(", ")}`,
    `Preferred demo: ${request.preferredDemoDate} at ${request.preferredTime}`,
    `Additional requirements: ${request.message || "None"}`,
    `Submitted at: ${request.submittedAt}`,
  ].join("\n"),
  action: { label: "Reply to Client", requestId: request.id },
});

export const getReplyEmailPayload = (request, reply) => ({
  to: request.workEmail,
  subject: reply.subject,
  text: reply.message,
  inReplyTo: request.emailThreadId || null,
  references: request.emailThreadId ? [request.emailThreadId] : [],
  originalRequest: Object.fromEntries(
    Object.entries(request).filter(([key]) => key !== "replies")
  ),
});

export const renderEmailTextAsHtml = (text) =>
  `<div>${escapeHtml(text).replace(/\r?\n/g, "<br>")}</div>`;
