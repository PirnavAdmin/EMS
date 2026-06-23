namespace EmployeeManagementSystem.DTOs

{

    public class AdminAttendanceDayDto

    {

        public int Day { get; set; }

        public string Status { get; set; }

        public DateTime? CheckIn { get; set; }

        public DateTime? CheckOut { get; set; }

        public int? WorkingMinutes { get; set; }

    }

}
