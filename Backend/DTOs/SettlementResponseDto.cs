namespace EmployeeManagementSystem.DTOs
{
    public class SettlementResponseDto
    {
        public int SettlementId { get; set; }

        public string Employee_Id { get; set; }

        public decimal GrossSalary { get; set; }

        public decimal LeaveEncashment { get; set; }

        public decimal Bonus { get; set; }

        public decimal Deductions { get; set; }

        public decimal NetSettlement { get; set; }

        public DateTime GeneratedDate { get; set; }

        public string Status { get; set; }
    }
}