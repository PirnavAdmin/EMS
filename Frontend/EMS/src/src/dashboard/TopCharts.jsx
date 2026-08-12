import React, { memo } from "react";
import {
  FaUsers,
  FaBuilding,
  FaProjectDiagram,
  FaCalendarCheck,
} from "react-icons/fa";
 
function TopCharts({
  data = {},
  loading = false,
}) {
 
  const renderValue = (
    value,
    suffix = ""
  ) => {
 
    if (
      loading ||
      value === undefined ||
      value === null
    ) {
      return (
        <div className="card-skeleton value-loader"></div>
      );
    }
 
    return (
      <h2 className="card-value">
        {value}
        {suffix}
      </h2>
    );
  };
 
  return (
    <div className="cards">
 
      {/* Total Employees */}
      <div className="card">
        <div className="card-top">
 
          <div>
            <p className="card-label">
              Total Employees
            </p>
 
            {renderValue(
              data?.totalEmployees
            )}
 
            <span className="card-change green">
              Total
            </span>
          </div>
 
          <div className="icon green">
            <FaUsers />
          </div>
 
        </div>
      </div>
 
      {/* Departments */}
      <div className="card">
        <div className="card-top">
 
          <div>
            <p className="card-label">
              Departments
            </p>
 
            {renderValue(
              data?.totalDepartments
            )}
 
            <span className="card-change">
              Active
            </span>
          </div>
 
          <div className="icon blue">
            <FaBuilding />
          </div>
 
        </div>
      </div>
 
      {/* Active Projects */}
      <div className="card">
        <div className="card-top">
 
          <div>
            <p className="card-label">
              Active Projects
            </p>
 
            {renderValue(
              data?.activeProjects
            )}
 
            <span className="card-change">
              Running
            </span>
          </div>
 
          <div className="icon orange">
            <FaProjectDiagram />
          </div>
 
        </div>
      </div>
 
      {/* Attendance */}
      <div className="card">
        <div className="card-top">
 
          <div>
            <p className="card-label">
              Attendance Today
            </p>
 
            {renderValue(
              data?.attendancePercentage,
              "%"
            )}
 
            <span className="card-change green">
              Today
            </span>
          </div>
 
          <div className="icon teal">
            <FaCalendarCheck />
          </div>
 
        </div>
      </div>
 
    </div>
  );
}
 
export default memo(TopCharts);
 