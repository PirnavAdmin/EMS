import React from "react";
import { Link } from "react-router-dom";
import {
    FaArrowLeft,
    FaShieldAlt,
    FaEnvelope,
    FaMapMarkerAlt,
    FaFacebookF,
    FaInstagram,
    FaLinkedinIn,
    FaYoutube
} from "react-icons/fa";
import pirnavLogo from "../../assets/pirnav.png";
import "./PrivacyPolicy.css";
import "./LandingPage.css";

const SOCIAL_LINKS = [
    { label: "LinkedIn", icon: FaLinkedinIn },
    { label: "Facebook", icon: FaFacebookF },
    { label: "Instagram", icon: FaInstagram },
    { label: "YouTube", icon: FaYoutube },
];

const FOOTER_LINKS = {
    quick: [
        { label: "Home", href: "/" },
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/#pricing" },
        { label: "Request Demo", href: "/#request-demo" },
    ],

    company: [
        { label: "About", href: "/#home" },
        { label: "Security", href: "/#features" },
        { label: "Careers", href: "/#pricing" },
        { label: "Contact", href: "/#contact" },
    ],

    resources: [
        { label: "Help Center", href: "/#contact" },
        { label: "Documentation", href: "/#features" },
        { label: "Security", href: "/#features" },
        { label: "FAQ", href: "/#contact" },
    ],
};

const FOOTER_POLICY_LINKS = [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "#terms" },
    { label: "Cookie Policy", href: "#cookies" },
];

