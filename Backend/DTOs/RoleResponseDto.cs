namespace EmployeeManagementSystem.DTOs
{
    public class RoleResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int UsersCount {  get; set; }
    }
}
