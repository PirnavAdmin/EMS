using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
public class UserNotification
{
    public int Id { get; set; }

    public string Employee_Id { get; set; }

    public string Title { get; set; }

    public string Message { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}