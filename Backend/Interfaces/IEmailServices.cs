namespace EmployeeManagementSystem.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpAsync(string toEmail, string otp);
        Task SendEmployeeCredentials(string toEmail, string employeeName);

        Task SendEmailWithAttachment(
            string toEmail,
            string subject,
            string body,
            string attachmentPath);

        Task SendEmailAsync(
    string toEmail,
    string subject,
    string body);

        Task SendPayslipEmail(
    string toEmail,
    string employeeName,
    string month,
    int year,
    string attachmentPath);

        //    Task SendEmailWithAttachmentAsync(
        //string to,
        //string subject,
        //string body,
        //string attachmentPath);
        Task SendLocationMismatchEmail(
    string adminEmail,
    string employeeId,
    string employeeName,
    string employeeEmail,
    decimal checkInLatitude,
    decimal checkInLongitude,
    decimal checkOutLatitude,
    decimal checkOutLongitude,
    decimal distance,
    string reason);
    }

}
