import React, { useState } from "react";
import { FaBriefcase } from "react-icons/fa";
import "./JobOpenings.css";

const EMPTY_JOB_FORM = {
  title: "",
  dept: "",
  exp: "",
  positions: "",
  skills: "",
  status: "",
};

function JobOpenings() {
  const [jobShowModal, setJobShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [jobList, setJobList] = useState([
    {
      title: "Senior React Developer",
      dept: "Engineering",
      exp: "5+ years",
      positions: "3",
      skills: "React, TypeScript, Node.js",
      status: "Open",
    },
    {
      title: "UI/UX Designer",
      dept: "Design",
      exp: "3+ years",
      positions: "2",
      skills: "Figma, Adobe XD, CSS",
      status: "Open",
    },
  ]);

  const [jobForm, setJobForm] = useState(EMPTY_JOB_FORM);

  const validateField = (name, draft = jobForm) => {
    const value = String(draft[name] ?? "").trim();

    if (name === "title") {
      if (!value) return "Job Title is required";
      if (value.length < 3) return "Job Title must be at least 3 characters";
      return "";
    }

    if (name === "dept") {
      return value ? "" : "Department is required";
    }

    if (name === "exp") {
      return value ? "" : "Experience is required";
    }

    if (name === "positions") {
      if (!value) return "Positions is required";
      const total = Number(value);
      if (!Number.isInteger(total) || total < 1) return "Positions must be at least 1";
      return "";
    }

    if (name === "skills") {
      return value ? "" : "Skills are required";
    }

    if (name === "status") {
      return value ? "" : "Status is required";
    }

    return "";
  };

  const validateForm = (draft = jobForm) => {
    const nextErrors = {
      title: validateField("title", draft),
      dept: validateField("dept", draft),
      exp: validateField("exp", draft),
      positions: validateField("positions", draft),
      skills: validateField("skills", draft),
      status: validateField("status", draft),
    };

    const cleanedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, value]) => value)
    );

    setErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0;
  };

  const handleJobChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "positions" ? value.replace(/\D/g, "").slice(0, 4) : value;
    const draft = {
      ...jobForm,
      [name]: nextValue,
    };

    setJobForm(draft);
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, draft),
    }));
  };

  const closeModal = () => {
    if (saving) return;
    setJobShowModal(false);
    setErrors({});
    setJobForm(EMPTY_JOB_FORM);
  };

  const handleAddJob = async () => {
    const trimmedJob = {
      ...jobForm,
      title: jobForm.title.trim().replace(/\s+/g, " "),
      dept: jobForm.dept.trim().replace(/\s+/g, " "),
      exp: jobForm.exp.trim().replace(/\s+/g, " "),
      skills: jobForm.skills.trim().replace(/\s+/g, " "),
      status: jobForm.status.trim(),
    };

    setJobForm(trimmedJob);

    if (!validateForm(trimmedJob)) return;

    try {
      setSaving(true);
      await Promise.resolve();

      setJobList((prev) => [...prev, trimmedJob]);
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const getJobStatusClass = (status) => {
    if (status === "Closed") return "job-badge job-closed";
    if (status === "On Hold") return "job-badge job-hold";
    return "job-badge job-open";
  };

  return (
    <div className="job-page-unique">
      <div className="job-header-unique">
        <div>
          <h2>Job Openings</h2>
          <p>Manage job postings and recruitment</p>
        </div>

        <button className="job-add-btn" onClick={() => setJobShowModal(true)}>
          + Post Job
        </button>
      </div>

      <div className="job-grid-unique">
        {jobList.map((job, index) => (
          <div className="job-card-unique" key={index}>
            <div className="job-top-unique">
              <div className="job-icon-unique">
                <FaBriefcase />
              </div>

              <span className={getJobStatusClass(job.status)}>
                {job.status}
              </span>
            </div>

            <h3 title={job.title}>{job.title}</h3>
            <p className="job-dept-unique">{job.dept}</p>

            <p>Experience: {job.exp}</p>
            <p>Positions: {job.positions}</p>
            <p title={job.skills}>Skills: {job.skills}</p>
          </div>
        ))}
      </div>

      {jobShowModal && (
        <div className="job-modal-overlay">
          <div className="job-modal-box">
            <h3>Add Job</h3>

            <div className="job-field-group">
              <label htmlFor="job-title-input">Job Title</label>
              <input id="job-title-input" name="title" value={jobForm.title} onChange={handleJobChange} className={errors.title ? "has-error" : ""} />
              {errors.title && <p className="job-error">{errors.title}</p>}
            </div>

            <div className="job-field-group">
              <label htmlFor="job-dept-input">Department</label>
              <input id="job-dept-input" name="dept" value={jobForm.dept} onChange={handleJobChange} className={errors.dept ? "has-error" : ""} />
              {errors.dept && <p className="job-error">{errors.dept}</p>}
            </div>

            <div className="job-field-group">
              <label htmlFor="job-exp-input">Experience</label>
              <input id="job-exp-input" name="exp" value={jobForm.exp} onChange={handleJobChange} className={errors.exp ? "has-error" : ""} />
              {errors.exp && <p className="job-error">{errors.exp}</p>}
            </div>

            <div className="job-field-group">
              <label htmlFor="job-positions-input">Positions</label>
              <input id="job-positions-input" name="positions" value={jobForm.positions} onChange={handleJobChange} className={errors.positions ? "has-error" : ""} inputMode="numeric" />
              {errors.positions && <p className="job-error">{errors.positions}</p>}
            </div>

            <div className="job-field-group">
              <label htmlFor="job-skills-input">Skills</label>
              <input id="job-skills-input" name="skills" value={jobForm.skills} onChange={handleJobChange} className={errors.skills ? "has-error" : ""} />
              {errors.skills && <p className="job-error">{errors.skills}</p>}
            </div>

            <div className="job-field-group">
              <label htmlFor="job-status-select">Status</label>
              <select id="job-status-select" name="status" value={jobForm.status} onChange={handleJobChange} className={errors.status ? "has-error" : ""}>
                <option value="">Select Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="On Hold">On Hold</option>
              </select>
              {errors.status && <p className="job-error">{errors.status}</p>}
            </div>

            <div className="job-modal-btns">
              <button className="job-cancel-btn" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="job-save-btn" onClick={handleAddJob} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobOpenings;
