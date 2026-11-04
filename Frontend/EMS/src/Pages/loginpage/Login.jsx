import React from "react";
import AuthLayout from "./AuthLayout";
import LoginLeft from "./LoginLeft";
import LoginRight from "./LoginRight";
import "./login.css";

export default function Login() {
  return (
    <AuthLayout hero={<LoginRight variant="login" />}>
      <LoginLeft />
    </AuthLayout>
  );
}
