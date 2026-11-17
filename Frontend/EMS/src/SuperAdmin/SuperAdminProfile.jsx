import React, { useMemo } from "react";
import { FaArrowLeft, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getAuthenticatedUserSnapshot, getStoredAuthValue } from "../utils/authStorage";
import "./SuperAdmin.css";
import "./SuperAdminProfile.css";

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim()) ?? "";

function SuperAdminProfile() {
  const navigate = useNavigate();
  const profile = useMemo(() => {
    const auth = getAuthenticatedUserSnapshot();
    const storedUser = auth.user ?? {};
    const account =
      storedUser.Data ??
      storedUser.data?.data ??
      storedUser.data ??
      storedUser.superAdmin ??
      storedUser.SuperAdmin ??
      storedUser;
    const claims = auth.payload ?? {};

    return {
      name: firstValue(
        account.fullName,
        account.FullName,
        account.name,
        account.Name,
        claims.name,
        claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
        "Super Admin"
      ),
      email: firstValue(
        account.email,
        account.Email,
        claims.email,
        claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
        getStoredAuthValue("email"),
        "Not available"
      ),
      id: firstValue(
        account.superAdminId,
        account.SuperAdminId,
        account.id,
        account.Id,
        claims.SuperAdminId,
        claims.superAdminId,
        claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier"],
        "Not available"
      )
    };
  }, []);

  return (
    <main className="super-admin-page super-admin-profile-page">
      <div className="super-admin-profile-heading">
        <div>
          <span className="super-admin-profile-eyebrow">Account</span>
          <h1>My Profile</h1>
          <p>Your Super Admin account details.</p>
        </div>
        <button
          type="button"
          className="super-admin-profile-back"
          onClick={() => navigate("/super-admin/dashboard")}
        >
          <FaArrowLeft aria-hidden="true" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <section className="super-admin-profile-card" aria-label="Super Admin profile details">
        <div className="super-admin-profile-card__identity">
          <FaUserCircle aria-hidden="true" />
          <div>
            <h2>{profile.name}</h2>
            <p>Super Admin</p>
          </div>
        </div>
        <dl className="super-admin-profile-details">
          <div>
            <dt>Full name</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>Super Admin ID</dt>
            <dd>{profile.id}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>Super Admin</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export default SuperAdminProfile;
