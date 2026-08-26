using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using System.Net;
using System.Net.Mail;

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

        public async Task SendEmployeeCredentials(
     string toEmail,
     string employeeName)
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

                smtp.DeliveryMethod =
                    SmtpDeliveryMethod.Network;

                smtp.Timeout = 60000;

                using var message = new MailMessage();

                message.From = new MailAddress(
                    settings.SenderEmail,
                    settings.DisplayName);

                message.To.Add(toEmail);

                message.Subject =
                    "Welcome to Pirnav HRMS – Your Employee Account Has Been Created";

                message.Body = $@"
<!DOCTYPE html>
<html>

<head>
    <meta charset='UTF-8'>
</head>

<body style='font-family: Segoe UI, Arial, sans-serif;
             background-color: #f5f6f8;
             padding: 20px;
             margin: 0;'>

    <div style='max-width: 650px;
                margin: auto;
                background: #ffffff;
                padding: 30px;
                border-radius: 8px;'>

        <h2 style='margin-top: 0;'>
            Welcome to Pirnav HRMS
        </h2>

        <p>
            Dear <strong>{employeeName}</strong>,
        </p>

        <p>
            Welcome to <strong>Pirnav</strong>.
            Your employee account has been successfully created
            in the Pirnav Human Resource Management System (HRMS).
        </p>

        <p>
            You can use the HRMS portal to access your employee
            information and the features assigned to your role.
        </p>

        <div style='background-color: #f7f7f7;
                    padding: 15px;
                    border-radius: 6px;
                    margin: 20px 0;'>

            <p style='margin: 5px 0;'>
                <strong>Name:</strong> {employeeName}
            </p>

            <p style='margin: 5px 0;'>
                <strong>Email:</strong> {toEmail}
            </p>

        </div>

        <h3>Getting Started</h3>

        <p>
            Please use the link below to access the HRMS portal.
            If you are accessing the system for the first time,
            complete the registration/account verification process
            using your registered email address.
        </p>

        <div style='text-align: center;
                    margin: 25px 0;'>

            <a href='https://hrms.pirnav.com/register'
               style='display: inline-block;
                      padding: 12px 24px;
                      background-color: #1f2937;
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 5px;
                      font-weight: 600;'>

                Register Your Account

            </a>

        </div>

        <p>
            Portal:
            <a href='https://hrms.pirnav.com/register'>
                https://hrms.pirnav.com/register
            </a>
        </p>

        <p>
            Please complete the registration and verification
            process before attempting to log in.
        </p>

        <p>
            If you experience any difficulty accessing your account,
            please contact the HR or system administrator for assistance.
        </p>

        <p style='margin-top: 30px;'>
            Regards,<br>
            <strong>HR Team</strong><br>
            Pirnav Software Solutions
        </p>

        <hr style='border: none;
                   border-top: 1px solid #dddddd;
                   margin-top: 30px;'>

        <p style='font-size: 12px;
                  color: #777777;'>

            This is an automated email generated by Pirnav HRMS.
            Please do not reply to this email.

        </p>

    </div>

</body>

</html>";

                // IMPORTANT
                message.IsBodyHtml = true;

                await smtp.SendMailAsync(message);
            }
            catch (SmtpException ex)
            {
                Console.WriteLine("SMTP ERROR");
                Console.WriteLine($"Message: {ex.Message}");
                Console.WriteLine($"Status Code: {ex.StatusCode}");
                Console.WriteLine(
                    $"Inner Exception: {ex.InnerException?.Message}");

                throw new Exception(
                    $"Failed to send email: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"General Error: {ex.Message}");

                throw;
            }
        }

        //    public async Task SendEmailWithAttachmentAsync(
        //string to,
        //string subject,
        //string body,
        //string attachmentPath)
        //    {
        //        var email = new MimeMessage();

        //        email.From.Add(MailboxAddress.Parse(_configuration["EmailSettings:From"]));

        //        email.To.Add(MailboxAddress.Parse(to));

        //        email.Subject = subject;

        //        var builder = new BodyBuilder
        //        {
        //            HtmlBody = body
        //        };

        //        if (File.Exists(attachmentPath))
        //        {
        //            builder.Attachments.Add(attachmentPath);
        //        }

        //        email.Body = builder.ToMessageBody();

        //        using var smtp = new MailKit.Net.Smtp.SmtpClient();

        //        await smtp.ConnectAsync(
        //            _configuration["EmailSettings:SmtpServer"],
        //            int.Parse(_configuration["EmailSettings:Port"]),
        //            MailKit.Security.SecureSocketOptions.StartTls);

        //        await smtp.AuthenticateAsync(
        //            _configuration["EmailSettings:Username"],
        //            _configuration["EmailSettings:Password"]);

        //        await smtp.SendAsync(email);

        //        await smtp.DisconnectAsync(true);
        //    }
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

        public async Task SendPayslipEmail(
    string toEmail,
    string employeeName,
    string month,
    int year,
    string attachmentPath)
        {
            var settings = GetEmailSettings();

            using var smtp = new SmtpClient(settings.SmtpHost, settings.SmtpPort);

            smtp.EnableSsl = settings.EnableSSL;
            smtp.UseDefaultCredentials = false;
            smtp.Credentials = new NetworkCredential(
                settings.SenderEmail,
                settings.SenderPassword);

            smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
            smtp.Timeout = 60000;

            using var message = new MailMessage();

            message.From = new MailAddress(
                settings.SenderEmail,
                settings.DisplayName);

            message.To.Add(toEmail);

            message.Subject = $"Salary Payslip - {month} {year}";

            message.IsBodyHtml = true;

            message.Body = $@"
<html>
<body style='font-family:Segoe UI,Arial,sans-serif;'>

<p>Dear <b>{employeeName}</b>,</p>

<p>
Please find attached your salary payslip for
<b>{month} {year}</b>.
</p>

<p>
Kindly review the attached payslip.
For any clarification, please contact the HR Department.
</p>

<br/>

<p>
Regards,<br/>
<b>HR Team</b><br/>
Pirnav Software Solutions Pvt. Ltd.
</p>

<hr/>

<p style='font-size:12px;color:gray'>
This is a system generated email. Please do not reply.
</p>

</body>
</html>";

            if (!File.Exists(attachmentPath))
                throw new Exception($"Payslip not found: {attachmentPath}");

            message.Attachments.Add(new Attachment(attachmentPath));

            await smtp.SendMailAsync(message);
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
 
Employee ID: {employeeId}
 
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

{Math.Round(distance, 2)} KM
 
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
 