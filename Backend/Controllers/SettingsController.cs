//using EmployeeManagementSystem.Data;

//using EmployeeManagementSystem.Models;

//using Microsoft.AspNetCore.Mvc;
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.DataProtection;
//using EmployeeManagementSystem.DTOs;

//using Microsoft.EntityFrameworkCore;

//namespace EmployeeManagementSystem.Controllers

//{

//    [Route("api/[controller]")]

//    [ApiController]

//    public class SettingsController : ControllerBase

//    {

//        private readonly AppDbContext _context;

//        private readonly IWebHostEnvironment _environment; //vishnu
//        private readonly IDataProtector _emailPasswordProtector;

//        public SettingsController(
//            AppDbContext context,
//            IWebHostEnvironment environment,
//            IDataProtectionProvider dataProtectionProvider)
//        {
//            _context = context;
//            _environment = environment;  //vishnu
//            _emailPasswordProtector = dataProtectionProvider.CreateProtector(EmailSenderPasswordProtection.Purpose);
//        }

//        // Landing-page contact email is stored as a key/value entry in the existing systemsettings table.private const string LandingPageContactEmailSettingKey = "LandingPageContactEmail";

//// Public: retrieve the email displayed in the landing-page footer.[AllowAnonymous]

//[HttpGet("landing-page-contact")]public async Task<IActionResult> GetLandingPageContactEmail()

//{

//    var contactEmail = await _context.SystemSettings

//        .AsNoTracking()

//        .Where(x => x.SettingKey == LandingPageContactEmailSettingKey)

//        .Select(x => x.SettingValue)

//        .FirstOrDefaultAsync();


//    if (string.IsNullOrWhiteSpace(contactEmail))

//        return NotFound(new { success = false, message = "Landing page contact email is not configured." });


//    return Ok(new { success = true, data = new { contactEmail } });

//}

//// Super Admin only: create the initial landing-page contact email.[Authorize(Roles = "SuperAdmin")]

//[HttpPost("landing-page-contact")]public async Task<IActionResult> CreateLandingPageContactEmail([FromBody] LandingPageContactEmailDto model)

//{

//    if (!ModelState.IsValid) return ValidationProblem(ModelState);


//    var email = model.ContactEmail.Trim();

//    var setting = await _context.SystemSettings

//        .FirstOrDefaultAsync(x => x.SettingKey == LandingPageContactEmailSettingKey);


//    if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingValue))

//        return Conflict(new { success = false, message = "Landing page contact email is already configured." });


//    if (setting == null)

//    {

//        setting = new SystemSetting        {

//            SettingKey = LandingPageContactEmailSettingKey,

//            SettingValue = email,

//            Description = "Email address displayed in the public landing-page footer and used for demo request notifications.",

//            GroupName = "LandingPage",

//            UpdatedAt = DateTime.UtcNow

//        };

//        _context.SystemSettings.Add(setting);

//    }

//    else    {

//        setting.SettingValue = email;

//        setting.UpdatedAt = DateTime.UtcNow;

//    }


//    await _context.SaveChangesAsync();

//    return Ok(new    {

//        success = true,

//        message = "Landing page contact email created successfully.",

//        data = new { id = setting.Id, contactEmail = setting.SettingValue }

//    });

//}

//        // Super Admin only: update the configured landing-page contact email.[Authorize(Roles = "SuperAdmin")]

//        [HttpPut("landing-page-contact")]
//        public async Task<IActionResult> UpdateLandingPageContactEmail([FromBody] LandingPageContactEmailDto model)

//        {

//            if (!ModelState.IsValid) return ValidationProblem(ModelState);


//            var setting = await _context.SystemSettings

//                .FirstOrDefaultAsync(x => x.SettingKey == LandingPageContactEmailSettingKey

//                    && x.SettingValue != null && x.SettingValue != "");


//            if (setting == null)

//                return NotFound(new { success = false, message = "Landing page contact email is not configured. Create it first." });


//            setting.SettingValue = model.ContactEmail.Trim();

//            setting.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();


