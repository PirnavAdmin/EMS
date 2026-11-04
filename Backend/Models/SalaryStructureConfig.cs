namespace EmployeeManagementSystem.Models
{
    public class SalaryStructureConfig
    {
        public int Id { get; set; }
        public decimal BasicPercentage { get; set; }
        public decimal HraPercentageOfBasic { get; set; }
        public decimal PfPercentage { get; set; }
        public decimal ConveyanceFixed { get; set; }
        public decimal MedicalFixed { get; set; }
        public decimal ProfessionalTaxFixed { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedDate { get; set; }
    }
}
