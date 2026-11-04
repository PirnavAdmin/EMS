using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs

{

    public class RegisterDto

    {

        [Required]

        public string FirstName { get; set; } = string.Empty;

        [Required]

        public string LastName { get; set; } = string.Empty;

        [Required]

        [EmailAddress]

        public string Email { get; set; } = string.Empty;

        [Required]

        [MinLength(6)]

        public string Password { get; set; } = string.Empty;

        [Required]

        [Compare("Password", ErrorMessage = "Passwords do not match")]

        public string ConfirmPassword { get; set; } = string.Empty;

 
        //public int? RoleId { get; set; }

    }

}