//            return Ok(new
//            {

//                success = true,

//                message = "Landing page contact email updated successfully.",

//                data = new { contactEmail = setting.SettingValue }

//            });
//        }

//        [HttpGet("email")]

//        public IActionResult GetEmailSettings()

//        {

//            var settings = _context.EmailSettings.AsNoTracking().FirstOrDefault();

//            if (settings == null)

//                return NotFound("Email settings not found.");

//            // Preserve the existing response shape without exposing the SMTP password.
//            settings.SenderPassword = string.Empty;
//            return Ok(settings);

//        }

//        [HttpPut("email")]

//        public IActionResult UpdateEmailSettings([FromBody] EmailSettings model)

//        {

//            var settings = _context.EmailSettings.FirstOrDefault();

//            if (settings == null)

//            {
//                if (string.IsNullOrWhiteSpace(model.SenderPassword))
//                    return BadRequest("SenderPassword is required when creating email settings.");

//                model.UpdatedAt = DateTime.Now;

//                _context.EmailSettings.Add(model);

//            }

//            else

//            {

//                settings.SenderEmail = model.SenderEmail;

//                if (!string.IsNullOrWhiteSpace(model.SenderPassword))
//                    settings.SenderPassword = model.SenderPassword;

//                settings.SmtpHost = model.SmtpHost;

//                settings.SmtpPort = model.SmtpPort;

//                settings.EnableSSL = model.EnableSSL;

//                settings.DisplayName = model.DisplayName;

//                settings.UpdatedAt = DateTime.Now;

//            }

//            _context.SaveChanges();

//            return Ok(new

//            {

//                message = "Email Settings Updated Successfully"

//            });

//        }

//        // Additional sender accounts and purpose routing. Existing email settings routes remain available.
//        [Authorize(Roles = "Admin")]
//        [HttpGet("email-senders")]
//        public async Task<IActionResult> GetEmailSenderAccounts()
//        {
//            var accounts = await _context.EmailSenderAccounts.AsNoTracking()
//                .OrderBy(x => x.SenderEmail)
//                .Select(x => new { x.Id, x.SenderEmail, x.SmtpHost, x.SmtpPort, x.EnableSSL, x.DisplayName, x.IsActive, x.CreatedAt, x.UpdatedAt, hasPassword = x.EncryptedPassword != "" })
//                .ToListAsync();
//            return Ok(new { success = true, data = accounts });
//        }

//        [Authorize(Roles = "Admin")]
//        [HttpPost("email-senders")]
//        public async Task<IActionResult> CreateEmailSenderAccount([FromBody] EmailSenderAccountRequest model)
//        {
//            if (!ModelState.IsValid) return ValidationProblem(ModelState);
//            if (string.IsNullOrWhiteSpace(model.SenderPassword))
//                return BadRequest(new { success = false, message = "SenderPassword is required when creating a sender account." });

//            var email = model.SenderEmail.Trim();
//            if (await _context.EmailSenderAccounts.AnyAsync(x => x.SenderEmail == email))
//                return Conflict(new { success = false, message = "A sender account with this email already exists." });

//            var account = new EmailSenderAccount
//            {
//                SenderEmail = email,
//                EncryptedPassword = _emailPasswordProtector.Protect(model.SenderPassword),
//                SmtpHost = model.SmtpHost.Trim(),
//                SmtpPort = model.SmtpPort,
//                EnableSSL = model.EnableSSL,
//                DisplayName = model.DisplayName?.Trim() ?? string.Empty,
//                IsActive = model.IsActive,
//                CreatedAt = DateTime.UtcNow,
//                UpdatedAt = DateTime.UtcNow
//            };
//            _context.EmailSenderAccounts.Add(account);
//            await _context.SaveChangesAsync();
//            return CreatedAtAction(nameof(GetEmailSenderAccounts), new { id = account.Id }, new { success = true, message = "Sender account created successfully.", data = new { account.Id, account.SenderEmail, account.SmtpHost, account.SmtpPort, account.EnableSSL, account.DisplayName, account.IsActive, hasPassword = true } });
//        }

