using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class BirthdayEmailService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BirthdayEmailService> _logger;

        private static readonly TimeZoneInfo IndiaTimeZone =
            TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows()
                    ? "India Standard Time"
                    : "Asia/Kolkata");

        public BirthdayEmailService(
            IServiceScopeFactory scopeFactory,
            ILogger<BirthdayEmailService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(
      CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "Birthday Email Service started.");

            try
            {
                // TEST MODE:
                // Check today's birthdays immediately when application starts.
                await SendBirthdayEmailsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Application is shutting down
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error in Birthday Email Service.");
            }

            _logger.LogInformation(
                "Birthday Email Service test completed.");
        }

        private async Task SendBirthdayEmailsAsync(
            CancellationToken cancellationToken)
        {
            using var scope =
                _scopeFactory.CreateScope();

            var context =
                scope.ServiceProvider
                    .GetRequiredService<AppDbContext>();

            var emailService =
                scope.ServiceProvider
                    .GetRequiredService<IEmailService>();

            var todayIst =
                TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.UtcNow,
                    IndiaTimeZone);

            _logger.LogInformation(
                "Checking birthdays for {Date}.",
                todayIst.ToString("dd-MM-yyyy"));

            var employees =
     await (
         from employee in context.Employees
         join personal in context.EmployeePersonalInfos
             on employee.Employee_Id equals personal.Employee_Id
         where personal.DateOfBirth.Month == todayIst.Month
               && personal.DateOfBirth.Day == todayIst.Day
               && !string.IsNullOrWhiteSpace(employee.Email)
         select new
         {
             employee.Employee_Id,
             employee.Name,
             employee.Email,
             DateOfBirth = personal.DateOfBirth
         }
     )
     .ToListAsync(cancellationToken);

            if (!employees.Any())
            {
                _logger.LogInformation(
                    "No birthdays found for {Date}.",
                    todayIst.ToString("dd-MM-yyyy"));

                return;
            }

            foreach (var employee in employees)
            {
                try
                {
                    var subject =
                        $"🎉 Happy Birthday, {employee.Name}! 🎂";

                    var body =
                        BuildBirthdayEmail(
                            employee.Name);

                    // Use your existing IEmailService method
                    await emailService.SendEmailAsync(
                        employee.Email,
                        subject,
                        body);

                    _logger.LogInformation(
                        "Birthday email sent to {EmployeeId} - {Email}.",
                        employee.Employee_Id,
                        employee.Email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Birthday email failed for Employee {EmployeeId}.",
                        employee.Employee_Id);
                }
            }
        }

        private static string BuildBirthdayEmail(
            string employeeName)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8'>
<meta name='viewport'
      content='width=device-width, initial-scale=1.0'>
</head>

<body style='margin:0;
             padding:0;
             background:#f3f6fb;
             font-family:Arial,Helvetica,sans-serif;'>

<table width='100%'
       cellpadding='0'
       cellspacing='0'
       border='0'
       style='background:#f3f6fb;
              padding:35px 10px;'>

<tr>
<td align='center'>

<table width='620'
       cellpadding='0'
       cellspacing='0'
       border='0'
       style='max-width:620px;
              background:#ffffff;
              border-radius:20px;
              overflow:hidden;'>

<!-- TOP BANNER -->

<tr>
<td style='background:#0b7285;
           padding:35px 20px;
           text-align:center;'>

<div style='font-size:48px;
            line-height:1;'>
🎉
</div>

<div style='font-size:30px;
            font-weight:bold;
            color:#ffffff;
            margin-top:12px;'>
HAPPY BIRTHDAY!
</div>

<div style='font-size:15px;
            color:#e6fffb;
            margin-top:8px;'>
A special day to celebrate you
</div>

</td>
</tr>


<!-- CONFETTI STRIP -->

<tr>
<td style='background:#fff8e7;
           padding:14px;
           text-align:center;
           font-size:25px;'>
🎈 &nbsp; 🎂 &nbsp; 🎁 &nbsp; 🥳 &nbsp; 🎈
</td>
</tr>


<!-- MAIN CONTENT -->

<tr>
<td style='padding:40px 40px 30px;
           text-align:center;'>

<div style='font-size:22px;
            color:#333333;
            font-weight:bold;
            margin-bottom:15px;'>
Dear {employeeName},
</div>

<div style='font-size:17px;
            line-height:1.7;
            color:#555555;'>
Wishing you a very
</div>

<div style='font-size:25px;
            line-height:1.5;
            color:#0b7285;
            font-weight:bold;
            margin:5px 0 15px;'>
Wonderful Birthday!
</div>

<div style='font-size:16px;
            line-height:1.8;
            color:#666666;'>
May your special day be filled with
happiness, laughter and memorable moments.
</div>

</td>
</tr>


<!-- WISH CARD -->

<tr>
<td style='padding:0 35px 30px;'>

<table width='100%'
       cellpadding='0'
       cellspacing='0'
       border='0'
       style='background:#f0f9fa;
              border-radius:15px;'>

<tr>
<td style='padding:25px;
           text-align:center;'>

<div style='font-size:32px;'>
✨ 🌟 ✨
</div>

<div style='font-size:16px;
            line-height:1.7;
            color:#444444;
            margin-top:12px;'>

May the year ahead bring you
<strong>success, good health,
happiness and many achievements.</strong>

</div>

</td>
</tr>

</table>

</td>
</tr>


<!-- MESSAGE -->

<tr>
<td style='padding:5px 40px 35px;
           text-align:center;'>

<div style='font-size:15px;
            line-height:1.7;
            color:#777777;'>

Thank you for being a valuable
part of the Pirnav family.

</div>

<div style='font-size:26px;
            margin-top:20px;'>
🎊 🎂 🎊
</div>

</td>
</tr>


<!-- FOOTER -->

<tr>
<td style='background:#f8fafb;
           padding:22px;
           text-align:center;
           border-top:1px solid #eeeeee;'>

<div style='font-size:14px;
            font-weight:bold;
            color:#555555;'>
Pirnav Software Solutions Pvt. Ltd.
</div>

<div style='font-size:11px;
            color:#999999;
            margin-top:7px;'>
This is an automated birthday greeting.
</div>

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>";
        }
    }
}