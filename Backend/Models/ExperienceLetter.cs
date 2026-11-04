namespace EmployeeManagementSystem.Models
{
    public class ExperienceLetter
    {
        public int Id { get; set; }

        // Employee
        public string EmployeeId { get; set; } = string.Empty;

        public string? Title { get; set; }

        // Snapshot of designation at generation time
        public string? Designation { get; set; }

        // Snapshot of department at generation time
        public string? Department { get; set; }

        // Employment period
        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        // Example: 1 Year 5 Months
        public string? EmploymentTenure { get; set; }

        // Reference / Serial Number
        public string? SerialNo { get; set; }

        // Authorized signatory
        public string? AuthorizedSignatory { get; set; }

        public string? AuthorizedSignatoryDesignation { get; set; }

        // Generated file
        public string? PdfPath { get; set; }

        // Generation details
        public DateTime GeneratedDate { get; set; }

        // Draft / Sent
        public string Status { get; set; } = "Draft";

        // Email tracking
        public bool IsSent { get; set; } = false;

        public DateTime? SentOn { get; set; }

        public int SentCount { get; set; } = 0;
    }
}