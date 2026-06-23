import React, { useMemo, useState } from "react";
import {
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaUser
} from "react-icons/fa";

import { Link, useNavigate } from "react-router-dom";

import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";

import AuthField from "./AuthField";

import {
  getPasswordRuleState,
  getPasswordStrength,
  splitFullName
} from "./authUtils";

export default function RegisterLeft() {

  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  //----------------------------------------
  // PASSWORD STRENGTH
  //----------------------------------------

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  const passwordRules = useMemo(
    () => getPasswordRuleState(formData.password),
    [formData.password]
  );

  //----------------------------------------
  // HANDLE CHANGE
  //----------------------------------------

  const handleChange = (event) => {

    const { name, value } = event.target;

    let nextValue = value;

    //----------------------------------------
    // FULL NAME
    //----------------------------------------

    if (name === "fullName") {

      nextValue = value
        .replace(/[^A-Za-z ]/g, "")
        .replace(/\s{2,}/g, " ")
        .slice(0, 50);

    }

    //----------------------------------------
    // EMAIL
    //----------------------------------------

    else if (name === "email") {

      // convert uppercase to lowercase
      nextValue = value.toLowerCase();

      // remove spaces
      nextValue =
        nextValue.replace(/\s/g, "");

      // allow only letters, numbers, @, ., _, -
      nextValue = nextValue.replace(
        /[^a-z0-9@._-]/g,
        ""
      );

      nextValue = nextValue.slice(0, 40);

    }

    //----------------------------------------
    // PASSWORD
    //----------------------------------------

    else if (
      name === "password" ||
      name === "confirmPassword"
    ) {

      nextValue = value
        .replace(/\s/g, "")
        .slice(0, 16);

    }

    //----------------------------------------
    // SET FORM DATA
    //----------------------------------------

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      ...(name === "password"
        ? { confirmPassword: "" }
        : {}),
    }));

  };

  //----------------------------------------
  // HANDLE SUBMIT
  //----------------------------------------

  const handleSubmit = async (event) => {

    event.preventDefault();

    const fullName = formData.fullName
      .trim()
      .replace(/\s+/g, " ");

    const email = formData.email
      .trim()
      .toLowerCase();

    const password =
      formData.password.trim();

    const confirmPassword =
      formData.confirmPassword.trim();

    const validationErrors = {};

//----------------------------------------

// FULL NAME VALIDATION

//----------------------------------------
 
if (!fullName) {
 
  validationErrors.fullName =

    "Full Name is required";
 
}
 
else if (

  !/^[A-Za-z ]+$/.test(fullName)

) {
 
  validationErrors.fullName =

    "Full Name should contain only alphabets";
 
}
 
else if (

  fullName.length < 2

) {
 
  validationErrors.fullName =

    "Full Name must contain minimum 2 characters";
 
}
 
else if (

  fullName.length > 50

) {
 
  validationErrors.fullName =

    "Full Name cannot exceed 50 characters";
 
}
 
// NEW VALIDATION

else if (

  fullName.trim().split(/\s+/).length < 2

) {
 
  validationErrors.fullName =

    "Please enter First Name and Last Name";
 
}
 

    //----------------------------------------
    // EMAIL VALIDATION
    //----------------------------------------

    if (!email) {

      validationErrors.email =
        "Email Address is required";

    }

    //----------------------------------------
    // PASSWORD VALIDATION
    //----------------------------------------

    if (!password) {

      validationErrors.password =
        "Password is required";

    }

    else if (
      password.length < 8
    ) {

      validationErrors.password =
        "Password must contain minimum 8 characters";

    }

    else if (
      password.length > 16
    ) {

      validationErrors.password =
        "Password cannot exceed 16 characters";

    }

    else if (
      /\s/.test(password)
    ) {

      validationErrors.password =
        "Spaces are not allowed in password";

    }

    else if (
      !/[A-Z]/.test(password)
    ) {

      validationErrors.password =
        "Password must contain at least one uppercase letter";

    }

    else if (
      !/[0-9]/.test(password)
    ) {

      validationErrors.password =
        "Password must contain at least one number";

    }

    else if (
      !/[!@#$%^&*(),.?":{}|<>_]/.test(password)
    ) {

      validationErrors.password =
        "Password must contain at least one special character";

    }

    //----------------------------------------
    // CONFIRM PASSWORD VALIDATION
    //----------------------------------------

    if (!confirmPassword) {

      validationErrors.confirmPassword =
        "Confirm Password is required";

    }

    else if (
      confirmPassword.length < 8
    ) {

      validationErrors.confirmPassword =
        "Confirm Password must contain minimum 8 characters";

    }

    else if (
      confirmPassword.length > 16
    ) {

      validationErrors.confirmPassword =
        "Confirm Password cannot exceed 16 characters";

    }

    else if (
      /\s/.test(confirmPassword)
    ) {

      validationErrors.confirmPassword =
        "Spaces are not allowed in confirm password";

    }

    else if (
      !/[A-Z]/.test(confirmPassword)
    ) {

      validationErrors.confirmPassword =
        "Confirm Password must contain at least one uppercase letter";

    }

    else if (
      !/[0-9]/.test(confirmPassword)
    ) {

      validationErrors.confirmPassword =
        "Confirm Password must contain at least one number";

    }

    else if (
      !/[!@#$%^&*(),.?":{}|<>_]/.test(confirmPassword)
    ) {

      validationErrors.confirmPassword =
        "Confirm Password must contain at least one special character";

    }

    else if (
      password !== confirmPassword
    ) {

      validationErrors.confirmPassword =
        "Passwords do not match";

    }

    //----------------------------------------
    // SHOW ERRORS
    //----------------------------------------

    if (
      Object.keys(validationErrors)
        .length > 0
    ) {

      setErrors(validationErrors);

      return;

    }

    //----------------------------------------
    // SPLIT NAME
    //----------------------------------------

    const {
      firstName,
      lastName
    } = splitFullName(fullName);

    setLoading(true);

    try {

      console.log("Register Data:", {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      });

      await api.post(
        API_ENDPOINTS.auth.userRegister,
        {
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
        },
        {
          skipAuth: true,
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      // SUCCESS POPUP

      alert(
        "Registration Successful!"
      );

      // REDIRECT TO LOGIN

      navigate("/login");

    }

    catch (requestError) {

      console.log("Register Error:", requestError);

      console.log(
        "Backend Message:",
        requestError.response?.data
      );

      setErrors((prev) => ({
        ...prev,
        email:
          requestError.response?.data?.message ||
          "Registration failed.",
      }));

    }

    finally {

      setLoading(false);

    }

  };

  //----------------------------------------
  // UI
  //----------------------------------------

  return (
    <>
      <div className="auth-card-head">

        <p className="auth-eyebrow">
          Employee Onboarding
        </p>

        <h2 className="auth-card-title">
          Create Your PIRNAV HRMS Account
        </h2>

        {/* <p className="auth-card-subtitle">
          Start with your name, work email,
          and a strong password.
        </p> */}

      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
      >

        <AuthField
          label="Full Name"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          autoComplete="name"
          placeholder="Enter your full name"
          icon={FaUser}
          error={errors.fullName}
          maxLength={50}
          required
        />

        <AuthField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="Enter your email"
          icon={FaEnvelope}
          error={errors.email}
          maxLength={40}
          required
        />

        <AuthField
          label="Password"
          name="password"
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Enter password"
          icon={FaLock}
          error={errors.password}
          required
          action={{
            label: showPassword
              ? "Hide password"
              : "Show password",

            icon: showPassword
              ? <FaEye />
              : <FaEyeSlash />,

            onClick: () =>
              setShowPassword(
                (prev) => !prev
              ),
          }}
        />

        <div className="auth-strength-card">

          <div className="auth-strength-head">

            <span>
              Password Strength
            </span>

            <span
              className={`auth-strength-pill ${passwordStrength.tone}`}
            >
              {passwordStrength.label}
            </span>

          </div>

          <div
            className="auth-strength-bars"
            aria-hidden="true"
          >

            {Array.from({ length: 4 }).map(
              (_, index) => (
                <span
                  key={index}
                  className={`auth-strength-bar ${index <
                    passwordStrength.score
                    ? `auth-strength-bar-${passwordStrength.tone}`
                    : ""
                    }`}
                />
              )
            )}

          </div>

          <div className="auth-rule-list">

            {passwordRules.map((rule) => (
              <span
                key={rule.id}
                className={`auth-rule-item ${rule.passed
                  ? "passed"
                  : ""
                  }`}
              >
                {rule.label}
              </span>
            ))}

          </div>

        </div>

        <AuthField
          label="Confirm Password"
          name="confirmPassword"
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Re-enter password"
          icon={FaLock}
          error={errors.confirmPassword}
          required
          action={{
            label: showConfirmPassword
              ? "Hide confirm password"
              : "Show confirm password",

            icon: showConfirmPassword
              ? <FaEye />
              : <FaEyeSlash />,

            onClick: () =>
              setShowConfirmPassword(
                (prev) => !prev
              ),
          }}
        />

        <button
          type="submit"
          className="auth-primary-button"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : "Create Account"}
        </button>

      </form>

      <p className="auth-footer">

        Already have an account?

        <Link
          to="/login"
          className="auth-link"
        >
          Sign in
        </Link>

      </p>
    </>
  );

}
