using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class OnboardingDocumentDto
    {
        public string? OnboardingId { get; set; }

        [Required]
        public string DocumentType { get; set; }

        [Required]
        public IFormFile File { get; set; }
    }
}