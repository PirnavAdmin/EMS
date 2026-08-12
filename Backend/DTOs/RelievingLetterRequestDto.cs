namespace EmployeeManagementSystem.DTOs
{
    public class RelievingLetterRequestDto
    {
        // Employee ID
        public string EmployeeId { get; set; } = string.Empty;

        // Mr. / Mrs. / Miss.
        // Keep this because you already use it in your existing flow
        public string Title { get; set; } = string.Empty;

        // Designation override
        // If empty, fetch from EmployeePersonalInfo
        public string? Designation { get; set; }

        // NEW:
        // Date on which employee submitted resignation
        public DateTime ResignationDate { get; set; }

        // Last Working / Relieving Date
        public DateTime RelievingDate { get; set; }

        // NEW:
        // Example: "Served as per agreement"
        // or "Waived off as per agreement"
        public string? NoticePeriodStatus { get; set; }

        // NEW:
        // Example: "Completed & Cleared"
        public string? FullFinalSettlement { get; set; }

        // NEW:
        // Example: "Ramesh Kumar"
        public string? AuthorizedSignatory { get; set; }

        // NEW:
        // Example: "Head of Human Resources"
        public string? AuthorizedSignatoryDesignation { get; set; }
    }
}