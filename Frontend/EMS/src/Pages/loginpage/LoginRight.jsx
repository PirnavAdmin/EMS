import React from "react";
import pirnavLogo from "../../assets/pirnav5.png";
import { useBrandingLogo } from "../../utils/brandingLogo";

function LoginRight() {
  const { logoSrc: resolvedLogo, isLoading } =
    useBrandingLogo("loginLogo");

  const logoSrc = resolvedLogo || (isLoading ? "" : pirnavLogo);

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
          src={logoSrc}
          alt="Pirnav logo"
          className="auth-right-logo"
          loading="eager"
          decoding="async"
          onError={(event) => {
            if (event.currentTarget.src !== pirnavLogo) {
              event.currentTarget.src = pirnavLogo;
            }
          }}
        />
      </div>
    </>
  );
}

export default LoginRight;