const PrivacyPolicy = () => {
    return (
        <div className="privacy-policy-page">

            {/* ================= HEADER ================= */}
            <header className="privacy-policy-header">
                <div className="privacy-policy-header-inner">

                    <Link to="/" className="privacy-policy-logo">
                        <img
                            src={pirnavLogo}
                            alt="Pirnav Software Solutions Pvt. Ltd."
                        />
                    </Link>

                    <Link to="/" className="privacy-policy-back">
                        <FaArrowLeft />
                        <span>Back to Home</span>
                    </Link>

                </div>
            </header>

            {/* ================= MAIN ================= */}
            <main className="privacy-policy-main">

                <div className="privacy-policy-shell">

                    {/* PAGE TITLE */}
                    <div className="privacy-policy-heading">

                        <div className="privacy-policy-eyebrow">
                            <FaShieldAlt />
                            <span>PIRNAV LEGAL</span>
                        </div>

                        <h1>Privacy Policy</h1>

                        <p>
                            EMS Portal – Employee Management System
                        </p>

                    </div>

                    {/* ================= POLICY CONTENT ================= */}
                    <article className="privacy-policy-card">

                        {/* INTRODUCTION */}
                        <section className="privacy-policy-section">
                            <h2>Introduction</h2>

                            <p>
                                This Privacy Policy explains how PIRNAV SOFTWARE SOLUTIONS PVT.
                                LTD., (“Company”, “we”, “us”, or “our”) collects, uses,
                                processes, stores, protects, and discloses information obtained
                                through the EMS Portal, including its website, web application,
                                mobile application, and related services (“Platform”).
                            </p>

                            <p>
                                EMS Portal is an Employee Management System designed to assist
                                organizations with employee administration, attendance
                                management, leave management, employee records, payroll-related
                                information, task management, communication, notifications, and
                                other workplace management functions.
                            </p>

                            <p>
                                We are committed to protecting the privacy and security of
                                personal information entrusted to us and to processing such
                                information in accordance with applicable laws of India.
                            </p>

                            <p>
                                By accessing or using EMS Portal, you acknowledge that you have
                                read and understood this Privacy Policy.
                            </p>
                        </section>

                        {/* SCOPE */}
                        <section className="privacy-policy-section">
                            <h2>Scope of This Privacy Policy</h2>

                            <p>
                                This Privacy Policy applies to personal and business
                                information collected through:
                            </p>

                            <ul>
                                <li>EMS Portal website;</li>
                                <li>EMS Portal web application;</li>
                                <li>EMS Portal mobile application;</li>
                                <li>Employee and administrator accounts;</li>
                                <li>Customer/organization accounts;</li>
                                <li>Customer support and communication channels; and</li>
                                <li>Other services directly connected with EMS Portal.</li>
                            </ul>

                            <p>
                                This Policy does not apply to third-party websites,
                                applications, services, or platforms that may be accessed
                                through links available on EMS Portal.
                            </p>
                        </section>

                        {/* INFORMATION WE COLLECT */}
                        <section className="privacy-policy-section">
                            <h2>Information We Collect</h2>

                            <p>
                                Depending on the features enabled by an organization, EMS
                                Portal may collect the following categories of information.
                            </p>

                            <h3>Personal Information</h3>

                            <p>This may include:</p>

                            <ul>
                                <li>Full name;</li>
                                <li>Employee ID;</li>
                                <li>Email address;</li>
                                <li>Mobile/telephone number;</li>
                                <li>Date of birth, where required;</li>
                                <li>Gender, where required;</li>
                                <li>Residential/contact address;</li>
                                <li>Profile photograph;</li>
                                <li>Emergency contact details;</li>
                                <li>Employee designation;</li>
                                <li>Department;</li>
                                <li>Date of joining;</li>
                                <li>Employment status;</li>
                                <li>Organization/company details; and</li>
                                <li>
                                    Other information provided by the organization or employee.
                                </li>
                            </ul>

                            <h3>Employment and HR Information</h3>

                            <p>
                                EMS Portal may process employment-related information such as:
                            </p>

                            <ul>
                                <li>Attendance records;</li>
                                <li>Login and logout records;</li>
                                <li>Leave applications and approvals;</li>
                                <li>Work schedules;</li>
                                <li>Shift information;</li>
                                <li>Employee department and designation;</li>
                                <li>Salary/payroll-related information, where enabled;</li>
                                <li>Performance or task-related information;</li>
                                <li>Employee documents;</li>
                                <li>Holiday information;</li>
                                <li>Work-related communications;</li>
                                <li>Expense or reimbursement information; and</li>
                                <li>Other HR or administrative records.</li>
                            </ul>

                            <h3>Location Information</h3>

                            <p>
                                Where location-based attendance or workplace verification
                                features are enabled, EMS Portal may collect precise or
                                approximate location information from the employee’s device
                                when the employee uses attendance, check-in &amp; check-out.
                            </p>

                            <p>Location information may be used for:</p>

                            <ul>
                                <li>Attendance verification;</li>
                                <li>Workplace/geofencing verification;</li>
                                <li>Check-in and check-out;</li>
                                <li>Field-duty or work-location verification;</li>
                                <li>Prevention of fraudulent attendance; and</li>
                                <li>Organization-authorized workforce management functions.</li>
                            </ul>

                            <p>
                                Location permissions are requested through the device and may
                                be disabled by the user, subject to the organization’s
                                attendance requirements.
                            </p>

                            <h3>Photo Information</h3>

                            <p>
                                Where enabled by the organization, EMS Portal may allow users
                                to upload or submit photographs for employee profile or other
                                authorized workplace-related purposes.
                            </p>

                            <p>Photographs may include:</p>

                            <ul>
                                <li>Employee profile photographs; and</li>
                                <li>
                                    Other work-related photographs submitted by the user where
                                    applicable.
                                </li>
                            </ul>

                            <p>
                                Such photographs will be processed only for legitimate
                                organizational or Platform purposes and will not be used for
                                unrelated purposes.
                            </p>

                            <h3>Device and Technical Information</h3>

                            <p>
                                We may automatically collect limited technical information,
                                including:
                            </p>

                            <ul>
                                <li>Device type and model;</li>
                                <li>Operating system;</li>
                                <li>Application version;</li>
                                <li>IP address;</li>
                                <li>Browser information;</li>
                                <li>Device identifiers, where technically necessary;</li>
                                <li>Login and access timestamps;</li>
                                <li>Crash and diagnostic information; and</li>
                                <li>Technical logs.</li>
                            </ul>

                            <p>
                                This information is primarily used for security,
                                troubleshooting, system administration, and improving Platform
                                performance.
                            </p>

                            <h3>Documents and User Content</h3>

                            <p>
                                Where enabled by the organization, users may upload or submit:
                            </p>

                            <ul>
                                <li>Employee documents;</li>
                                <li>Identity or employment documents;</li>
                                <li>Certificates;</li>
                                <li>Profile photographs;</li>
                                <li>Employee-related photographs; and</li>
                                <li>Other work-related documents.</li>
                            </ul>

                            <p>
                                Such information is processed only for legitimate
                                organizational or Platform purposes.
                            </p>
                        </section>

                        {/* HOW WE USE INFORMATION */}
                        <section className="privacy-policy-section">
                            <h2>How We Use Information</h2>

                            <p>
                                We may use collected information for the following purposes:
                            </p>

                            <ol>
                                <li>Creating and managing employee accounts;</li>
                                <li>Providing authentication and secure access;</li>
                                <li>Managing attendance and working hours;</li>
                                <li>Processing leave applications;</li>
                                <li>Managing employee records;</li>
                                <li>
                                    Supporting payroll or salary-related functionality, where
                                    enabled;
                                </li>
                                <li>Managing tasks and work assignments;</li>
                                <li>Sending workplace notifications and announcements;</li>
                                <li>Providing customer and technical support;</li>
                                <li>Maintaining and improving EMS Portal;</li>
                                <li>
                                    Detecting and preventing unauthorized access, fraud, and
                                    misuse;
                                </li>
                                <li>Maintaining security and audit logs;</li>
                                <li>
                                    Complying with applicable legal and regulatory requirements;
                                </li>
                                <li>
                                    Performing organizational reporting and administrative
                                    functions; and
                                </li>
                                <li>
                                    Carrying out other purposes authorized by the relevant
                                    organization.
                                </li>
                            </ol>

                            <p>
                                We do not sell personal information to third parties.
                            </p>
                        </section>

                        {/* LEGAL BASIS */}
                        <section className="privacy-policy-section">
                            <h2>Legal Basis and Consent</h2>

                            <p>
                                Personal information may be processed based on:
                            </p>

                            <ul>
                                <li>Consent provided by the individual, where applicable;</li>
                                <li>Performance of employment or organizational functions;</li>
                                <li>Legitimate organizational requirements;</li>
                                <li>Compliance with applicable legal obligations; or</li>
                                <li>
                                    Other lawful grounds available under applicable law.
                                </li>
                            </ul>

                            <p>
                                Where consent is required, the relevant consent may be obtained
                                through the application, website, device permission, employment
                                process, or other appropriate mechanism.
                            </p>
                        </section>

                        {/* SHARING */}
                        <section className="privacy-policy-section">
                            <h2>Sharing of Information</h2>

                            <p>
                                We may share or provide access to information only where
                                reasonably necessary for legitimate purposes, including:
                            </p>

                            <h3>Employer/Organization</h3>

                            <p>
                                Employee information may be made available to authorized
                                representatives, HR personnel, managers, administrators, or
                                other personnel of the organization using EMS Portal.
                            </p>

                            <h3>Service Providers</h3>

                            <p>
                                We may use trusted third-party service providers for services
                                such as:
                            </p>

                            <ul>
                                <li>Cloud hosting;</li>
                                <li>Database infrastructure;</li>
                                <li>Security;</li>
                                <li>Application maintenance;</li>
                                <li>Notifications;</li>
                                <li>Analytics;</li>
                                <li>Technical support; and</li>
                                <li>Other infrastructure required to operate EMS Portal.</li>
                            </ul>

                            <p>
                                Such providers may process information only as necessary to
                                provide their services and subject to appropriate contractual
                                or security obligations.
                            </p>

                            <h3>Legal and Regulatory Authorities</h3>

                            <p>
                                Information may be disclosed where required or permitted by
                                applicable law, regulation, court order, governmental request,
                                or legal process.
                            </p>
                        </section>

                        {/* DATA SECURITY */}
                        <section className="privacy-policy-section">
                            <h2>Data Security</h2>

                            <p>
                                We implement reasonable technical, organizational, and
                                administrative safeguards designed to protect personal
                                information against:
                            </p>

                            <ul>
                                <li>Unauthorized access;</li>
                                <li>Unauthorized disclosure;</li>
                                <li>Loss;</li>
                                <li>Misuse;</li>
                                <li>Alteration;</li>
                                <li>Destruction; and</li>
                                <li>Other security threats.</li>
                            </ul>

                            <p>Security measures may include:</p>

                            <ul>
                                <li>Secure authentication;</li>
                                <li>Role-based access controls;</li>
                                <li>Encryption during transmission;</li>
                                <li>Access restrictions;</li>
                                <li>Security monitoring;</li>
                                <li>Audit logs; and</li>
                                <li>Appropriate backup and recovery procedures.</li>
                            </ul>

                            <p>
                                However, no electronic system or internet transmission can be
                                guaranteed to be completely secure.
                            </p>
                        </section>

                        {/* DATA RETENTION */}
                        <section className="privacy-policy-section">
                            <h2>Data Retention</h2>

                            <p>
                                We retain personal information only for as long as reasonably
                                necessary to:
                            </p>

                            <ul>
                                <li>Provide EMS Portal services;</li>
                                <li>Maintain employment or organizational records;</li>
                                <li>Fulfil contractual obligations;</li>
                                <li>Comply with legal or regulatory requirements;</li>
                                <li>Resolve disputes;</li>
                                <li>Prevent fraud or misuse; and</li>
                                <li>Maintain legitimate business records.</li>
                            </ul>

                            <p>
                                Retention periods may vary depending on the type of information
                                and the requirements of the organization using EMS Portal.
                            </p>

                            <p>
                                When personal information is no longer required for the
                                purposes for which it was collected, it will be securely
                                deleted, anonymized, or otherwise disposed of, subject to
                                applicable legal, regulatory, contractual, or organizational
                                retention requirements.
                            </p>
                        </section>

                        {/* USER RIGHTS */}
                        <section className="privacy-policy-section">
                            <h2>User Rights</h2>

                            <p>
                                Subject to applicable law and organizational policies,
                                individuals may have rights to:
                            </p>

                            <ul>
                                <li>Request access to personal information;</li>
                                <li>Request correction of inaccurate information;</li>
                                <li>Request updating of personal information;</li>
                                <li>
                                    Request deletion of information where legally permissible;
                                </li>
                                <li>
                                    Withdraw consent where processing is based on consent;
                                </li>
                                <li>Raise privacy-related concerns or complaints; and</li>
                                <li>
                                    Request information regarding the processing of their
                                    personal information.
                                </li>
                            </ul>

                            <p>
                                Certain requests may be subject to legal, contractual,
                                employment, security, or organizational limitations.
                            </p>
                        </section>

                        {/* ACCOUNT AND DATA DELETION */}
                        <section className="privacy-policy-section">
                            <h2>Account and Data Deletion</h2>

                            <p>
                                Where account deletion functionality is available, users may
                                request deletion of their account through the Platform or by
                                contacting us.
                            </p>

                            <p>
                                Deletion of an employee account does not necessarily require
                                immediate deletion of all records where the information must
                                be retained for:
                            </p>

                            <ul>
                                <li>Employment purposes;</li>
                                <li>Legal compliance;</li>
                                <li>Tax or accounting requirements;</li>
                                <li>Audit requirements;</li>
                                <li>Fraud prevention;</li>
                                <li>Dispute resolution; or</li>
                                <li>Other legitimate purposes.</li>
                            </ul>

                            <p>
                                Requests for deletion may therefore be subject to applicable
                                retention obligations.
                            </p>
                        </section>

                        {/* CHILDREN */}
                        <section className="privacy-policy-section">
                            <h2>Children’s Privacy</h2>

                            <p>
                                EMS Portal is intended primarily for employees, organizations,
                                administrators, and authorized workplace users.
                            </p>

                            <p>
                                The Platform is not intentionally designed to collect personal
                                information from children.
                            </p>

                            <p>
                                If we become aware that personal information has been
                                collected from a child in circumstances where such collection
                                is not permitted, we will take reasonable steps to address the
                                situation in accordance with applicable law.
                            </p>
                        </section>

                        {/* COOKIES */}
                        <section className="privacy-policy-section">
                            <h2>Cookies and Similar Technologies</h2>

                            <p>
                                EMS Portal may use cookies, local storage, session technologies,
                                and similar technologies to:
                            </p>

                            <ul>
                                <li>Maintain user sessions;</li>
                                <li>Authenticate users;</li>
                                <li>Remember preferences;</li>
                                <li>Improve Platform functionality;</li>
                                <li>Monitor performance;</li>
                                <li>Detect security issues; and</li>
                                <li>Understand general usage patterns.</li>
                            </ul>

                            <p>
                                Users may be able to control certain cookies through their
                                browser settings. Disabling certain cookies may affect Platform
                                functionality.
                            </p>
                        </section>

                        {/* THIRD PARTY */}
                        <section className="privacy-policy-section">
                            <h2>Third-Party Services</h2>

                            <p>
                                EMS Portal may integrate with third-party services required for
                                hosting, communication, notifications, authentication,
                                analytics, payment processing, or other organizational
                                functions.
                            </p>

                            <p>
                                Third-party services operate under their own terms and privacy
                                policies.
                            </p>

                            <p>
                                Users should review the privacy practices of relevant
                                third-party services where applicable.
                            </p>
                        </section>

                        {/* INTERNATIONAL TRANSFERS */}
                        <section className="privacy-policy-section">
                            <h2>International Data Transfers</h2>

                            <p>
                                Where personal information is processed or stored outside India,
                                such processing will be carried out subject to applicable laws
                                and appropriate contractual, technical, and organizational
                                safeguards.
                            </p>
                        </section>

                        {/* DATA BREACH */}
                        <section className="privacy-policy-section">
                            <h2>Data Breach and Security Incidents</h2>

                            <p>
                                In the event of a security incident involving personal
                                information, we will take appropriate steps to investigate,
                                contain, mitigate, and address the incident in accordance with
                                applicable legal and regulatory requirements.
                            </p>

                            <p>
                                Where required by law, affected organizations, users, or
                                relevant authorities may be notified.
                            </p>
                        </section>

                        {/* CHANGES */}
                        <section className="privacy-policy-section">
                            <h2>Changes to This Privacy Policy</h2>

                            <p>
                                We may update this Privacy Policy from time to time to reflect:
                            </p>

                            <ul>
                                <li>Changes to EMS Portal;</li>
                                <li>Changes in applicable laws;</li>
                                <li>Changes in data processing practices;</li>
                                <li>Security improvements; or</li>
                                <li>Business or operational requirements.</li>
                            </ul>

                            <p>
                                The updated Privacy Policy will be published on the relevant
                                EMS Portal website or application.
                            </p>
                        </section>

                        {/* CONTACT */}
                        <section className="privacy-policy-section">
                            <h2>Contact Information</h2>

                            <p>
                                For privacy-related questions, requests, complaints, or
                                concerns, please contact:
                            </p>

                            <div className="privacy-policy-contact-box">
                                <p>
                                    <strong>PIRNAV SOFTWARE SOLUTIONS PVT. LTD.</strong>
                                </p>

                                <p>
                                    <strong>EMS PORTAL</strong>
                                </p>

                                <p>
                                    <strong>Email:</strong>{" "}
                                    <a href="mailto:contact@pirnav.com">
                                        contact@pirnav.com
                                    </a>
                                </p>

                                <p>
                                    <strong>Support Email:</strong>{" "}
                                    <a href="mailto:pirnavsoftware@gmail.com">
                                        pirnavsoftware@gmail.com
                                    </a>
                                </p>

                                <p>
                                    <strong>Website:</strong>{" "}
                                    <a
                                        href="https://www.pirnav.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        https://www.pirnav.com/
                                    </a>
                                </p>

                                <p>
                                    <strong>Privacy Policy URL:</strong>{" "}
                                    <a
                                        href="https://hrms.pirnav.com/privacy-policy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        https://hrms.pirnav.com/privacy-policy
                                    </a>
                                </p>

                                <p>
                                    <strong>Registered Office:</strong>
                                </p>

                                <p>
                                    4<sup>th</sup> Floor, Jain Sadguru Capital Park,
                                    <br />
                                    Capital Park Road, VIP Hills, Madhapur,
                                    <br />
                                    Hyderabad, Telangana - 500081
                                </p>
                            </div>
                        </section>

                        {/* GRIEVANCE */}
                        <section className="privacy-policy-section">
                            <h2>Grievance Redressal</h2>

                            <p>
                                If you have any concern regarding the collection, use,
                                processing, storage, or protection of your personal
                                information, you may contact our designated Privacy/Grievance
                                Officer using the contact details provided above.
                            </p>

                            <p>
                                We will review and address privacy-related requests in
                                accordance with applicable law and our internal procedures.
                            </p>
                        </section>

                        {/* USER ACKNOWLEDGEMENT */}
                        <section className="privacy-policy-section">
                            <h2>User Acknowledgement</h2>

                            <p>
                                By accessing or using EMS Portal, you acknowledge that you have
                                read and understood this Privacy Policy and understand how your
                                personal information may be collected, used, stored, processed,
                                and disclosed as described herein.
                            </p>
                        </section>

                        {/* COPYRIGHT */}
                        {/* <div className="privacy-policy-copyright">
                            © 2026 PIRNAV SOFTWARE SOLUTIONS PVT. LTD. All Rights Reserved.
                        </div> */}

                    </article>
                </div>
            </main>
                    
            {/* ================= FOOTER ================= */}
            <footer className="landing-footer">
                <div className="landing-shell">
                    <div
                        className="landing-footer-grid"
                    >
                        {/* BRAND */}
                        <div
                            className="landing-footer-brand"
                        >
                            <div className="landing-footer-logo">
                                <img
                                    src={pirnavLogo}
                                    alt="Pirnav"
                                    className="landing-footer-mark"
                                />
                            </div>

                            <div className="landing-footer-brand-copy">
                                <h3 className="landing-footer-brand-name">
                                    Pirnav HRMS
                                </h3>
                                <p className="landing-footer-brand-tagline">
                                    Intelligent people operations.
                                </p>
                            </div>

                            <p className="landing-footer-copy">
                                A modern HRMS platform for smarter employee
                                management, attendance, payroll, leave, and
                                workforce operations.
                            </p>

                            <div
                                className="landing-footer-socials"
                                aria-label="Social links"
                            >
                                {SOCIAL_LINKS.map(({ label, icon }) => (
                                    <a
                                        className="landing-social-link"
                                        href="#contact"
                                        aria-label={label}
                                        key={label}
                                    >
                                        {React.createElement(icon, {
                                            "aria-hidden": true
                                        })}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* QUICK LINKS */}
                        <div className="landing-footer-links-group">
                            <h3 className="landing-footer-title">
                                Quick Links
                            </h3>

                            <div className="landing-footer-links">
                                {FOOTER_LINKS.quick.map((link) => (
                                    <a
                                        className="landing-footer-link"
                                        href={link.href}
                                        key={link.label}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* COMPANY */}
                        <div className="landing-footer-links-group">
                            <h3 className="landing-footer-title">
                                Company
                            </h3>
                            <div className="landing-footer-links">

                                {FOOTER_LINKS.company.map((link) => (
                                    <a
                                        className="landing-footer-link"
                                        href={link.href}
                                        key={link.label}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* RESOURCES */}
                        <div className="landing-footer-links-group">
                            <h3 className="landing-footer-title">
                                Resources
                            </h3>
                            <div className="landing-footer-links">
                                {FOOTER_LINKS.resources.map((link) => (
                                    <a
                                        className="landing-footer-link"
                                        href={link.href}
                                        key={link.label}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* CONTACT */}
                        <div className="landing-footer-links-group">
                            <h3 className="landing-footer-title">
                                Contact
                            </h3>
                            <div className="landing-footer-contact">
                                <a
                                    className="landing-footer-contact-link"
                                    href="mailto:contact@pirnav.com"
                                >
                                    <FaEnvelope aria-hidden="true" />
                                    <span>contact@pirnav.com</span>
                                </a>
                                <a
                                    className="landing-footer-contact-link"
                                    href="mailto:contact@pirnav.com"
                                >
                                    <FaEnvelope aria-hidden="true" />
                                    <span>contact@pirnav.com</span>
                                </a>
                                <div className="landing-footer-contact-link landing-footer-contact-link--static">
                                    <FaMapMarkerAlt aria-hidden="true" />
                                    <span>India</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div
                        className="landing-footer-divider"
                        aria-hidden="true"
                    />

                    {/* BOTTOM */}
                    <div
                        className="landing-footer-bottom"
                    >
                        <p className="landing-footer-bottom-copy">
                            {"\u00A9"} 2026 Pirnav. All rights reserved.
                        </p>
                        <nav
                            className="landing-footer-bottom-links"
                            aria-label="Footer policy links"
                        >
                            {FOOTER_POLICY_LINKS.map((link) => (
                                <Link
                                    className="landing-footer-bottom-link"
                                    to={link.href}
                                    key={link.label}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;