//        [Authorize(Roles = "Admin")]
//        [HttpPut("email-senders/{id:int}")]
//        public async Task<IActionResult> UpdateEmailSenderAccount(int id, [FromBody] EmailSenderAccountRequest model)
//        {
//            if (!ModelState.IsValid) return ValidationProblem(ModelState);
//            var account = await _context.EmailSenderAccounts.FirstOrDefaultAsync(x => x.Id == id);
//            if (account == null) return NotFound(new { success = false, message = "Sender account not found." });

//            var email = model.SenderEmail.Trim();
//            if (await _context.EmailSenderAccounts.AnyAsync(x => x.Id != id && x.SenderEmail == email))
//                return Conflict(new { success = false, message = "A sender account with this email already exists." });

//            account.SenderEmail = email;
//            if (!string.IsNullOrWhiteSpace(model.SenderPassword))
//                account.EncryptedPassword = _emailPasswordProtector.Protect(model.SenderPassword);
//            account.SmtpHost = model.SmtpHost.Trim();
//            account.SmtpPort = model.SmtpPort;
//            account.EnableSSL = model.EnableSSL;
//            account.DisplayName = model.DisplayName?.Trim() ?? string.Empty;
//            account.IsActive = model.IsActive;
//            account.UpdatedAt = DateTime.UtcNow;
//            await _context.SaveChangesAsync();
//            return Ok(new { success = true, message = "Sender account updated successfully.", data = new { account.Id, account.SenderEmail, account.SmtpHost, account.SmtpPort, account.EnableSSL, account.DisplayName, account.IsActive, hasPassword = !string.IsNullOrEmpty(account.EncryptedPassword) } });
//        }

//        [Authorize(Roles = "Admin")]
//        [HttpGet("email-purpose-mappings")]
//        public async Task<IActionResult> GetEmailPurposeMappings()
//        {
//            var mappings = await (from mapping in _context.EmailPurposeMappings.AsNoTracking()
//                                  join account in _context.EmailSenderAccounts.AsNoTracking() on mapping.SenderAccountId equals account.Id
//                                  orderby mapping.Purpose
//                                  select new { mapping.Id, mapping.Purpose, mapping.SenderAccountId, senderEmail = account.SenderEmail, account.IsActive, mapping.UpdatedAt })
//                .ToListAsync();
//            return Ok(new { success = true, data = mappings, supportedPurposes = new[] { EmailPurposes.DemoRequestNotification, EmailPurposes.DemoRequestReply, EmailPurposes.General } });
//        }

//        [Authorize(Roles = "Admin")]
//        [HttpPut("email-purpose-mappings")]
//        public async Task<IActionResult> UpsertEmailPurposeMapping([FromBody] EmailPurposeMappingRequest model)
//        {
//            if (!ModelState.IsValid) return ValidationProblem(ModelState);
//            var purpose = model.Purpose.Trim();
//            var account = await _context.EmailSenderAccounts.FirstOrDefaultAsync(x => x.Id == model.SenderAccountId);
//            if (account == null) return BadRequest(new { success = false, message = "Sender account does not exist." });
//            if (!account.IsActive) return BadRequest(new { success = false, message = "Select an active sender account." });

//            var mapping = await _context.EmailPurposeMappings.FirstOrDefaultAsync(x => x.Purpose == purpose);
//            if (mapping == null)
//            {
//                mapping = new EmailPurposeMapping { Purpose = purpose, SenderAccountId = account.Id, UpdatedAt = DateTime.UtcNow };
//                _context.EmailPurposeMappings.Add(mapping);
//            }
//            else
//            {
//                mapping.SenderAccountId = account.Id;
//                mapping.UpdatedAt = DateTime.UtcNow;
//            }
//            await _context.SaveChangesAsync();
//            return Ok(new { success = true, message = "Email purpose mapping saved successfully.", data = new { mapping.Id, mapping.Purpose, mapping.SenderAccountId, senderEmail = account.SenderEmail, mapping.UpdatedAt } });
//        }

