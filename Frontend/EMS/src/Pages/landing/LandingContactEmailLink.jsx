import { useEffect, useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import {
  getLandingPageContactEmail,
  isLandingPageContactEmailNotConfigured,
  LANDING_CONTACT_EMAIL_UPDATED_EVENT,
} from "../../services/landingContactEmailService";

function LandingContactEmailLink() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let updateRevision = 0;
    let channel;

    const loadContactEmail = async () => {
      const requestRevision = updateRevision;
      try {
        const savedEmail = await getLandingPageContactEmail();
        if (active && requestRevision === updateRevision) {
          setEmail(savedEmail);
        }
      } catch (requestError) {
        if (
          active &&
          requestRevision === updateRevision &&
          !isLandingPageContactEmailNotConfigured(requestError)
        ) {
          setError("Contact email is currently unavailable.");
        }
      } finally {
        if (active && requestRevision === updateRevision) {
          setLoading(false);
        }
      }
    };

    const applyContactEmailUpdate = (contactEmail) => {
      const savedEmail = String(contactEmail ?? "").trim();
      if (savedEmail) {
        updateRevision += 1;
        setEmail(savedEmail);
        setError("");
        setLoading(false);
      }
    };

    const handleContactEmailUpdated = (event) =>
      applyContactEmailUpdate(event.detail?.contactEmail);
    const handleBroadcastContactEmailUpdated = (event) =>
      applyContactEmailUpdate(event.data?.contactEmail);

    loadContactEmail();
    window.addEventListener(
      LANDING_CONTACT_EMAIL_UPDATED_EVENT,
      handleContactEmailUpdated
    );

    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(LANDING_CONTACT_EMAIL_UPDATED_EVENT);
        channel.addEventListener("message", handleBroadcastContactEmailUpdated);
      }
    } catch (channelError) {
      console.error("Could not listen for landing page contact email updates.", channelError);
    }

    return () => {
      active = false;
      window.removeEventListener(
        LANDING_CONTACT_EMAIL_UPDATED_EVENT,
        handleContactEmailUpdated
      );
      channel?.removeEventListener("message", handleBroadcastContactEmailUpdated);
      channel?.close();
    };
  }, []);

  if (email) {
    return (
      <a className="landing-footer-contact-link" href={`mailto:${email}`}>
        <FaEnvelope aria-hidden="true" />
        <span>{email}</span>
      </a>
    );
  }

  if (loading) {
    return (
      <span className="landing-footer-contact-link" role="status">
        Loading contact email...
      </span>
    );
  }

  if (error) {
    return (
      <span className="landing-footer-contact-link" role="alert">
        {error}
      </span>
    );
  }

  return null;
}

export default LandingContactEmailLink;
