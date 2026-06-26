namespace EmployeeManagementSystem.DTOs
{
    public class CheckOutLocationDto
    {
        public decimal Latitude { get; set; }

        public decimal Longitude { get; set; }

        public string? LocationChangeReason { get; set; }
    }
}
