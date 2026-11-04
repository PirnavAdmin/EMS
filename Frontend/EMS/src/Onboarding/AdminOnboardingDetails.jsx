import React from "react";
import { useLocation, useParams } from "react-router-dom";
import OnboardingDetails from "./OnboardingDetails";

function AdminOnboardingDetails() {
  const { onboardingId } = useParams();
  const location = useLocation();

  return (
    <OnboardingDetails
      onboardingId={onboardingId}
      adminMode
      initialEditing={location.state?.edit === true}
    />
  );
}

export default AdminOnboardingDetails;
