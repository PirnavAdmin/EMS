namespace EmployeeManagementSystem.DTOs

{

    public class AdminEmployeeAttendanceDto

    {

        public string EmployeeId { get; set; }

        public string EmployeeName { get; set; }
        public int TL { get; set; }

        public int UL { get; set; }

        public int BL { get; set; }
        public List<AdminAttendanceDayDto> Days { get; set; }

    }

}
