using EmployeeManagementSystem.Models;




namespace EmployeeManagementSystem.DTOs

{

    public class AdminNotificationDto

    {

        public int Id { get; set; }

        public string Title { get; set; }

        public string Message { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedAt { get; set; }

    }

}
