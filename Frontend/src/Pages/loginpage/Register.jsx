import React from "react";
import AuthLayout from "./AuthLayout";
import LoginRight from "./LoginRight";
import RegisterLeft from "./RegisterLeft";
import "./login.css";

export default function Register() {
  return (
    <AuthLayout hero={<LoginRight variant="register" />}>
      <RegisterLeft />
    </AuthLayout>
  );
}
