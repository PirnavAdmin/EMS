namespace EmployeeManagementSystem.DTOs
{
    public class AllReportsDTO
    {
        public int TotalEmployees { get; set; }
        public int TotalDepartments { get; set; }

        public int PresentToday { get; set; }
        public int AbsentToday { get; set; }

        public int TotalTasks { get; set; }
        public int TotalProjects { get; set; }

        public int TotalLeaves { get; set; }

        public decimal TotalSalaryPaid { get; set; }

        public int TotalClients { get; set; }
    }
}