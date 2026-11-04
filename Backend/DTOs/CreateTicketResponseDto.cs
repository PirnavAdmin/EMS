using Microsoft.EntityFrameworkCore;

public class CreateTicketResponseDto
{
    public bool Success { get; set; }

    public int TicketId { get; set; }

    public string TicketNumber { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string? Module { get; set; }

    public DateTime? AssignedDate { get; set; }

    public DateTime? OpenedDate { get; set; }

    public DateTime? CompletedDate { get; set; }

    public DateTime? Deadline { get; set; }

    public decimal ActualHours { get; set; }

    public decimal RemainingHours { get; set; }

    public string SLAStatus { get; set; }

    public string? AssignmentType { get; set; }
}