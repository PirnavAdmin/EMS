namespace EmployeeManagementSystem.DTOs
{
    public class ShiftPlannerDto
    {
        public int PlannerId { get; set; }

        public int ShiftId { get; set; }

        public string? ShiftName { get; set; }

        public DateTime FromDate { get; set; }

        public DateTime ToDate { get; set; }

        public int? Department_Id { get; set; }

        public string? Remarks { get; set; }

        public bool IsPublished { get; set; }

        public string? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}