import React from "react";

function AuthLayout({ children, hero }) {
  return (
    <div className="auth-page">
      <main className="auth-stage">
        <div className="auth-shell">
          <section className="auth-hero-panel">
            {hero}
          </section>

          <section className="auth-form-panel">
            <div className="auth-form-panel-inner">
              {children}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;