//        //vishnu change

//        [HttpGet("attendance")]

//        public IActionResult GetAttendanceSettings()

//        {

//            var settings = _context.AttendanceSettings

//                .OrderByDescending(x => x.Id)

//                .FirstOrDefault();

//            if (settings == null)

//                return NotFound("Attendance settings not found.");

//            return Ok(settings);

//        }

//        //

//        [HttpPut("attendance")]

//        public IActionResult UpdateAttendanceSettings([FromBody] AttendanceSettings model)

//        {

//            if (!ModelState.IsValid)

//            {

//                var errors = ModelState

//                    .Where(x => x.Value.Errors.Count > 0)

//                    .Select(x => new

//                    {

//                        Field = x.Key,

//                        Errors = x.Value.Errors.Select(e => e.ErrorMessage).ToList()

//                    });

//                return BadRequest(errors);

//            }

//            //vishnu

//            var settings = _context.AttendanceSettings

//     .OrderByDescending(x => x.Id)

//     .FirstOrDefault();

//            //

//            if (settings == null)

//            {

//                model.UpdatedAt = DateTime.Now;

//                _context.AttendanceSettings.Add(model);

//            }

//            else

//            {

//                settings.OfficeStartTime = model.OfficeStartTime;

//                settings.OfficeEndTime = model.OfficeEndTime;

//                settings.CheckInStartTime = model.CheckInStartTime;

//                settings.LateAfterTime = model.LateAfterTime;

//                settings.CheckoutTime = model.CheckoutTime;

//                settings.HalfDayHours = model.HalfDayHours;

//                settings.UpdatedAt = DateTime.Now;

//            }

//            _context.SaveChanges();

//            return Ok(new

//            {

//                message = "Attendance Settings Updated Successfully"

//            });

//        }


//        [HttpGet("leave")]

//        public IActionResult GetLeaveSettings()

//        {

//            var settings = _context.LeaveSettings.FirstOrDefault();

//            if (settings == null)

//                return NotFound("Leave settings not found.");

//            return Ok(settings);

//        }

//        [HttpPut("leave")]

//        public IActionResult UpdateLeaveSettings([FromBody] LeaveSettings model)

//        {

//            var settings = _context.LeaveSettings.FirstOrDefault();

//            if (settings == null)

//            {

//                model.UpdatedAt = DateTime.Now;

//                _context.LeaveSettings.Add(model);

//            }

//            else

//            {

//                settings.ApprovalRoles = model.ApprovalRoles;

//                settings.ExternalEmails = model.ExternalEmails;

//                settings.CcEmails = model.CcEmails;

//                settings.AllowHalfDay = model.AllowHalfDay;

//                settings.MaxLeaveDays = model.MaxLeaveDays;

//                settings.AdvanceNoticeDays = model.AdvanceNoticeDays;

//                settings.AttachmentRequired = model.AttachmentRequired;

//                settings.UpdatedAt = DateTime.Now;

//            }

//            _context.SaveChanges();

//            return Ok(new

//            {

//                message = "Leave Settings Updated Successfully"

//            });

//        }


//        [HttpGet("company")]

//        public IActionResult GetCompanySettings()

//        {

//            var settings = _context.CompanySettings.FirstOrDefault();

//            if (settings == null)

//                return NotFound("Company settings not found.");

//            return Ok(settings);

//        }

//        [HttpPut("company")]

//        public IActionResult UpdateCompanySettings([FromBody] CompanySettings model)

//        {

//            var settings = _context.CompanySettings.FirstOrDefault();

//            if (settings == null)

//            {

//                model.UpdatedAt = DateTime.Now;

//                _context.CompanySettings.Add(model);

//            }

//            else

//            {

//                settings.CompanyName = model.CompanyName;

//                settings.CompanyShortName = model.CompanyShortName;

//                settings.CompanyEmail = model.CompanyEmail;

//                settings.CompanyPhone = model.CompanyPhone;

//                settings.CompanyWebsite = model.CompanyWebsite;

