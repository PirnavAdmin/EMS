using EmployeeManagementSystem.Models;
using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models

{

    public class Attendance

    {

        [Key]

        public int Id { get; set; }

        public string Employee_Id { get; set; }

        public DateTime Attendance_Date { get; set; }

        public DateTime? Check_In { get; set; }

        public DateTime? Check_Out { get; set; }

        public string? Status { get; set; }

        public string? IpAddress { get; set; }

        public string? DeviceInfo { get; set; }

        public int WorkingMinutes { get; set; }
        public int TotalBreakMinutes { get; set; }

    }

}


 