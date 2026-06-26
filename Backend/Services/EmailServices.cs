using EmployeeManagementSystem.Interfaces;
using System.Net;
using System.Net.Mail;

namespace EmployeeManagementSystem.Services
{
    public class EmailService : IEmailService
    {
        private readonly string _fromEmail = "mployee13579@gmail.com";
        private readonly string _appPassword = "iblshoyecqmnnvbz";

        // ✅ Existing OTP Method (Keep Working)
        public void SendOtp(string toEmail, string otp)
        {
            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
            {
                smtp.EnableSsl = true;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential(_fromEmail, _appPassword);
                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;

                var message = new MailMessage();
                message.From = new MailAddress(_fromEmail);
                message.To.Add(toEmail);
                message.Subject = "Password Reset OTP";
                message.Body = $"Your OTP is: {otp}";
                message.IsBodyHtml = false;

                smtp.Send(message);
            }
        }

        // ✅ New Method For Offer Letter Attachment
        public async Task SendEmailWithAttachment(
            string toEmail,
            string subject,
            string body,
            string attachmentPath)
        {
            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
            {
                smtp.EnableSsl = true;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential(_fromEmail, _appPassword);
                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;

                var message = new MailMessage();
                message.From = new MailAddress(_fromEmail);
                message.To.Add(toEmail);
                message.Subject = subject;
                message.Body = body;
                message.IsBodyHtml = false;

                if (File.Exists(attachmentPath))
                {
                    message.Attachments.Add(new Attachment(attachmentPath));
                }

                await smtp.SendMailAsync(message);
            }
        }
        public void SendEmployeeCredentials(string toEmail, string employeeName)
        {
            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
            {
                smtp.EnableSsl = true;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential(_fromEmail, _appPassword);

                var message = new MailMessage();
                message.From = new MailAddress(_fromEmail);
                message.To.Add(toEmail);
                message.Subject = "EMS Login Details";

                message.Body = $"Hello {employeeName},\n\n" +
                               $"Your account is created in Pirnav Company.\n\n" +
                               $"Login Link: https://hrms.pirnav.com/register\n" +
                               $"Newly User Verify your account by using Register and Login.";

                smtp.Send(message);
            }
        }


        public async Task SendEmailAsync(
    string toEmail,
    string subject,
    string body)
        {
            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
            {
                smtp.EnableSsl = true;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential(
                    _fromEmail,
                    _appPassword);

                var message = new MailMessage();

                message.From = new MailAddress(_fromEmail);
                message.To.Add(toEmail);

                message.Subject = subject;
                message.Body = body;
                message.IsBodyHtml = true;

                await smtp.SendMailAsync(message);
            }
        }
        public async Task SendLocationMismatchEmail(
    string adminEmail,
    string employeeId,
    string employeeName,
    string employeeEmail,
    decimal checkInLatitude,
    decimal checkInLongitude,
    decimal checkOutLatitude,
    decimal checkOutLongitude,
    decimal distance,
    string reason)
        {
            using (var smtp = new SmtpClient("smtp.gmail.com", 587))
            {
                smtp.EnableSsl = true;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential(
                    _fromEmail,
                    _appPassword);

                var message = new MailMessage();

                message.From = new MailAddress(_fromEmail);

                message.To.Add(adminEmail);

                message.Subject =
     $"Location Mismatch Alert | {employeeId} - {employeeName}";

                message.Body =
 $@"Employee Location Change Alert

Employee ID:
{employeeId}

Employee Name:
{employeeName}

Employee Email:
{employeeEmail}

--------------------------------

Check-In Location

Latitude:
{checkInLatitude}

Longitude:
{checkInLongitude}

--------------------------------

Check-Out Location

Latitude:
{checkOutLatitude}

Longitude:
{checkOutLongitude}

--------------------------------

Distance:
{Math.Round(distance, 2)} meters

--------------------------------

Reason Entered By Employee:

{reason}

--------------------------------

Generated By EMS Attendance System";
                await smtp.SendMailAsync(message);
            }
        }
    }
}
