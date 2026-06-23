namespace EmployeeManagementSystem.DTOs

{

    public class AdminEmployeeAttendanceDto

    {

        public string EmployeeId { get; set; }

        public string EmployeeName { get; set; }

        public List<AdminAttendanceDayDto> Days { get; set; }

    }

}
