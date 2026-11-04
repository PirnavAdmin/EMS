namespace EmployeeManagementSystem.DTOs
{
    public class ShiftRosterResponseDto
    {
        public int RosterId { get; set; }

        public string Employee_Id { get; set; } = string.Empty;

        public int ShiftId { get; set; }

        public string? ShiftName { get; set; }

        public DateTime RosterDate { get; set; }

        public string? Remarks { get; set; }

        public bool IsPublished { get; set; }
    }
}