//                settings.CompanyAddress = model.CompanyAddress;

//                settings.LogoUrl = model.LogoUrl;

//                settings.GSTNumber = model.GSTNumber;

//                settings.CINNumber = model.CINNumber;

//                settings.UpdatedAt = DateTime.Now;

//            }


//            // ===========================

//            // Update Company Master

//            // ===========================

//            var company = _context.Company.FirstOrDefault();

//            if (company != null)

//            {

//                company.CompanyName = model.CompanyName;

//                company.PhoneNumber = model.CompanyPhone;

//                company.EmailAddress = model.CompanyEmail;

//                company.GSTNumber = model.GSTNumber;

//                company.UpdatedAt = DateTime.Now;

//            }

//            _context.SaveChanges();

//            return Ok(new

//            {

//                message = "Company Settings Updated Successfully"

//            });

//        }


//        [HttpGet("notification")]

//        public IActionResult GetNotificationSettings()

//        {

//            var settings = _context.NotificationSettings.FirstOrDefault();

//            if (settings == null)

//                return NotFound("Notification settings not found.");

//            return Ok(settings);

//        }


//        [HttpPut("notification")]

//        public IActionResult UpdateNotificationSettings([FromBody] NotificationSettings model)

//        {

//            var settings = _context.NotificationSettings.FirstOrDefault();

//            if (settings == null)

//            {

//                model.UpdatedAt = DateTime.Now;

//                _context.NotificationSettings.Add(model);

//            }

//            else

//            {

//                settings.EnableEmailNotifications = model.EnableEmailNotifications;

//                settings.EnableAttendanceEmails = model.EnableAttendanceEmails;

//                settings.EnableLeaveEmails = model.EnableLeaveEmails;

//                settings.EnableWFHEmails = model.EnableWFHEmails;

//                settings.EnableTicketEmails = model.EnableTicketEmails;

//                settings.EnableAssetEmails = model.EnableAssetEmails;

//                settings.EnableOfferLetterEmails = model.EnableOfferLetterEmails;

//                settings.EnablePayslipEmails = model.EnablePayslipEmails;

//                settings.EnableLocationMismatchEmails = model.EnableLocationMismatchEmails;

//                settings.UpdatedAt = DateTime.Now;

//            }

//            _context.SaveChanges();

//            return Ok(new

//            {

//                message = "Notification Settings Updated Successfully"

//            });

//        }

//        [HttpGet("general")]

//        public IActionResult GetGeneralSettings()

//        {

//            var settings = _context.GeneralSettings.FirstOrDefault();

//            if (settings == null)

//                return NotFound("General settings not found.");

//            return Ok(settings);

//        }

//        [HttpPut("general")]

//        public IActionResult UpdateGeneralSettings([FromBody] GeneralSettings model)

//        {

//            var settings = _context.GeneralSettings.FirstOrDefault();

//            if (settings == null)

//            {

//                model.UpdatedAt = DateTime.Now;

//                _context.GeneralSettings.Add(model);

//            }

//            else

//            {

//                settings.CompanyTimeZone = model.CompanyTimeZone;

//                settings.DateFormat = model.DateFormat;

//                settings.TimeFormat = model.TimeFormat;

//                settings.CurrencySymbol = model.CurrencySymbol;

//                settings.SessionTimeout = model.SessionTimeout;

//                settings.FinancialYearStartMonth = model.FinancialYearStartMonth;

//                settings.UpdatedAt = DateTime.Now;

//            }

//            _context.SaveChanges();

//            return Ok(new

//            {

//                message = "General Settings Updated Successfully"

//            });

//        }

//        [HttpGet("policies")]

//        public IActionResult GetPolicies()

//        {

//            return Ok(_context.PolicySettings.ToList());

//        }

//        [HttpGet("policy/{type}")]

//        public IActionResult GetPolicy(string type)

//        {

//            var policy = _context.PolicySettings

//                .FirstOrDefault(x => x.PolicyType == type);

//            if (policy == null)

//                return NotFound();

//            return Ok(policy);

//        }

