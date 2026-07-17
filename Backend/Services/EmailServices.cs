using EmployeeManagementSystem.Interfaces;

using System.Net;

using System.Net.Mail;

using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class EmailService : IEmailService

    {

        private readonly AppDbContext _context;

        public EmailService(AppDbContext context)

        {

            _context = context;

        }

        private EmailSettings GetEmailSettings()

        {

            var settings = _context.EmailSettings.AsNoTracking().FirstOrDefault();

            if (settings == null)

                throw new Exception("Email Settings not configured.");

            return settings;

        }

        // ✅ Existing OTP Method (Keep Working)

        public async Task SendOtpAsync(string toEmail, string otp)
        {
            var settings = GetEmailSettings();

            try
            {
                using var smtp = new SmtpClient(
                    settings.SmtpHost,
                    settings.SmtpPort);

                smtp.EnableSsl = settings.EnableSSL;
                smtp.UseDefaultCredentials = false;

                smtp.Credentials = new NetworkCredential(
                    settings.SenderEmail,
                    settings.SenderPassword);

                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
                smtp.Timeout = 30000;

                using var message = new MailMessage();

                message.From = new MailAddress(
                    settings.SenderEmail,
                    settings.DisplayName);

                message.To.Add(toEmail);

                message.Subject = "Password Reset OTP";

                message.Body = $@"
Hello,

Your OTP for resetting your EMS password is:

{otp}

This OTP is confidential. Please do not share it with anyone.

Regards,
Pirnav EMS Team";

                message.IsBodyHtml = false;

                await smtp.SendMailAsync(message);
            }
            catch (SmtpException ex)
            {
                Console.WriteLine("SMTP ERROR");
                Console.WriteLine($"Message: {ex.Message}");
                Console.WriteLine($"Status Code: {ex.StatusCode}");
                Console.WriteLine($"Inner: {ex.InnerException?.Message}");

                throw;
            }
        } // ✅ New Method For Offer Letter Attachment

        public async Task SendEmailWithAttachment(

            string toEmail,

            string subject,

            string body,

            string attachmentPath)

        {

            var settings = GetEmailSettings();

            using (var smtp = new SmtpClient(settings.SmtpHost, settings.SmtpPort))

            {

                smtp.EnableSsl = settings.EnableSSL;

                smtp.UseDefaultCredentials = false;

                smtp.Credentials = new NetworkCredential(

     settings.SenderEmail,

     settings.SenderPassword);

                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;

                var message = new MailMessage();

                message.From = new MailAddress(

    settings.SenderEmail,

    settings.DisplayName);

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

        public async Task SendEmployeeCredentials(string toEmail, string employeeName)
        {
            var settings = GetEmailSettings();

            try
            {
                using var smtp = new SmtpClient(settings.SmtpHost, settings.SmtpPort);

                smtp.EnableSsl = settings.EnableSSL;
                smtp.UseDefaultCredentials = false;
                smtp.Credentials = new NetworkCredential(
                    settings.SenderEmail,
                    settings.SenderPassword);

                smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
                smtp.Timeout = 60000; // 60 seconds

                using var message = new MailMessage();

                message.From = new MailAddress(
                    settings.SenderEmail,
                    settings.DisplayName);

                message.To.Add(toEmail);

                message.Subject = "EMS Login Details";

                message.Body = $@"
Hello {employeeName},

Your account has been created successfully in Pirnav EMS.

Login URL:
https://hrms.pirnav.com/register

Please register and verify your account before logging in.

Regards,
Pirnav HR Team";

                message.IsBodyHtml = false;

                await smtp.SendMailAsync(message);
            }
            catch (SmtpException ex)
            {
                Console.WriteLine("SMTP ERROR");
                Console.WriteLine($"Message: {ex.Message}");
                Console.WriteLine($"Status Code: {ex.StatusCode}");
                Console.WriteLine($"Inner Exception: {ex.InnerException?.Message}");

                throw new Exception($"Failed to send email: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General Error: {ex.Message}");
                throw;
            }
        }

        public async Task SendEmailAsync(

    string toEmail,

    string subject,

    string body)

        {

            var settings = GetEmailSettings();

            using (var smtp = new SmtpClient(settings.SmtpHost, settings.SmtpPort))

            {

                smtp.EnableSsl = settings.EnableSSL;

                smtp.UseDefaultCredentials = false;

                smtp.Credentials = new NetworkCredential(

     settings.SenderEmail,

     settings.SenderPassword);

                var message = new MailMessage();

                message.From = new MailAddress(

    settings.SenderEmail,

    settings.DisplayName);

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

            var settings = GetEmailSettings();

            using (var smtp = new SmtpClient(settings.SmtpHost, settings.SmtpPort))

            {

                smtp.EnableSsl = settings.EnableSSL;

                smtp.UseDefaultCredentials = false;

                smtp.Credentials = new NetworkCredential(

    settings.SenderEmail,

    settings.SenderPassword);

                var message = new MailMessage();

                message.From = new MailAddress(

    settings.SenderEmail,

    settings.DisplayName);

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
 