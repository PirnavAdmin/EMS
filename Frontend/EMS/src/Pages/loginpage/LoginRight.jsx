import React from "react";
import pirnavLogo from "../../assets/pirnav5.png";

function LoginRight() {
  return (
    <>
      <div
        className="auth-hero-orb auth-hero-orb-one"
        aria-hidden="true"
      />

      <div
        className="auth-hero-orb auth-hero-orb-two"
        aria-hidden="true"
      />

      <div className="auth-hero-grid" aria-hidden="true" />

      <div className="auth-hero-logo-right">
        <img
        src={pirnavLogo}
          alt="Pirnav logo"
          className="auth-right-logo"
          loading="eager"
          decoding="async"
        />
      </div>
    </>
  );
}

export default LoginRight;