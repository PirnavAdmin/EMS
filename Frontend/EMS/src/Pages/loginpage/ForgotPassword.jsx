import React from "react";
import AuthLayout from "./AuthLayout";
import ForgotLeft from "./ForgotLeft";
import LoginRight from "./LoginRight";
import "./login.css";

export default function ForgotPassword() {
  return (
    <AuthLayout hero={<LoginRight variant="recovery" />}>
      <ForgotLeft />
    </AuthLayout>
  );
}
