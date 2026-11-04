using System;

namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeExperienceDto
    {
        public string Employee_Id { get; set; }

        public string CompanyName { get; set; }

        public string Designation { get; set; }

        public DateTime? FromDate { get; set; }

        public DateTime? ToDate { get; set; }

      

        public string ReasonForLeaving { get; set; }

        public string Description { get; set; }
    }
}
