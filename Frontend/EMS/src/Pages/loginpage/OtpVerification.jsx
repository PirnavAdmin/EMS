import React from "react";
import AuthLayout from "./AuthLayout";
import LoginRight from "./LoginRight";
import OtpLeft from "./OtpLeft";
import "./login.css";

export default function OtpVerification() {
  return (
    <AuthLayout hero={<LoginRight variant="recovery" />}>
      <OtpLeft />
    </AuthLayout>
  );
}
