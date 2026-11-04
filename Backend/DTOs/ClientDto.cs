namespace EmployeeManagementSystem.DTOs
{
    public class ClientDto
    {
        public int Id { get; set; }
        public string Client_Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public int Active_Projects { get; set; }
    }
}
