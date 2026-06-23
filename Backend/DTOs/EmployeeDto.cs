using System;

namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeDto
    {

        public string Employee_Id { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string Department { get; set; } = string.Empty;

        public string RoleName { get; set; } = string.Empty;
        public string Email {  get; set; }
       public decimal CTC {  get; set; }

        public string Status { get; set; } = string.Empty;

       

        public DateTime JoiningDate { get; set; }

        
    }
}
