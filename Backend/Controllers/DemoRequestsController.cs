using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/demo-requests")]
    public class DemoRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public DemoRequestsController(AppDbContext context, IEmailService emailService, IConfiguration configuration)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
        }

        // Public endpoint: visitors can submit an enquiry from the website.
        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDemoRequestDto dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var request = new DemoRequest
            {
                Name = dto.Name.Trim(),
                Email = dto.Email.Trim(),
                Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
                Company = string.IsNullOrWhiteSpace(dto.Company) ? null : dto.Company.Trim(),
                Message = dto.Message.Trim(),
                Status = "New",
                CreatedAt = DateTime.UtcNow
            };

            _context.DemoRequests.Add(request);
            await _context.SaveChangesAsync();

            // Keep the enquiry saved even if an email cannot be delivered.
            // Resolve the notification recipient from the saved landing-page contact setting.
            var adminEmail = await _context.SystemSettings

    .AsNoTracking()

    .Where(x => x.SettingKey == "LandingPageContactEmail")

    .Select(x => x.SettingValue)

    .FirstOrDefaultAsync();
            if (!string.IsNullOrWhiteSpace(adminEmail))
            {
                try
                {
                    var subject = $"New website enquiry #{request.Id}";
                    var body = $@"<h3>New website enquiry</h3>
<p><b>Request ID:</b> {request.Id}</p>
<p><b>Name:</b> {WebUtility.HtmlEncode(request.Name)}</p>
<p><b>Email:</b> {WebUtility.HtmlEncode(request.Email)}</p>
<p><b>Phone:</b> {WebUtility.HtmlEncode(request.Phone ?? "Not provided")}</p>
<p><b>Company:</b> {WebUtility.HtmlEncode(request.Company ?? "Not provided")}</p>
<p><b>Message:</b><br>{WebUtility.HtmlEncode(request.Message).Replace("\n", "<br>")}</p>";
                    await _emailService.SendEmailForPurposeAsync(
                        EmailPurposes.DemoRequestNotification,
                        adminEmail,
                        subject,
                        body,
                        replyToEmail: request.Email,
                        senderDisplayName: $"{request.Name} <{request.Email}>");

                }
                catch (Exception ex)
                {
                    // The request remains persisted; log details for server-side troubleshooting.
                    Console.Error.WriteLine($"Demo request {request.Id} saved, but admin notification failed: {ex.Message}");
                }
            }
            else
            {

                Console.Error.WriteLine(

                    $"Demo request {request.Id} saved, but landing-page contact email is not configured.");

            }

            try
            {

                var customerSubject = "We Have Received Your Demo Request - PeopleHRSync";

                var customerBody = $@"<p>Dear {WebUtility.HtmlEncode(request.Name)},</p>
 
<p>Thank you for reaching out to PeopleHRSync and expressing interest.</p>
 
<p>We have successfully received your demo request and appreciate the opportunity to connect with you.</p>
 
<p>Our team will review your preferred demo date and time and check the availability of the requested slot. Once availability is confirmed, we will get back to you with the next steps and demo scheduling details.</p>
 
<p>During the demo, we would be happy to:</p>
 
<ul>
<li>Understand your organization's requirements and business needs.</li>
<li>Provide an overview of the PeopleHRSync platform and its key features.</li>
<li>Walk you through the functionalities relevant to your requirements.</li>
<li>Address your questions and discuss how PeopleHRSync can support your HR management processes.</li>
</ul>
 
<p>If your preferred time slot is unavailable, our team will coordinate with you to suggest an alternative convenient time.</p>
 
<p>We appreciate your interest in PeopleHRSync and look forward to connecting with you.</p>
 
<p>Best Regards,<br>
 
Team PeopleHRSync</p>";

                await _emailService.SendEmailForPurposeAsync(
                    EmailPurposes.DemoRequestReply,
                    request.Email,
                    customerSubject,
                    customerBody);

                Console.WriteLine($"Confirmation email sent successfully to {request.Email}");

            }

            catch (Exception ex)

            {

                Console.Error.WriteLine(

                    $"Demo request {request.Id} saved, but customer confirmation email failed: {ex.Message}");

            }


            return CreatedAtAction(nameof(GetById), new { id = request.Id }, new
            {
                success = true,
                message = "Your enquiry has been submitted successfully.",
                data = new { request.Id, request.Name, request.Email, request.Phone, request.Company, request.Message, request.Status, request.CreatedAt }
            });
        }

        // Super Admin only: list enquiries for the dashboard.
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var requests = await _context.DemoRequests.AsNoTracking()
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new { r.Id, r.Name, r.Email, r.Phone, r.Company, r.Message, r.Status, r.CreatedAt, r.RepliedAt })
                .ToListAsync();
            return Ok(new { success = true, count = requests.Count, data = requests });
        }

        // Super Admin only: get one enquiry with full details and any reply.
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            // Load the request as a tracked entity so its status can be updated.
            var request = await _context.DemoRequests
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Demo request not found."
                });
            }

            // Mark the request as Seen only when it is still New.
            // Do not overwrite Seen or Replied when the request is opened again.
            if (string.Equals(request.Status, "New", StringComparison.OrdinalIgnoreCase))
            {
                request.Status = "Seen";
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                success = true,
                data = request
            });
        }

        // Super Admin only: save the reply and email it to the client.
        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("{id:int}/reply")]
        public async Task<IActionResult> Reply(int id, [FromBody] ReplyDemoRequestDto dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var request = await _context.DemoRequests.FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound(new { success = false, message = "Demo request not found." });

            var reply = dto.Reply.Trim();
            var subject = $"Reply to your enquiry #{request.Id}";
            var body = $@"<p>Hello {WebUtility.HtmlEncode(request.Name)},</p>
<p>Thank you for contacting us. Here is our reply:</p>
<p>{WebUtility.HtmlEncode(reply).Replace("\n", "<br>")}</p>
<p>Regards,<br>PeopleHrsync Team</p>";

            try
            {
                await _emailService.SendEmailForPurposeAsync(EmailPurposes.DemoRequestReply, request.Email, subject, body);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { success = false, message = "The reply email could not be sent. The request was not marked as replied.", detail = ex.Message });
            }

            request.AdminReply = reply;
            request.RepliedAt = DateTime.UtcNow;
            request.Status = "Replied";
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Reply emailed to the client successfully.", data = new { request.Id, request.Email, request.Status, request.AdminReply, request.RepliedAt } });
        }

        // Super Admin only: delete the selected enquiry record.
        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var request = await _context.DemoRequests.FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound(new { success = false, message = "Demo request not found." });
            _context.DemoRequests.Remove(request);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Demo request deleted successfully." });
        }
    }
}