//        [HttpPut("policy")]

//        public IActionResult UpdatePolicy([FromBody] PolicySettings model)

//        {

//            var policy = _context.PolicySettings

//                .FirstOrDefault(x => x.Id == model.Id);

//            if (policy == null)

//                return NotFound();

//            policy.PolicyTitle = model.PolicyTitle;

//            policy.PolicyContent = model.PolicyContent;

//            policy.Version = model.Version;

//            policy.EffectiveFrom = model.EffectiveFrom;

//            policy.IsActive = model.IsActive;

//            policy.UpdatedAt = DateTime.Now;

//            _context.SaveChanges();

//            return Ok(new

//            {

//                message = "Policy Updated Successfully"

//            });

//        }



//        //vishnu change

//        [HttpPost("branding/logo")]

//        public async Task<IActionResult> UploadBrandingLogo(IFormFile file)

//        {

//            if (file == null || file.Length == 0)

//                return BadRequest("No file selected.");

//            var allowedExtensions = new[]

//            {

//        ".png",

//        ".jpg",

//        ".jpeg",

//        ".webp",

//        ".svg"

//    };

//            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

//            if (!allowedExtensions.Contains(extension))

//                return BadRequest("Only PNG, JPG, JPEG, WEBP and SVG files are allowed.");

//            var uploadsFolder = Path.Combine(

//                _environment.WebRootPath,

//                "uploads",

//                "branding");

//            if (!Directory.Exists(uploadsFolder))

//                Directory.CreateDirectory(uploadsFolder);

//            var fileName =

//                $"branding_logo_{DateTime.UtcNow.Ticks}{extension}";

//            var filePath = Path.Combine(

//                uploadsFolder,

//                fileName);

//            using (var stream = new FileStream(

//                filePath,

//                FileMode.Create))

//            {

//                await file.CopyToAsync(stream);

//            }

//            var logoUrl = "/uploads/branding/" + fileName;

//            var branding = await _context.BrandingSettings

//                .FirstOrDefaultAsync();

//            if (branding == null)

//            {

//                branding = new BrandingSettings

//                {

//                    Company_Id = 1,

//                    CompanyLogo = logoUrl,

//                    LoginLogo = logoUrl,

//                    SidebarLogo = logoUrl,

//                    CreatedDate = DateTime.Now

//                };

//                _context.BrandingSettings.Add(branding);

//            }

//            else

//            {

//                branding.CompanyLogo = logoUrl;

//                branding.LoginLogo = logoUrl;

//                branding.SidebarLogo = logoUrl;

//            }

//            await _context.SaveChangesAsync();

//            return Ok(new

//            {

//                success = true,

//                message = "Branding logo uploaded successfully.",

//                logoUrl = logoUrl

//            });

//        }

//        [HttpGet("branding")]

//        public async Task<IActionResult> GetBranding()

//        {

//            var branding = await _context.BrandingSettings

//                .FirstOrDefaultAsync();

//            if (branding == null)

//                return NotFound("Branding settings not found.");

//            return Ok(branding);

//        }

//    }

//}

