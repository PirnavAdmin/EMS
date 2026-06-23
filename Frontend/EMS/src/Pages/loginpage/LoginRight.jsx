import React from "react";
import pirnavLogo from "../../assets/pirnav.png";

function LoginRight() {
  return (
    <>
      <div className="auth-hero-orb auth-hero-orb-one" aria-hidden="true" />
      <div className="auth-hero-orb auth-hero-orb-two" aria-hidden="true" />
      <div className="auth-hero-grid" aria-hidden="true" />

      <div
        className="auth-hero-logo-right"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          src={pirnavLogo}
          alt="PIRNAV Logo"
          className="auth-right-logo"
          style={{
            width: "420px",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>
    </>
  );
}

export default LoginRight;
