namespace EmployeeManagementSystem.Interfaces

{

    public interface IEmailService

    {

        void SendOtp(string toEmail, string otp);
 
        void SendEmployeeCredentials(

            string toEmail,

            string employeeName);
 
        Task SendEmailWithAttachment(

            string toEmail,

            string subject,

            string body,

            string attachmentPath);
 
        Task SendEmailAsync(

            string toEmail,

            string subject,

            string body);

    }

}
 
