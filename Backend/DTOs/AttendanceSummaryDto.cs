namespace EmployeeManagementSystem.DTOs

{

    public class AttendanceSummaryDto
    {
        public decimal PresentDays { get; set; }

        public int PaidLeaveDays { get; set; }

        public decimal HalfDays { get; set; }

        public int LopDays { get; set; }

        public int AbsentDays { get; set; }

        public int Holidays { get; set; }

        public int Weekends { get; set; }

        public decimal PayableDays { get; set; }
    }
}



