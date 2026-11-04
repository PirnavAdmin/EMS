using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("EmployeeResignation")]

    public class EmployeeResignation

    {

        [Key]

        public int ResignationId { get; set; }

        [Required]

        public string Employee_Id { get; set; } = string.Empty;

        [ForeignKey(nameof(Employee_Id))]

        public Employee? Employee { get; set; }

        public DateTime ResignationDate { get; set; }

        public DateTime LastWorkingDate { get; set; }

        public string? Reason { get; set; }

        public int NoticePeriod { get; set; } = 30;

        // Pending / Approved / Rejected

        public string OverallStatus { get; set; } = "Pending";

        // HR / Admin / Manager

        public string? ApprovedByRole { get; set; }

        // Employee/Admin/Manager/HR identifier

        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedDate { get; set; }

        public string? ApprovalRemarks { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public DateTime? RejectedDate { get; set; }

        public string? RejectedByRole { get; set; }

        public string? RejectedBy { get; set; }

        public string? RejectionRemarks { get; set; }

    }

}
