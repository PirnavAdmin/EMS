using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using EmployeeManagementSystem.Models.Master;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MasterDbContext _masterDb;
        private readonly IEmailService _emailService;
        private readonly JwtHelper _jwtHelper;
        private readonly IAdminNotificationService _notificationService;
        private readonly ITenantProvider _tenantProvider;

        public UserController(
            AppDbContext context,
            MasterDbContext masterDb,
            IEmailService emailService,
            JwtHelper jwtHelper,
            IAdminNotificationService notificationService,
            ITenantProvider tenantProvider)
        {
            _context = context;
            _masterDb = masterDb;
            _emailService = emailService;
            _jwtHelper = jwtHelper;
            _notificationService = notificationService;
            _tenantProvider = tenantProvider;
        }

        private async Task EnsureTenantContextByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return;

            try
            {
                var masterUser = await _masterDb.MasterUsers
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == email.Trim().ToLower());

                if (masterUser != null && !string.IsNullOrWhiteSpace(masterUser.OrganizationCode))
                {
                    _tenantProvider.SetCurrentTenant(masterUser.OrganizationCode);
                    var tenantConnStr = _tenantProvider.GetTenantConnectionString();
                    _context.Database.SetConnectionString(tenantConnStr);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UserController] Auto-detect tenant failed: {ex.Message}");
            }
        }

        // ============================================================
        // GENERATE ONBOARDING ID
        // ============================================================

        private async Task<string> GenerateOnboardingId()
        {
            var lastCandidate = await _context.OnboardingCandidates
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync();

            if (lastCandidate == null)
                return "OB001";

            int number = int.Parse(
                lastCandidate.OnboardingId.Replace("OB", "")
            );

            return $"OB{(number + 1):D3}";
        }

        // ============================================================
        // REGISTER
        // ============================================================

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Invalid registration data.",
                    Errors = ModelState
                });
            }

            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Email is required."
                });
            }

            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Password is required."
                });
            }

            if (dto.Password != dto.ConfirmPassword)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Passwords do not match."
                });
            }

            string email = dto.Email.Trim();

            // ========================================================
            // AUTO-DETECT TENANT FROM MASTER DATABASE
            // ========================================================

            await EnsureTenantContextByEmailAsync(email);

            // ========================================================
            // CHECK IF USER ALREADY EXISTS
            // ========================================================

            var existingUser = await _context.Users
                .FirstOrDefaultAsync(x =>
                    x.Email.ToLower() == email.ToLower());

            if (existingUser != null)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Email already exists."
                });
            }

            // ========================================================
            // CHECK EMPLOYEE
            // ========================================================

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e =>
                    e.Email.ToLower() == email.ToLower());

            // ========================================================
            // EMPLOYEE NOT FOUND
            // CREATE ONBOARDING CANDIDATE
            // ========================================================

            if (employee == null)
            {
                var existingCandidate =
                    await _context.OnboardingCandidates
                        .FirstOrDefaultAsync(x =>
                            x.Email.ToLower() == email.ToLower());

                if (existingCandidate != null)
                {
                    return BadRequest(new
                    {
                        Status = false,
                        Message = "Email already registered."
                    });
                }

                var onboarding = new OnboardingCandidate
                {
                    OnboardingId = await GenerateOnboardingId(),

                    FullName =
                        $"{dto.FirstName} {dto.LastName}".Trim(),

                    Email = email,

                    // Store BCrypt password
                    Password =
                        BCrypt.Net.BCrypt.HashPassword(dto.Password),

                    Status = "Pending"
                };

                _context.OnboardingCandidates.Add(onboarding);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Status = true,
                    Message =
                        "Registration successful. Your onboarding request has been submitted.",
                    OnboardingId = onboarding.OnboardingId
                });
            }

            // ========================================================
            // FIND DEFAULT EMPLOYEE ROLE
            // ========================================================

            var defaultRole = await _context.Roles
                .FirstOrDefaultAsync(r =>
                    r.Name.ToLower() == "employee");

            if (defaultRole == null)
            {
                return StatusCode(500, new
                {
                    Status = false,
                    Message =
                        "Default role 'Employee' not found. Please seed the Roles table."
                });
            }

            // ========================================================
            // CREATE USER
            // ========================================================

            var user = new Register
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = email,

                // Store BCrypt password
                Password =
                    BCrypt.Net.BCrypt.HashPassword(dto.Password),

                RoleId = defaultRole.RoleId
            };

            _context.Users.Add(user);

            await _context.SaveChangesAsync();

            // Sync to MasterUsers if organization is known
            if (employee.OrganizationId.HasValue)
            {
                var org = await _masterDb.Organizations.FirstOrDefaultAsync(o => o.Id == employee.OrganizationId.Value);
                if (org != null && !string.IsNullOrWhiteSpace(org.OrganizationCode))
                {
                    var existingMu = await _masterDb.MasterUsers.FirstOrDefaultAsync(m => m.Email.ToLower() == email.ToLower());
                    if (existingMu == null)
                    {
                        _masterDb.MasterUsers.Add(new MasterUser
                        {
                            Email = email.ToLower(),
                            OrganizationCode = org.OrganizationCode,
                            Role = defaultRole.Name ?? "Employee",
                            IsActive = true
                        });
                        await _masterDb.SaveChangesAsync();
                    }
                }
            }

            // ========================================================
            // ADMIN NOTIFICATION
            // ========================================================

            await _notificationService.CreateNotification(
                "New User Registered",
                $"{dto.FirstName} {dto.LastName} has registered successfully."
            );

            return Ok(new
            {
                Status = true,
                Message = "Registered successfully",
                RoleAssigned = defaultRole.Name
            });
        }

        // ============================================================
        // LOGIN
        // ============================================================

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            try
            {
                // ====================================================
                // VALIDATION
                // ====================================================

                if (!ModelState.IsValid)
                {
                    return BadRequest(new
                    {
                        Status = false,
                        Message = "Invalid login data.",
                        Errors = ModelState
                    });
                }

                if (string.IsNullOrWhiteSpace(dto.Email))
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Email is required."
                    });
                }

                if (string.IsNullOrWhiteSpace(dto.Password))
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Password is required."
                    });
                }

                string email = dto.Email.Trim();

                // ====================================================
                // AUTO-DETECT TENANT FROM MASTER DATABASE
                // ====================================================

                await EnsureTenantContextByEmailAsync(email);

                // ====================================================
                // FIND NORMAL USER
                // ====================================================

                var user = await _context.Users
                    .FirstOrDefaultAsync(x =>
                        x.Email.ToLower() == email.ToLower());

                // ====================================================
                // USER NOT FOUND
                // CHECK INITIAL EMPLOYEE OR ONBOARDING CANDIDATE
                // ====================================================

                if (user == null)
                {
                    // 1. Check if an active employee account was created by Admin with initial password
                    var initialEmp = await _context.Employees
                        .FirstOrDefaultAsync(e => e.Email.ToLower() == email.ToLower());

                    if (initialEmp != null && !string.IsNullOrWhiteSpace(initialEmp.Password) && initialEmp.Password == dto.Password)
                    {
                        var defaultRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == initialEmp.RoleId)
                                          ?? await _context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == "employee");

                        user = new Register
                        {
                            FirstName = initialEmp.Name ?? "",
                            LastName = "",
                            Email = email,
                            Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                            RoleId = initialEmp.RoleId ?? defaultRole?.RoleId
                        };
                        _context.Users.Add(user);
                        await _context.SaveChangesAsync();
                    }
                }

                if (user == null)
                {
                    var candidate =
                        await _context.OnboardingCandidates
                            .FirstOrDefaultAsync(x =>
                                x.Email.ToLower() ==
                                email.ToLower());

                    // ------------------------------------------------
                    // NO USER + NO CANDIDATE
                    // ------------------------------------------------

                    if (candidate == null)
                    {
                        return Unauthorized(new
                        {
                            Status = false,
                            Message = "Invalid credentials."
                        });
                    }

                    // ------------------------------------------------
                    // ONBOARDING PASSWORD
                    // ------------------------------------------------

                    if (string.IsNullOrWhiteSpace(candidate.Password))
                    {
                        return Unauthorized(new
                        {
                            Status = false,
                            Message = "Invalid credentials."
                        });
                    }

                    bool candidatePasswordValid = false;

                    try
                    {
                        candidatePasswordValid =
                            BCrypt.Net.BCrypt.Verify(
                                dto.Password,
                                candidate.Password
                            );
                    }
                    catch
                    {
                        candidatePasswordValid = false;
                    }

                    if (!candidatePasswordValid)
                    {
                        return Unauthorized(new
                        {
                            Status = false,
                            Message = "Invalid credentials."
                        });
                    }

                    // ------------------------------------------------
                    // APPROVED CANDIDATE
                    // ------------------------------------------------

                    if (string.Equals(
                        candidate.Status,
                        "Approved",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        return Unauthorized(new
                        {
                            Status = false,
                            Message =
                                "Your onboarding has been completed. Please login using your employee account."
                        });
                    }

                    // ------------------------------------------------
                    // ONBOARDING TOKEN
                    // ------------------------------------------------

                    var onboardingToken =
                        _jwtHelper.GenerateOnboardingToken(candidate);

                    return Ok(new
                    {
                        Status = true,
                        Message = "Login successful.",
                        UserType = "Onboarding",
                        token = onboardingToken,
                        onboardingId = candidate.OnboardingId,
                        email = candidate.Email
                    });
                }

                // ====================================================
                // NORMAL USER PASSWORD VALIDATION
                // ====================================================

                if (string.IsNullOrWhiteSpace(user.Password))
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message =
                            "Password is not configured for this account."
                    });
                }

                bool passwordValid = false;

                // ----------------------------------------------------
                // CHECK BCrypt PASSWORD
                // ----------------------------------------------------

                try
                {
                    passwordValid =
                        BCrypt.Net.BCrypt.Verify(
                            dto.Password,
                            user.Password
                        );
                }
                catch
                {
                    passwordValid = false;
                }

                // ----------------------------------------------------
                // OPTIONAL LEGACY PASSWORD SUPPORT
                // ----------------------------------------------------
                //
                // If your old database contains plain-text passwords,
                // this allows the existing user to login once.
                //
                // After successful login, the password is immediately
                // converted to BCrypt.
                //
                // New users will always use BCrypt.
                // ----------------------------------------------------

                if (!passwordValid)
                {
                    if (user.Password == dto.Password)
                    {
                        passwordValid = true;

                        user.Password =
                            BCrypt.Net.BCrypt.HashPassword(
                                dto.Password
                            );

                        await _context.SaveChangesAsync();
                    }
                }

                // ====================================================
                // WRONG PASSWORD
                // ====================================================

                if (!passwordValid)
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Invalid credentials."
                    });
                }

                // ====================================================
                // ROLE CHECK
                // ====================================================

                if (user.RoleId == null)
                {
                    var empRecord = await _context.Employees
                        .FirstOrDefaultAsync(e => e.Email.ToLower() == email.ToLower());

                    if (empRecord?.RoleId != null)
                    {
                        user.RoleId = empRecord.RoleId;
                        await _context.SaveChangesAsync();
                    }
                    else
                    {
                        return Unauthorized(new
                        {
                            Status = false,
                            Message = "Role not assigned."
                        });
                    }
                }

                // ====================================================
                // FIND ROLE
                // ====================================================

                var role = await _context.Roles
                    .FirstOrDefaultAsync(r =>
                        r.RoleId == user.RoleId);

                if (role == null)
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Role not found."
                    });
                }

                // ====================================================
                // ROLE ACTIVE CHECK
                // ====================================================

                if (!role.IsActive)
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message =
                            "Your role is inactive. Please contact the administrator."
                    });
                }

                // ====================================================
                // FIND EMPLOYEE
                // ====================================================

                var employee = await _context.Employees
                    .FirstOrDefaultAsync(e =>
                        e.Email.ToLower() ==
                        email.ToLower());

                if (employee == null)
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Employee not found."
                    });
                }

                // ====================================================
                // AUTO-SYNC ROLE (EMPLOYEE MASTER -> USER TABLE)
                // ====================================================
                if (employee.RoleId.HasValue && employee.RoleId.Value > 0 && user.RoleId != employee.RoleId.Value)
                {
                    var matchedRole = await _context.Roles
                        .FirstOrDefaultAsync(r => r.RoleId == employee.RoleId.Value);

                    if (matchedRole != null && matchedRole.IsActive)
                    {
                        user.RoleId = employee.RoleId.Value;
                        role = matchedRole;
                        await _context.SaveChangesAsync();
                    }
                }

                // ====================================================
                // EMPLOYEE STATUS CHECK
                // ====================================================

                if (!string.Equals(
     employee.Status?.Trim(),
     "Active",
     StringComparison.OrdinalIgnoreCase))
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message =
                            "Your employee account is inactive. Please contact the HR administrator to activate your account."
                    });
                }

                var effectiveSub = await SubscriptionHelper.GetEffectiveSubscriptionAsync(
                    _context,
                    employee.AdminId,
                    employee.OrganizationId,
                    _masterDb);

                if (!effectiveSub.IsActive)
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Subscription expired or inactive."
                    });
                }


                // ====================================================
                // EMPLOYEE ID
                // ====================================================

                string employeeId =
                    employee.Employee_Id ?? string.Empty;

                int? adminId =
                    employee.AdminId;

                string employeeName =
                    string.IsNullOrWhiteSpace(employee.Name)
                        ? employee.Email
                        : employee.Name;

                // ====================================================
                // ACTIVITY LOG
                // ====================================================

                _context.ActivityLogs.Add(
                    new ActivityLog
                    {
                        OrganizationId = employee.OrganizationId,
                        Activity =
                            $"{employeeName} logged in",

                        CreatedAt =
                            DateTime.UtcNow
                    });

                await _context.SaveChangesAsync();

                // ====================================================
                // RESOLVE TENANT ORGANIZATION CODE
                // ====================================================

                string orgCode = _tenantProvider.GetCurrentOrganizationCode() ?? string.Empty;
                if (employee.OrganizationId.HasValue && employee.OrganizationId.Value > 0)
                {
                    var org = await _masterDb.Organizations.FirstOrDefaultAsync(o => o.Id == employee.OrganizationId.Value);
                    if (org != null && !string.IsNullOrWhiteSpace(org.OrganizationCode))
                    {
                        orgCode = org.OrganizationCode;
                    }
                }
                else
                {
                    var mu = await _masterDb.MasterUsers.FirstOrDefaultAsync(u => u.Email == user.Email);
                    if (mu != null && !string.IsNullOrWhiteSpace(mu.OrganizationCode))
                    {
                        orgCode = mu.OrganizationCode;
                    }
                }

                // ====================================================
                // GENERATE JWT
                // ====================================================

                var token =
                    _jwtHelper.GenerateToken(
                        user,
                        role.Name,
                        employeeId,
                        adminId,
                        employee.OrganizationId,
                        orgCode
                    );

                // ====================================================
                // LOGIN SUCCESS
                // ====================================================

                return Ok(new
                {
                    Status = true,
                    Message = "Login successful.",
                    token = token,
                    email = user.Email,
                    userId = user.Id,
                    employeeId = employee.Employee_Id,
                    roleId = user.RoleId,
                    adminId = employee.AdminId,
                    roleName = role.Name,
                    organizationCode = orgCode,
                    tenantId = orgCode,
                    redirectUrl = $"/{orgCode}/dashboard"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Status = false,
                    Message = "An error occurred during login.",
                    Error = ex.Message
                });
            }
        }

        // ============================================================
        // FORGOT PASSWORD
        // ============================================================

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(
            [FromBody] ForgotPasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Email is required."
                });
            }

            string email = dto.Email.Trim();

            await EnsureTenantContextByEmailAsync(email);

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Email.ToLower() ==
                    email.ToLower());

            if (employee == null)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Employee not found."
                });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(x =>
                    x.Email.ToLower() ==
                    email.ToLower());

            if (user == null)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "User account not found."
                });
            }

            var otp =
                Random.Shared.Next(100000, 999999)
                    .ToString();

            user.OtpCode = otp;

            user.OtpExpiry =
                DateTime.UtcNow.AddMinutes(10);

            user.IsOtpVerified = false;

            await _context.SaveChangesAsync();

            await _emailService.SendOtpAsync(
                user.Email,
                otp
            );

            return Ok(new
            {
                Status = true,
                Message = "OTP sent successfully."
            });
        }

        // ============================================================
        // VERIFY OTP
        // ============================================================

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp(
            [FromBody] VerifyOtpDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.Otp))
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Email and OTP are required."
                });
            }

            string email = dto.Email.Trim();

            await EnsureTenantContextByEmailAsync(email);

            var user = await _context.Users
                .FirstOrDefaultAsync(x =>
                    x.Email.ToLower() ==
                    email.ToLower());

            if (user == null)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "User not found."
                });
            }

            if (string.IsNullOrWhiteSpace(user.OtpCode))
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "OTP not found."
                });
            }

            if (!user.OtpExpiry.HasValue)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "OTP expired."
                });
            }

            if (user.OtpExpiry.Value < DateTime.UtcNow)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "OTP expired."
                });
            }

            if (user.OtpCode.Trim() != dto.Otp.Trim())
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Invalid OTP."
                });
            }

            user.IsOtpVerified = true;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Status = true,
                Message = "OTP verified successfully."
            });
        }

        // ============================================================
        // RESET PASSWORD
        // ============================================================
        // ================= RESET PASSWORD =================

        [HttpPost("reset-password")]

        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            // Find user who has verified OTP

            var user = await _context.Users

                .FirstOrDefaultAsync(x => x.IsOtpVerified == true);

            if (user == null)

                return BadRequest("OTP not verified or session expired");

            // Update password

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // Clear OTP fields

            user.OtpCode = null;

            user.OtpExpiry = null;

            user.IsOtpVerified = false;

            await _context.SaveChangesAsync();

            return Ok("Password reset successful");

        }
    }
}