using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using EmployeeManagementSystem.DTOs;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    public class SettingsController : ControllerBase

    {

        private readonly AppDbContext _context;

        private readonly IWebHostEnvironment _environment; //vishnu
        private readonly IDataProtector _emailPasswordProtector;

        public SettingsController(
            AppDbContext context,
            IWebHostEnvironment environment,
            IDataProtectionProvider dataProtectionProvider)
        {
            _context = context;
            _environment = environment;  //vishnu
            _emailPasswordProtector = dataProtectionProvider.CreateProtector(EmailSenderPasswordProtection.Purpose);
        }

        // Landing-page contact email is stored as a key/value entry in the existing systemsettings table.
        private const string LandingPageContactEmailSettingKey = "LandingPageContactEmail";

        // Public: retrieve the email displayed in the landing-page footer.
        [AllowAnonymous]
        [HttpGet("landing-page-contact")]
        public async Task<IActionResult> GetLandingPageContactEmail()
        {
            var contactEmail = await _context.SystemSettings
                .AsNoTracking()
                .Where(x => x.SettingKey == LandingPageContactEmailSettingKey)
                .Select(x => x.SettingValue)
                .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(contactEmail))
                return NotFound(new { success = false, message = "Landing page contact email is not configured." });

            return Ok(new { success = true, data = new { contactEmail } });
        }

        // Super Admin only: create the initial landing-page contact email.
        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("landing-page-contact")]
        public async Task<IActionResult> CreateLandingPageContactEmail([FromBody] LandingPageContactEmailDto model)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var email = model.ContactEmail.Trim();
            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(x => x.SettingKey == LandingPageContactEmailSettingKey);

            if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingValue))
                return Conflict(new { success = false, message = "Landing page contact email is already configured." });

            if (setting == null)
            {
                setting = new SystemSetting
                {
                    SettingKey = LandingPageContactEmailSettingKey,
                    SettingValue = email,
                    Description = "Email address displayed in the public landing-page footer and used for demo request notifications.",
                    GroupName = "LandingPage",
                    UpdatedAt = DateTime.UtcNow
                };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                setting.SettingValue = email;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new
            {
                success = true,
                message = "Landing page contact email created successfully.",
                data = new { id = setting.Id, contactEmail = setting.SettingValue }
            });
        }

        // Super Admin only: update the configured landing-page contact email.
        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("landing-page-contact")]
        public async Task<IActionResult> UpdateLandingPageContactEmail([FromBody] LandingPageContactEmailDto model)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(x => x.SettingKey == LandingPageContactEmailSettingKey
                    && x.SettingValue != null && x.SettingValue != "");

            if (setting == null)
                return NotFound(new { success = false, message = "Landing page contact email is not configured. Create it first." });

            setting.SettingValue = model.ContactEmail.Trim();
            setting.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Landing page contact email updated successfully.",
                data = new { contactEmail = setting.SettingValue }
            });
        }

        [HttpGet("email")]

        public IActionResult GetEmailSettings()

        {

            var settings = _context.EmailSettings.AsNoTracking().FirstOrDefault();

            if (settings == null)

                return NotFound("Email settings not found.");

            // Preserve the existing response shape without exposing the SMTP password.
            settings.SenderPassword = string.Empty;
            return Ok(settings);

        }

        [HttpPut("email")]

        public IActionResult UpdateEmailSettings([FromBody] EmailSettings model)

        {

            var settings = _context.EmailSettings.FirstOrDefault();

            if (settings == null)

            {
                if (string.IsNullOrWhiteSpace(model.SenderPassword))
                    return BadRequest("SenderPassword is required when creating email settings.");

                model.UpdatedAt = DateTime.Now;

                _context.EmailSettings.Add(model);

            }

            else

            {

                settings.SenderEmail = model.SenderEmail;

                if (!string.IsNullOrWhiteSpace(model.SenderPassword))
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

        // Additional sender accounts and purpose routing. Existing email settings routes remain available.
        [Authorize(Roles = "Admin")]
        [HttpGet("email-senders")]
        public async Task<IActionResult> GetEmailSenderAccounts()
        {
            var accounts = await _context.EmailSenderAccounts.AsNoTracking()
                .OrderBy(x => x.SenderEmail)
                .Select(x => new { x.Id, x.SenderEmail, x.SmtpHost, x.SmtpPort, x.EnableSSL, x.DisplayName, x.IsActive, x.CreatedAt, x.UpdatedAt, hasPassword = x.EncryptedPassword != "" })
                .ToListAsync();
            return Ok(new { success = true, data = accounts });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("email-senders")]
        public async Task<IActionResult> CreateEmailSenderAccount([FromBody] EmailSenderAccountRequest model)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            if (string.IsNullOrWhiteSpace(model.SenderPassword))
                return BadRequest(new { success = false, message = "SenderPassword is required when creating a sender account." });

            var email = model.SenderEmail.Trim();
            if (await _context.EmailSenderAccounts.AnyAsync(x => x.SenderEmail == email))
                return Conflict(new { success = false, message = "A sender account with this email already exists." });

            var account = new EmailSenderAccount
            {
                SenderEmail = email,
                EncryptedPassword = _emailPasswordProtector.Protect(model.SenderPassword),
                SmtpHost = model.SmtpHost.Trim(),
                SmtpPort = model.SmtpPort,
                EnableSSL = model.EnableSSL,
                DisplayName = model.DisplayName?.Trim() ?? string.Empty,
                IsActive = model.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.EmailSenderAccounts.Add(account);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetEmailSenderAccounts), new { id = account.Id }, new { success = true, message = "Sender account created successfully.", data = new { account.Id, account.SenderEmail, account.SmtpHost, account.SmtpPort, account.EnableSSL, account.DisplayName, account.IsActive, hasPassword = true } });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("email-senders/{id:int}")]
        public async Task<IActionResult> UpdateEmailSenderAccount(int id, [FromBody] EmailSenderAccountRequest model)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var account = await _context.EmailSenderAccounts.FirstOrDefaultAsync(x => x.Id == id);
            if (account == null) return NotFound(new { success = false, message = "Sender account not found." });

            var email = model.SenderEmail.Trim();
            if (await _context.EmailSenderAccounts.AnyAsync(x => x.Id != id && x.SenderEmail == email))
                return Conflict(new { success = false, message = "A sender account with this email already exists." });

            account.SenderEmail = email;
            if (!string.IsNullOrWhiteSpace(model.SenderPassword))
                account.EncryptedPassword = _emailPasswordProtector.Protect(model.SenderPassword);
            account.SmtpHost = model.SmtpHost.Trim();
            account.SmtpPort = model.SmtpPort;
            account.EnableSSL = model.EnableSSL;
            account.DisplayName = model.DisplayName?.Trim() ?? string.Empty;
            account.IsActive = model.IsActive;
            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Sender account updated successfully.", data = new { account.Id, account.SenderEmail, account.SmtpHost, account.SmtpPort, account.EnableSSL, account.DisplayName, account.IsActive, hasPassword = !string.IsNullOrEmpty(account.EncryptedPassword) } });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("email-purpose-mappings")]
        public async Task<IActionResult> GetEmailPurposeMappings()
        {
            var mappings = await (from mapping in _context.EmailPurposeMappings.AsNoTracking()
                                  join account in _context.EmailSenderAccounts.AsNoTracking() on mapping.SenderAccountId equals account.Id
                                  orderby mapping.Purpose
                                  select new { mapping.Id, mapping.Purpose, mapping.SenderAccountId, senderEmail = account.SenderEmail, account.IsActive, mapping.UpdatedAt })
                .ToListAsync();
            return Ok(new { success = true, data = mappings, supportedPurposes = new[] { EmailPurposes.DemoRequestNotification, EmailPurposes.DemoRequestReply, EmailPurposes.General } });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("email-purpose-mappings")]
        public async Task<IActionResult> UpsertEmailPurposeMapping([FromBody] EmailPurposeMappingRequest model)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var purpose = model.Purpose.Trim();
            var account = await _context.EmailSenderAccounts.FirstOrDefaultAsync(x => x.Id == model.SenderAccountId);
            if (account == null) return BadRequest(new { success = false, message = "Sender account does not exist." });
            if (!account.IsActive) return BadRequest(new { success = false, message = "Select an active sender account." });

            var mapping = await _context.EmailPurposeMappings.FirstOrDefaultAsync(x => x.Purpose == purpose);
            if (mapping == null)
            {
                mapping = new EmailPurposeMapping { Purpose = purpose, SenderAccountId = account.Id, UpdatedAt = DateTime.UtcNow };
                _context.EmailPurposeMappings.Add(mapping);
            }
            else
            {
                mapping.SenderAccountId = account.Id;
                mapping.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Email purpose mapping saved successfully.", data = new { mapping.Id, mapping.Purpose, mapping.SenderAccountId, senderEmail = account.SenderEmail, mapping.UpdatedAt } });
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







