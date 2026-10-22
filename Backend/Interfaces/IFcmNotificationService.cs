


    namespace EmployeeManagementSystem.Interfaces
    {
        public interface IFcmNotificationService
        {
            Task<FcmSendResult> SendToEmployeeAsync(
                string employeeId,
                string title,
                string body,
                string type,
                string screen,
                Dictionary<string, string>? data = null);
        }

        public class FcmSendResult
        {
            public string EmployeeId { get; set; } = string.Empty;
            public int DevicesFound { get; set; }
            public int SuccessCount { get; set; }
            public int FailureCount { get; set; }
            public List<string> Errors { get; set; } = new();
            public string Status { get; set; } = string.Empty;
        }
    }

