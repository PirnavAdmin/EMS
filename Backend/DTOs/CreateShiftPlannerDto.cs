namespace EmployeeManagementSystem.DTOs
{
    public class CreateShiftPlannerDto
    {
        public int ShiftId { get; set; }

        public DateTime FromDate { get; set; }

        public DateTime ToDate { get; set; }

        public int? Department_Id { get; set; }

        public string? Remarks { get; set; }

        public string? CreatedBy { get; set; }
    }
}