using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    public class SettingsController : ControllerBase

    {

        private readonly AppDbContext _context;

        private readonly IWebHostEnvironment _environment; //vishnu

        public SettingsController(

    AppDbContext context,

    IWebHostEnvironment environment)

        {

            _context = context;

            _environment = environment;  //vishnu

        }

        [HttpGet("email")]

        public IActionResult GetEmailSettings()

        {

            var settings = _context.EmailSettings.FirstOrDefault();

            if (settings == null)

                return NotFound("Email settings not found.");

            return Ok(settings);

        }

        [HttpPut("email")]

        public IActionResult UpdateEmailSettings([FromBody] EmailSettings model)

        {

            var settings = _context.EmailSettings.FirstOrDefault();

            if (settings == null)

            {

                model.UpdatedAt = DateTime.Now;

                _context.EmailSettings.Add(model);

            }

            else

            {

                settings.SenderEmail = model.SenderEmail;

                settings.SenderPassword = model.SenderPassword;

                settings.SmtpHost = model.SmtpHost;

                settings.SmtpPort = model.SmtpPort;

                settings.EnableSSL = model.EnableSSL;

                settings.DisplayName = model.DisplayName;

                settings.UpdatedAt = DateTime.Now;

            }

            _context.SaveChanges();

            return Ok(new

            {

                message = "Email Settings Updated Successfully"

            });

        }

        //vishnu change

        [HttpGet("attendance")]

        public IActionResult GetAttendanceSettings()

        {

            var settings = _context.AttendanceSettings

                .OrderByDescending(x => x.Id)

                .FirstOrDefault();

            if (settings == null)

                return NotFound("Attendance settings not found.");

            return Ok(settings);

        }

        //

        [HttpPut("attendance")]

        public IActionResult UpdateAttendanceSettings([FromBody] AttendanceSettings model)

        {

            if (!ModelState.IsValid)

            {

                var errors = ModelState

                    .Where(x => x.Value.Errors.Count > 0)

                    .Select(x => new

                    {

                        Field = x.Key,

                        Errors = x.Value.Errors.Select(e => e.ErrorMessage).ToList()

                    });

                return BadRequest(errors);

            }

            //vishnu

            var settings = _context.AttendanceSettings

     .OrderByDescending(x => x.Id)

     .FirstOrDefault();

            //

            if (settings == null)

            {

                model.UpdatedAt = DateTime.Now;

                _context.AttendanceSettings.Add(model);

            }

            else

            {

                settings.OfficeStartTime = model.OfficeStartTime;

                settings.OfficeEndTime = model.OfficeEndTime;

                settings.CheckInStartTime = model.CheckInStartTime;

                settings.LateAfterTime = model.LateAfterTime;

                settings.CheckoutTime = model.CheckoutTime;

                settings.HalfDayHours = model.HalfDayHours;

                settings.UpdatedAt = DateTime.Now;

            }

            _context.SaveChanges();

            return Ok(new

            {

                message = "Attendance Settings Updated Successfully"

            });

        }


        [HttpGet("leave")]

        public IActionResult GetLeaveSettings()

        {

            var settings = _context.LeaveSettings.FirstOrDefault();

            if (settings == null)

                return NotFound("Leave settings not found.");

            return Ok(settings);

        }

        [HttpPut("leave")]

        public IActionResult UpdateLeaveSettings([FromBody] LeaveSettings model)

        {

            var settings = _context.LeaveSettings.FirstOrDefault();

            if (settings == null)

            {

                model.UpdatedAt = DateTime.Now;

                _context.LeaveSettings.Add(model);

            }

            else

            {

                settings.ApprovalRoles = model.ApprovalRoles;

                settings.ExternalEmails = model.ExternalEmails;

                settings.CcEmails = model.CcEmails;

                settings.AllowHalfDay = model.AllowHalfDay;

                settings.MaxLeaveDays = model.MaxLeaveDays;

                settings.AdvanceNoticeDays = model.AdvanceNoticeDays;

                settings.AttachmentRequired = model.AttachmentRequired;

                settings.UpdatedAt = DateTime.Now;

            }

            _context.SaveChanges();

            return Ok(new

            {

                message = "Leave Settings Updated Successfully"

            });

        }


        [HttpGet("company")]

        public IActionResult GetCompanySettings()

        {

            var settings = _context.CompanySettings.FirstOrDefault();

            if (settings == null)

                return NotFound("Company settings not found.");

            return Ok(settings);

        }

        [HttpPut("company")]

        public IActionResult UpdateCompanySettings([FromBody] CompanySettings model)

        {

            var settings = _context.CompanySettings.FirstOrDefault();

            if (settings == null)

            {

                model.UpdatedAt = DateTime.Now;

                _context.CompanySettings.Add(model);

            }

            else

            {

                settings.CompanyName = model.CompanyName;

                settings.CompanyShortName = model.CompanyShortName;

                settings.CompanyEmail = model.CompanyEmail;

                settings.CompanyPhone = model.CompanyPhone;

                settings.CompanyWebsite = model.CompanyWebsite;

                settings.CompanyAddress = model.CompanyAddress;

                settings.LogoUrl = model.LogoUrl;

                settings.GSTNumber = model.GSTNumber;

                settings.CINNumber = model.CINNumber;

                settings.UpdatedAt = DateTime.Now;

            }


            // ===========================

            // Update Company Master

            // ===========================

            var company = _context.Company.FirstOrDefault();

            if (company != null)

            {

                company.CompanyName = model.CompanyName;

                company.PhoneNumber = model.CompanyPhone;

                company.EmailAddress = model.CompanyEmail;

                company.GSTNumber = model.GSTNumber;

                company.UpdatedAt = DateTime.Now;

            }

            _context.SaveChanges();

            return Ok(new

            {

                message = "Company Settings Updated Successfully"

            });

        }


        [HttpGet("notification")]

        public IActionResult GetNotificationSettings()

        {

            var settings = _context.NotificationSettings.FirstOrDefault();

            if (settings == null)

                return NotFound("Notification settings not found.");

            return Ok(settings);

        }


        [HttpPut("notification")]

        public IActionResult UpdateNotificationSettings([FromBody] NotificationSettings model)

        {

            var settings = _context.NotificationSettings.FirstOrDefault();

            if (settings == null)

            {

                model.UpdatedAt = DateTime.Now;

                _context.NotificationSettings.Add(model);

            }

            else

            {

                settings.EnableEmailNotifications = model.EnableEmailNotifications;

                settings.EnableAttendanceEmails = model.EnableAttendanceEmails;

                settings.EnableLeaveEmails = model.EnableLeaveEmails;

                settings.EnableWFHEmails = model.EnableWFHEmails;

                settings.EnableTicketEmails = model.EnableTicketEmails;

                settings.EnableAssetEmails = model.EnableAssetEmails;

                settings.EnableOfferLetterEmails = model.EnableOfferLetterEmails;

                settings.EnablePayslipEmails = model.EnablePayslipEmails;

                settings.EnableLocationMismatchEmails = model.EnableLocationMismatchEmails;

                settings.UpdatedAt = DateTime.Now;

            }

            _context.SaveChanges();

            return Ok(new

            {

                message = "Notification Settings Updated Successfully"

            });

        }

        [HttpGet("general")]

        public IActionResult GetGeneralSettings()

        {

            var settings = _context.GeneralSettings.FirstOrDefault();

            if (settings == null)

                return NotFound("General settings not found.");

            return Ok(settings);

        }

        [HttpPut("general")]

        public IActionResult UpdateGeneralSettings([FromBody] GeneralSettings model)

        {

            var settings = _context.GeneralSettings.FirstOrDefault();

            if (settings == null)

            {

                model.UpdatedAt = DateTime.Now;

                _context.GeneralSettings.Add(model);

            }

            else

            {

                settings.CompanyTimeZone = model.CompanyTimeZone;

                settings.DateFormat = model.DateFormat;

                settings.TimeFormat = model.TimeFormat;

                settings.CurrencySymbol = model.CurrencySymbol;

                settings.SessionTimeout = model.SessionTimeout;

                settings.FinancialYearStartMonth = model.FinancialYearStartMonth;

                settings.UpdatedAt = DateTime.Now;

            }

            _context.SaveChanges();

            return Ok(new

            {

                message = "General Settings Updated Successfully"

            });

        }

        [HttpGet("policies")]

        public IActionResult GetPolicies()

        {

            return Ok(_context.PolicySettings.ToList());

        }

        [HttpGet("policy/{type}")]

        public IActionResult GetPolicy(string type)

        {

            var policy = _context.PolicySettings

                .FirstOrDefault(x => x.PolicyType == type);

            if (policy == null)

                return NotFound();

            return Ok(policy);

        }

        [HttpPut("policy")]

        public IActionResult UpdatePolicy([FromBody] PolicySettings model)

        {

            var policy = _context.PolicySettings

                .FirstOrDefault(x => x.Id == model.Id);

            if (policy == null)

                return NotFound();

            policy.PolicyTitle = model.PolicyTitle;

            policy.PolicyContent = model.PolicyContent;

            policy.Version = model.Version;

            policy.EffectiveFrom = model.EffectiveFrom;

            policy.IsActive = model.IsActive;

            policy.UpdatedAt = DateTime.Now;

            _context.SaveChanges();

            return Ok(new

            {

                message = "Policy Updated Successfully"

            });

        }



        //vishnu change

        [HttpPost("branding/logo")]

        public async Task<IActionResult> UploadBrandingLogo(IFormFile file)

        {

            if (file == null || file.Length == 0)

                return BadRequest("No file selected.");

            var allowedExtensions = new[]

            {

        ".png",

        ".jpg",

        ".jpeg",

        ".webp",

        ".svg"

    };

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))

                return BadRequest("Only PNG, JPG, JPEG, WEBP and SVG files are allowed.");

            var uploadsFolder = Path.Combine(

                _environment.WebRootPath,

                "uploads",

                "branding");

            if (!Directory.Exists(uploadsFolder))

                Directory.CreateDirectory(uploadsFolder);

            var fileName =

                $"branding_logo_{DateTime.UtcNow.Ticks}{extension}";

            var filePath = Path.Combine(

                uploadsFolder,

                fileName);

            using (var stream = new FileStream(

                filePath,

                FileMode.Create))

            {

                await file.CopyToAsync(stream);

            }

            var logoUrl = "/uploads/branding/" + fileName;

            var branding = await _context.BrandingSettings

                .FirstOrDefaultAsync();

            if (branding == null)

            {

                branding = new BrandingSettings

                {

                    Company_Id = 1,

                    CompanyLogo = logoUrl,

                    LoginLogo = logoUrl,

                    SidebarLogo = logoUrl,

                    CreatedDate = DateTime.Now

                };

                _context.BrandingSettings.Add(branding);

            }

            else

            {

                branding.CompanyLogo = logoUrl;

                branding.LoginLogo = logoUrl;

                branding.SidebarLogo = logoUrl;

            }

            await _context.SaveChangesAsync();

            return Ok(new

            {

                success = true,

                message = "Branding logo uploaded successfully.",

                logoUrl = logoUrl

            });

        }

        [HttpGet("branding")]

        public async Task<IActionResult> GetBranding()

        {

            var branding = await _context.BrandingSettings

                .FirstOrDefaultAsync();

            if (branding == null)

                return NotFound("Branding settings not found.");

            return Ok(branding);

        }

    }

}




