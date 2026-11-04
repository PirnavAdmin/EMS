export const buildOfferLetterEmailDraft = (offerLetter) => {
  const candidateName = String(
    offerLetter?.candidate_Name ||
      offerLetter?.candidateName ||
      offerLetter?.name ||
      "Candidate"
  ).trim();
  const position = String(
    offerLetter?.position ||
      offerLetter?.designation ||
      offerLetter?.role ||
      "the role"
  ).trim();

  return {
    subject: `Offer Letter for ${candidateName}`,
    body: [
      `Dear ${candidateName},`,
      "",
      `Please find your offer letter for the ${position} position attached.`,
      "",
      "If you have any questions, please reply to this email.",
      "",
      "Regards,",
      "HR Team",
    ].join("\n"),
  };
};
