namespace EmployeeManagementSystem.DTOs
{
    public class UserChangePasswordDto
    {
        public string Email { get; set; } = string.Empty;

        public string OldPassword { get; set; } = string.Empty;

        public string NewPassword { get; set; } = string.Empty;

        public string ConfirmPassword { get; set; } = string.Empty;
    }
}