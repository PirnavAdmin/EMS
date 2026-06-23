using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("Admins")]

    public class Admin

    {

        [Key]

        public int Id { get; set; }

        [Required]

        public string Email { get; set; } = string.Empty;

        [Required]

        public string Password { get; set; } = string.Empty;

    }

}
