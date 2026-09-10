using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace EmployeeManagementSystem.Services
{
    public class SuperAdminService : ISuperAdminService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IAuditLogService _auditLogService;

        public SuperAdminService(
            AppDbContext context,
            IConfiguration configuration,
            IAuditLogService auditLogService)
        {
            _context = context;
            _configuration = configuration;
            _auditLogService = auditLogService;
        }

        // =========================================================
        // 1. SUPER ADMIN LOGIN
        // =========================================================
        public async Task<object> Login(SuperAdminLoginDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return new
                {
                    Success = false,
                    ErrorCode = "INVALID_CREDENTIALS",
                    Message = "Email and password are required."
                };
            }

            var admin = await _context.SuperAdmins
                .FirstOrDefaultAsync(x => x.Email.ToLower() == dto.Email.Trim().ToLower());

            if (admin == null)
            {
                return new
                {
                    Success = false,
                    ErrorCode = "INVALID_CREDENTIALS",
                    Message = "Invalid email or password."
                };
            }

            // Verify password (supports BCrypt hash as well as legacy/direct match)
            bool isPasswordValid = false;
            if (!string.IsNullOrWhiteSpace(admin.PasswordHash))
            {
                if (admin.PasswordHash.StartsWith("$2a$") || admin.PasswordHash.StartsWith("$2b$") || admin.PasswordHash.StartsWith("$2y$"))
                {
                    try
                    {
                        isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, admin.PasswordHash);
                    }
                    catch
                    {
                        isPasswordValid = admin.PasswordHash == dto.Password;
                    }
                }
                else
                {
                    isPasswordValid = admin.PasswordHash == dto.Password;
                }
            }

            if (!isPasswordValid)
            {
                return new
                {
                    Success = false,
                    ErrorCode = "INVALID_CREDENTIALS",
                    Message = "Invalid email or password."
                };
            }

            if (!admin.IsActive)
            {
                return new
                {
                    Success = false,
                    ErrorCode = "ACCOUNT_INACTIVE",
                    Message = "Your account is inactive. Please contact your administrator."
                };
            }

            var claims = new[]
            {
                new Claim("SuperAdminId", admin.SuperAdminId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, admin.SuperAdminId.ToString()),
                new Claim(ClaimTypes.Name, admin.FullName),
                new Claim(ClaimTypes.Email, admin.Email),
                new Claim(ClaimTypes.Role, admin.Role)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

            var creds = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256);

            // Read session timeout from system settings (default to 120 minutes if not configured)
            var timeoutSetting = await _context.SystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "SessionTimeoutMinutes");

            int timeoutMinutes = int.TryParse(timeoutSetting?.SettingValue, out int parsedTimeout) && parsedTimeout > 0
                ? parsedTimeout
                : 120;

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(timeoutMinutes),
                signingCredentials: creds);

            admin.LastLogin = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Log successful login
            await _auditLogService.LogAsync(
                action: "Login",
                module: "SuperAdmin",
                entityId: admin.SuperAdminId.ToString(),
                description: $"Super Admin {admin.FullName} ({admin.Email}) logged in successfully.",
                user: new ClaimsPrincipal(new ClaimsIdentity(claims, "SuperAdminAuth"))
            );

            return new
            {
                Success = true,
                Message = "Login Successful",
                Token = new JwtSecurityTokenHandler().WriteToken(token),
                Data = new
                {
                    admin.SuperAdminId,
                    admin.FullName,
                    admin.Email,
                    admin.Role
                }
            };
        }

        // =========================================================
        // 2. EXISTING DASHBOARD (Preserved 100% Backward Compatibility)
        // =========================================================
        public async Task<SuperAdminDashboardDto> GetDashboard()
        {
            var today = DateTime.UtcNow.Date;

            var admins = await _context.Admins
                .AsNoTracking()
                .ToListAsync();

            var subscriptions = await _context.AdminSubscriptions
                .AsNoTracking()
                .ToListAsync();

            var employeeCounts = await _context.Employees
                .AsNoTracking()
                .Where(x => x.AdminId != null)
                .GroupBy(x => x.AdminId)
                .Select(g => new
                {
                    AdminId = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            var result = new SuperAdminDashboardDto
            {
                TotalClients = admins.Count,
                ActiveClients = admins.Count(x => x.IsActive),
                InactiveClients = admins.Count(x => !x.IsActive)
            };

            foreach (var admin in admins)
            {
                var subscription = subscriptions
                    .Where(x => x.AdminId == admin.Id)
                    .OrderByDescending(x => x.SubscriptionId)
                    .FirstOrDefault();

                var currentUsers = employeeCounts
                    .FirstOrDefault(x => x.AdminId == admin.Id)
                    ?.Count ?? 0;

                int maxUsers = 0;
                int remainingUsers = 0;
                int daysRemaining = 0;
                DateTime? startDate = null;
                DateTime? endDate = null;
                string subscriptionStatus = "No Subscription";

                if (subscription != null)
                {
                    maxUsers = subscription.MaxUsers;
                    remainingUsers = Math.Max(0, maxUsers - currentUsers);
                    startDate = subscription.StartDate;
                    endDate = subscription.EndDate;
                    daysRemaining = Math.Max(0, (subscription.EndDate.Date - today).Days);

                    if (!subscription.IsActive)
                    {
                        subscriptionStatus = "Inactive";
                    }
                    else if (subscription.EndDate.Date < today)
                    {
                        subscriptionStatus = "Expired";
                    }
                    else if (subscription.StartDate.Date > today)
                    {
                        subscriptionStatus = "Upcoming";
                    }
                    else if (daysRemaining <= 7)
                    {
                        subscriptionStatus = "Expiring Soon";
                    }
                    else
                    {
                        subscriptionStatus = "Active";
                    }
                }

                result.Clients.Add(
                    new ClientDashboardItemDto
                    {
                        ClientId = admin.Id,
                        Email = admin.Email,
                        IsActive = admin.IsActive,
                        MaxUsers = maxUsers,
                        CurrentUsers = currentUsers,
                        RemainingUsers = remainingUsers,
                        StartDate = startDate,
                        EndDate = endDate,
                        SubscriptionStatus = subscriptionStatus,
                        DaysRemaining = daysRemaining
                    });
            }

            result.ActiveSubscriptions = result.Clients.Count(x => x.SubscriptionStatus == "Active");
            result.ExpiredSubscriptions = result.Clients.Count(x => x.SubscriptionStatus == "Expired");
            result.ExpiringSoon = result.Clients.Count(x => x.SubscriptionStatus == "Expiring Soon");
            result.NoSubscription = result.Clients.Count(x => x.SubscriptionStatus == "No Subscription");

            result.TotalAllowedUsers = result.Clients.Sum(x => x.MaxUsers);
            result.TotalCurrentUsers = result.Clients.Sum(x => x.CurrentUsers);
            result.TotalRemainingUsers = result.Clients.Sum(x => x.RemainingUsers);

            result.Clients = result.Clients
                .OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.Email)
                .ToList();

            return result;
        }

        // =========================================================
        // 3. ENHANCED DASHBOARD (Real Database Aggregations)
        // =========================================================
        public async Task<SuperAdminEnhancedDashboardDto> GetEnhancedDashboard()
        {
            var baseDashboard = await GetDashboard();

            // Organizations metrics
            var totalOrgs = await _context.Organizations.CountAsync(o => !o.IsDeleted);
            var activeOrgs = await _context.Organizations.CountAsync(o => !o.IsDeleted && o.Status == "Active");
            var inactiveOrgs = totalOrgs - activeOrgs;

            // Admin metrics
            var totalAdmins = await _context.Admins.CountAsync();
            var activeAdmins = await _context.Admins.CountAsync(a => a.IsActive);
            var inactiveAdmins = totalAdmins - activeAdmins;

            // Employee metrics
            var totalEmployees = await _context.Employees.CountAsync();
            var activeEmployees = await _context.Employees.CountAsync(e => e.Status == "Active");
            var blockedEmployees = await _context.Employees.CountAsync(e => e.Status == "Blocked");
            var inactiveEmployees = await _context.Employees.CountAsync(e => e.Status == "Inactive" || e.Status == "Suspended");

            // Onboarding metrics
            var pendingOnboarding = await _context.OnboardingCandidates.CountAsync(c => c.Status == "Pending");
            var completedOnboarding = await _context.OnboardingCandidates.CountAsync(c => c.Status == "Approved");
            var totalUsers = await _context.Users.CountAsync();

            // Recent Organizations
            var recentOrgs = await _context.Organizations
                .AsNoTracking()
                .Where(o => !o.IsDeleted)
                .OrderByDescending(o => o.CreatedDate)
                .Take(5)
                .Select(o => new RecentOrganizationItemDto
                {
                    Id = o.Id,
                    OrganizationName = o.OrganizationName,
                    Email = o.Email,
                    Status = o.Status,
                    EmployeeCount = 0,
                    CreatedDate = o.CreatedDate
                })
                .ToListAsync();

            // Recent Admins
            var recentAdmins = await _context.Admins
                .AsNoTracking()
                .OrderByDescending(a => a.Id)
                .Take(5)
                .Select(a => new RecentAdminItemDto
                {
                    Id = a.Id,
                    Email = a.Email,
                    FullName = a.FullName,
                    OrganizationName = a.OrganizationName,
                    IsActive = a.IsActive,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            // Recent Employees
            var recentEmployees = await _context.Employees
                .AsNoTracking()
                .OrderByDescending(e => e.Id)
                .Take(5)
                .Select(e => new RecentEmployeeItemDto
                {
                    Id = e.Id,
                    EmployeeId = e.Employee_Id,
                    Name = e.Name,
                    Email = e.Email,
                    Department = e.Department,
                    RoleName = e.RoleName,
                    Status = e.Status,
                    JoiningDate = e.JoiningDate
                })
                .ToListAsync();

            // Recent Activities from AuditLogs (Only Admin/Client actions, excluding SuperAdmin's own actions)
            var recentActivities = await _context.AuditLogs
                .AsNoTracking()
                .Where(a => (a.UserRole == null || a.UserRole != "SuperAdmin") && a.Module != "SuperAdmin")
                .OrderByDescending(a => a.CreatedAt)
                .Take(7)
                .Select(a => new RecentActivityItemDto
                {
                    Id = a.Id,
                    Action = a.Action,
                    Activity = a.Description ?? $"{a.Action} on {a.Module}",
                    User = a.UserName ?? a.UserId,
                    Module = a.Module,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            // If audit logs are few, supplement from ActivityLogs
            if (recentActivities.Count < 5)
            {
                var fallbackActivities = await _context.ActivityLogs
                    .AsNoTracking()
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(5)
                    .Select(a => new RecentActivityItemDto
                    {
                        Id = a.Id,
                        Action = "System Activity",
                        Activity = a.Activity,
                        User = "System",
                        Module = "General",
                        CreatedAt = a.CreatedAt
                    })
                    .ToListAsync();

                recentActivities.AddRange(fallbackActivities);
                recentActivities = recentActivities.OrderByDescending(x => x.CreatedAt).Take(7).ToList();
            }

            // Pending Approvals
            var pendingApprovals = new List<PendingApprovalItemDto>();

            var pendingCandidates = await _context.OnboardingCandidates
                .AsNoTracking()
                .Where(c => c.Status == "Pending")
                .OrderByDescending(c => c.Id)
                .Take(5)
                .ToListAsync();

            foreach (var c in pendingCandidates)
            {
                pendingApprovals.Add(new PendingApprovalItemDto
                {
                    Type = "Onboarding",
                    Identifier = c.OnboardingId,
                    Description = $"Candidate onboarding pending: {c.FullName}",
                    RequestedBy = c.Email,
                    DateRequested = DateTime.UtcNow
                });
            }

            var pendingResignations = await _context.EmployeeResignations
                .AsNoTracking()
                .Where(r => r.OverallStatus == "Pending")
                .OrderByDescending(r => r.ResignationId)
                .Take(5)
                .ToListAsync();

            foreach (var r in pendingResignations)
            {
                pendingApprovals.Add(new PendingApprovalItemDto
                {
                    Type = "Resignation",
                    Identifier = r.Employee_Id,
                    Description = $"Resignation request from Employee {r.Employee_Id}",
                    RequestedBy = r.Employee_Id,
                    DateRequested = r.ResignationDate
                });
            }

            return new SuperAdminEnhancedDashboardDto
            {
                TotalOrganizations = totalOrgs > 0 ? totalOrgs : baseDashboard.TotalClients,
                ActiveOrganizations = totalOrgs > 0 ? activeOrgs : baseDashboard.ActiveClients,
                InactiveOrganizations = totalOrgs > 0 ? inactiveOrgs : baseDashboard.InactiveClients,

                TotalAdmins = totalAdmins,
                ActiveAdmins = activeAdmins,
                InactiveAdmins = inactiveAdmins,

                TotalEmployees = totalEmployees,
                ActiveEmployees = activeEmployees,
                InactiveEmployees = inactiveEmployees,
                BlockedEmployees = blockedEmployees,

                PendingOnboardingEmployees = pendingOnboarding,
                CompletedOnboardingEmployees = completedOnboarding,
                TotalUsers = totalUsers,

                ActiveSubscriptions = baseDashboard.ActiveSubscriptions,
                ExpiredSubscriptions = baseDashboard.ExpiredSubscriptions,
                ExpiringSoon = baseDashboard.ExpiringSoon,
                NoSubscription = baseDashboard.NoSubscription,

                TotalAllowedUsers = baseDashboard.TotalAllowedUsers,
                TotalCurrentUsers = baseDashboard.TotalCurrentUsers,
                TotalRemainingUsers = baseDashboard.TotalRemainingUsers,

                RecentOrganizations = recentOrgs,
                RecentAdmins = recentAdmins,
                RecentEmployees = recentEmployees,
                RecentActivities = recentActivities,
                PendingApprovals = pendingApprovals,
                Clients = baseDashboard.Clients
            };
        }

        // =========================================================
        // 4. ORGANIZATION MANAGEMENT
        // =========================================================
        public async Task<PagedResultDto<SuperAdminOrgDto>> GetOrganizations(string? search, string? status, int page, int pageSize)
        {
            page = Math.Max(1, page);
            pageSize = pageSize > 0 ? Math.Min(100, pageSize) : 10;

            if (string.Equals(search, "string", StringComparison.OrdinalIgnoreCase)) search = null;
            if (string.Equals(status, "string", StringComparison.OrdinalIgnoreCase)) status = null;

            var query = _context.Organizations
                .AsNoTracking()
                .Where(o => !o.IsDeleted);

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim().ToLower();
                query = query.Where(o =>
                    o.OrganizationName.ToLower().Contains(search) ||
                    (o.OrganizationCode != null && o.OrganizationCode.ToLower().Contains(search)) ||
                    (o.Email != null && o.Email.ToLower().Contains(search)) ||
                    (o.ContactPerson != null && o.ContactPerson.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(o => o.Status.ToLower() == status.Trim().ToLower());
            }

            int totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(o => o.CreatedDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new SuperAdminOrgDto
                {
                    Id = o.Id,
                    OrganizationName = o.OrganizationName,
                    OrganizationCode = o.OrganizationCode,
                    ContactPerson = o.ContactPerson,
                    Email = o.Email,
                    PhoneNumber = o.PhoneNumber,
                    Address = o.Address,
                    City = o.City,
                    State = o.State,
                    Country = o.Country,
                    Status = o.Status,
                    AdminCount = _context.Admins.Count(a =>
      a.OrganizationId == o.Id),

                    EmployeeCount = _context.Employees.Count(e =>
                        e.AdminId != null &&
                        _context.Admins.Any(a =>
                            a.Id == e.AdminId &&
                            a.OrganizationId == o.Id)),

                    Admins = _context.Admins
    .Where(a => a.OrganizationId == o.Id)
    .Select(a => new SuperAdminAdminDto
    {
        Id = a.Id,
        Email = a.Email,
        FullName = a.FullName,
        PhoneNumber = a.PhoneNumber,
        Role = a.Role,
        IsActive = a.IsActive,
        OrganizationId = a.OrganizationId,
        OrganizationName = a.OrganizationName,
        EmployeeCount = _context.Employees.Count(e =>
            e.AdminId == a.Id),
        CreatedAt = a.CreatedAt,
        LastLogin = a.LastLogin
    })
    .ToList(),

                    CreatedDate = o.CreatedDate,
                    UpdatedDate = o.UpdatedDate
                })
                .ToListAsync();

            return new PagedResultDto<SuperAdminOrgDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }

        public async Task<SuperAdminOrgDto?> GetOrganizationById(int id)
        {
            var o = await _context.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

            if (o == null) return null;

            var admins = await _context.Admins
                .AsNoTracking()
                .Where(a => a.OrganizationId == id)
                .Select(a => new SuperAdminAdminDto
                {
                    Id = a.Id,
                    Email = a.Email,
                    FullName = a.FullName,
                    PhoneNumber = a.PhoneNumber,
                    Role = a.Role,
                    IsActive = a.IsActive,
                    OrganizationId = a.OrganizationId,
                    OrganizationName = a.OrganizationName,
                    EmployeeCount = _context.Employees.Count(e => e.AdminId == a.Id),
                    CreatedAt = a.CreatedAt,
                    LastLogin = a.LastLogin
                })
                .ToListAsync();

            return new SuperAdminOrgDto
            {
                Id = o.Id,
                OrganizationName = o.OrganizationName,
                OrganizationCode = o.OrganizationCode,
                ContactPerson = o.ContactPerson,
                Email = o.Email,
                PhoneNumber = o.PhoneNumber,
                Address = o.Address,
                City = o.City,
                State = o.State,
                Country = o.Country,
                Status = o.Status,
                AdminCount = admins.Count,
                EmployeeCount = await _context.Employees.CountAsync(e => e.AdminId != null && _context.Admins.Any(a => a.Id == e.AdminId && a.OrganizationId == o.Id)),
                CreatedDate = o.CreatedDate,
                UpdatedDate = o.UpdatedDate,
                Admins = admins
            };
        }

        public async Task<SuperAdminOrgDto> CreateOrganization(CreateOrganizationDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            var org = new Organization
            {
                OrganizationName = dto.OrganizationName.Trim(),
                OrganizationCode = dto.OrganizationCode?.Trim(),
                ContactPerson = dto.ContactPerson?.Trim(),
                Email = dto.Email?.Trim(),
                PhoneNumber = dto.PhoneNumber?.Trim(),
                Address = dto.Address?.Trim(),
                City = dto.City?.Trim(),
                State = dto.State?.Trim(),
                Country = dto.Country?.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),

                CreatedDate = DateTime.UtcNow,
                UpdatedDate = DateTime.UtcNow
            };

            _context.Organizations.Add(org);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "Create",
                module: "Organizations",
                entityId: org.Id.ToString(),
                description: $"Created organization '{org.OrganizationName}' (Code: {org.OrganizationCode ?? "N/A"})",
                newValue: JsonSerializer.Serialize(dto),
                user: user,
                ipAddress: ipAddress);

            await _auditLogService.CreateSuperAdminNotificationAsync(
                title: "New Organization Created",
                message: $"Organization '{org.OrganizationName}' was successfully registered.",
                type: "Success");

            return new SuperAdminOrgDto
            {
                Id = org.Id,
                OrganizationName = org.OrganizationName,
                OrganizationCode = org.OrganizationCode,
                ContactPerson = org.ContactPerson,
                Email = org.Email,
                PhoneNumber = org.PhoneNumber,
                Address = org.Address,
                City = org.City,
                State = org.State,
                Country = org.Country,
                Status = org.Status,
                AdminCount = 0,
                EmployeeCount = 0,
                CreatedDate = org.CreatedDate
            };
        }

        //public async Task<SuperAdminOrgDto?> UpdateOrganization(int id, UpdateOrganizationDto dto, ClaimsPrincipal? user, string? ipAddress)
        //{
        //    var org = await _context.Organizations.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        //    if (org == null) return null;

        //    string oldValue = JsonSerializer.Serialize(new
        //    {
        //        org.OrganizationName,
        //        org.OrganizationCode,
        //        org.ContactPerson,
        //        org.Email,
        //        org.PhoneNumber,
        //        org.Address,
        //        org.City,
        //        org.State,
        //        org.Country,
        //        org.Status
        //    });

        //    org.OrganizationName = dto.OrganizationName.Trim();
        //    org.OrganizationCode = dto.OrganizationCode?.Trim();
        //    org.ContactPerson = dto.ContactPerson?.Trim();
        //    org.Email = dto.Email?.Trim();
        //    org.PhoneNumber = dto.PhoneNumber?.Trim();
        //    org.Address = dto.Address?.Trim();
        //    org.City = dto.City?.Trim();
        //    org.State = dto.State?.Trim();
        //    org.Country = dto.Country?.Trim();
        //    if (!string.IsNullOrWhiteSpace(dto.Status))
        //    {
        //        org.Status = dto.Status.Trim();
        //    }
        //    org.UpdatedDate = DateTime.UtcNow;

        //    await _context.SaveChangesAsync();

        //    await _auditLogService.LogAsync(
        //        action: "Update",
        //        module: "Organizations",
        //        entityId: org.Id.ToString(),
        //        description: $"Updated organization '{org.OrganizationName}' (ID: {org.Id})",
        //        oldValue: oldValue,
        //        newValue: JsonSerializer.Serialize(dto),
        //        user: user,
        //        ipAddress: ipAddress);

        //    return await GetOrganizationById(org.Id);
        //}

        public async Task<SuperAdminOrgDto?> UpdateOrganization(
            int id,
            UpdateOrganizationDto dto,
            ClaimsPrincipal? user,
            string? ipAddress)
        {
            var org = await _context.Organizations
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

            if (org == null)
                return null;

            // Store old organization values for audit log
            string oldValue = JsonSerializer.Serialize(new
            {
                org.OrganizationName,
                org.OrganizationCode,
                org.ContactPerson,
                org.Email,
                org.PhoneNumber,
                org.Address,
                org.City,
                org.State,
                org.Country,
                org.Status
            });

            // ==========================================
            // 1. UPDATE ORGANIZATION
            // ==========================================

            var oldOrganizationName = org.OrganizationName;

            org.OrganizationName = dto.OrganizationName.Trim();
            org.OrganizationCode = dto.OrganizationCode?.Trim();
            org.ContactPerson = dto.ContactPerson?.Trim();
            org.Email = dto.Email?.Trim();
            org.PhoneNumber = dto.PhoneNumber?.Trim();
            org.Address = dto.Address?.Trim();
            org.City = dto.City?.Trim();
            org.State = dto.State?.Trim();
            org.Country = dto.Country?.Trim();

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                org.Status = dto.Status.Trim();
            }

            org.UpdatedDate = DateTime.UtcNow;

            // ==========================================
            // 2. SYNC (REMOVE / UPDATE / CREATE) ORGANIZATION ADMINS
            // ==========================================

            bool hasAdminSync = (dto.Admins != null && dto.Admins.Any())
                || (dto.AdminIds != null && dto.AdminIds.Any())
                || (dto.DeletedAdminIds != null && dto.DeletedAdminIds.Any())
                || (dto.RemovedAdminIds != null && dto.RemovedAdminIds.Any());

            if (hasAdminSync)
            {
                // Fetch all admins currently linked to this organization in the database
                var existingOrgAdmins = await _context.Admins
                    .Where(a => a.OrganizationId == id)
                    .ToListAsync();

                // 1. Explicitly requested deletions
                var explicitDeleteIds = new HashSet<int>();
                if (dto.DeletedAdminIds != null)
                {
                    foreach (var delId in dto.DeletedAdminIds.Where(x => x > 0)) explicitDeleteIds.Add(delId);
                }
                if (dto.RemovedAdminIds != null)
                {
                    foreach (var remId in dto.RemovedAdminIds.Where(x => x > 0)) explicitDeleteIds.Add(remId);
                }
                if (dto.Admins != null)
                {
                    foreach (var delAdmin in dto.Admins.Where(a => a.IsDeleted && a.Id.HasValue && a.Id.Value > 0))
                    {
                        explicitDeleteIds.Add(delAdmin.Id!.Value);
                    }
                }

                // 2. Retained admin identifiers
                var retainedAdminIds = new HashSet<int>();
                var retainedEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                if (dto.AdminIds != null)
                {
                    foreach (var adminId in dto.AdminIds.Where(x => x > 0))
                    {
                        if (!explicitDeleteIds.Contains(adminId))
                        {
                            retainedAdminIds.Add(adminId);
                        }
                    }
                }

                if (dto.Admins != null)
                {
                    foreach (var adminDto in dto.Admins.Where(a => !a.IsDeleted))
                    {
                        if (adminDto.Id.HasValue && adminDto.Id.Value > 0 && !explicitDeleteIds.Contains(adminDto.Id.Value))
                        {
                            retainedAdminIds.Add(adminDto.Id.Value);
                        }
                        if (!string.IsNullOrWhiteSpace(adminDto.Email))
                        {
                            retainedEmails.Add(adminDto.Email.Trim().ToLower());
                        }
                    }
                }

                // 3. Find admins to remove
                var removedAdmins = new List<Admin>();

                // A) Explicitly deleted admins
                if (explicitDeleteIds.Any())
                {
                    var matchingExplicit = existingOrgAdmins.Where(a => explicitDeleteIds.Contains(a.Id)).ToList();
                    removedAdmins.AddRange(matchingExplicit);
                }

                // B) Admins omitted from the retained list (only when a non-empty retained list was provided)
                if (retainedAdminIds.Any() || retainedEmails.Any())
                {
                    var omitted = existingOrgAdmins.Where(a =>
                        !retainedAdminIds.Contains(a.Id) &&
                        !retainedEmails.Contains(a.Email.Trim().ToLower()) &&
                        !removedAdmins.Contains(a)
                    ).ToList();

                    removedAdmins.AddRange(omitted);
                }

                var remainingAdmins = existingOrgAdmins
                    .Where(a => !removedAdmins.Contains(a))
                    .ToList();

                var fallbackAdmin = remainingAdmins.FirstOrDefault();

                // 4. Safely delete removed admins
                if (removedAdmins.Any())
                {
                    foreach (var removedAdmin in removedAdmins)
                    {
                        // Clean up admin permissions
                        var adminPerms = await _context.AdminPermissions
                            .Where(p => p.AdminId == removedAdmin.Id)
                            .ToListAsync();
                        if (adminPerms.Any())
                        {
                            _context.AdminPermissions.RemoveRange(adminPerms);
                        }

                        // Clean up admin notifications
                        var adminNotifs = await _context.AdminNotifications
                            .Where(n => n.AdminId == removedAdmin.Id)
                            .ToListAsync();
                        if (adminNotifs.Any())
                        {
                            _context.AdminNotifications.RemoveRange(adminNotifs);
                        }

                        // Clean up admin subscriptions
                        var adminSubs = await _context.AdminSubscriptions
                            .Where(s => s.AdminId == removedAdmin.Id)
                            .ToListAsync();
                        if (adminSubs.Any())
                        {
                            _context.AdminSubscriptions.RemoveRange(adminSubs);
                        }

                        // Reassign any linked employees to a remaining admin
                        var linkedEmployees = await _context.Employees
                            .Where(e => e.AdminId == removedAdmin.Id)
                            .ToListAsync();
                        foreach (var emp in linkedEmployees)
                        {
                            emp.AdminId = fallbackAdmin?.Id;
                        }

                        // Reassign any linked branches to a remaining admin
                        var linkedBranches = await _context.Branches
                            .Where(b => b.AdminId == removedAdmin.Id)
                            .ToListAsync();
                        foreach (var branch in linkedBranches)
                        {
                            branch.AdminId = fallbackAdmin?.Id;
                        }

                        // Delete the admin record
                        _context.Admins.Remove(removedAdmin);
                    }
                }

                // 5. Process updates for remaining admins and creation of new admins
                if (dto.Admins != null)
                {
                    foreach (var adminDto in dto.Admins.Where(a => !a.IsDeleted))
                    {
                        string? trimmedEmail = adminDto.Email?.Trim().ToLower();

                        // Find if this corresponds to an existing admin by ID or by Email
                        Admin? admin = null;
                        if (adminDto.Id.HasValue && adminDto.Id.Value > 0)
                        {
                            admin = existingOrgAdmins.FirstOrDefault(a => a.Id == adminDto.Id.Value);
                        }
                        if (admin == null && !string.IsNullOrWhiteSpace(trimmedEmail))
                        {
                            admin = existingOrgAdmins.FirstOrDefault(a => a.Email.Trim().ToLower() == trimmedEmail);
                        }

                        // ==========================================
                        // CASE 1: EXISTING ADMIN -> UPDATE
                        // ==========================================
                        if (admin != null)
                        {
                            if (!string.IsNullOrWhiteSpace(trimmedEmail))
                            {
                                // Check duplicate email across OTHER admins
                                var emailExists = await _context.Admins
                                    .AnyAsync(a => a.Email.ToLower() == trimmedEmail && a.Id != admin.Id);

                                if (emailExists)
                                {
                                    throw new InvalidOperationException(
                                        $"An admin with email '{adminDto.Email}' already exists.");
                                }

                                admin.Email = adminDto.Email!.Trim();
                            }

                            if (!string.IsNullOrWhiteSpace(adminDto.FullName))
                            {
                                admin.FullName = adminDto.FullName.Trim();
                            }

                            if (adminDto.PhoneNumber != null)
                            {
                                admin.PhoneNumber = adminDto.PhoneNumber.Trim();
                            }

                            admin.IsActive = adminDto.IsActive;

                            // Update password ONLY if a new password is provided
                            if (!string.IsNullOrWhiteSpace(adminDto.Password))
                            {
                                admin.Password = BCrypt.Net.BCrypt.HashPassword(adminDto.Password.Trim());
                            }

                            admin.OrganizationId = org.Id;
                            admin.OrganizationName = org.OrganizationName;
                            admin.Role = "Admin";
                        }
                        // ==========================================
                        // CASE 2: NEW ADMIN -> CREATE
                        // ==========================================
                        else if (!string.IsNullOrWhiteSpace(adminDto.Email))
                        {
                            var emailExists = await _context.Admins
                                .AnyAsync(a => a.Email.ToLower() == trimmedEmail);

                            if (emailExists)
                            {
                                throw new InvalidOperationException(
                                    $"An admin with email '{adminDto.Email}' already exists.");
                            }

                            string passwordToUse = !string.IsNullOrWhiteSpace(adminDto.Password)
                                ? adminDto.Password.Trim()
                                : "Admin@123";

                            string fullNameToUse = !string.IsNullOrWhiteSpace(adminDto.FullName)
                                ? adminDto.FullName.Trim()
                                : adminDto.Email!.Split('@')[0];

                            var newAdmin = new Admin
                            {
                                FullName = fullNameToUse,
                                Email = adminDto.Email!.Trim(),
                                Password = BCrypt.Net.BCrypt.HashPassword(passwordToUse),
                                PhoneNumber = adminDto.PhoneNumber?.Trim(),
                                IsActive = adminDto.IsActive,
                                Role = "Admin",
                                OrganizationId = org.Id,
                                OrganizationName = org.OrganizationName,
                                CreatedAt = DateTime.UtcNow
                            };

                            await _context.Admins.AddAsync(newAdmin);
                        }
                    }
                }
            }

            // ==========================================
            // 3. SYNC ORGANIZATION NAME WITH ALL ADMINS
            // ==========================================

            if (!string.Equals(oldOrganizationName, org.OrganizationName, StringComparison.Ordinal))
            {
                var organizationAdmins = await _context.Admins
                    .Where(a => a.OrganizationId == org.Id)
                    .ToListAsync();

                foreach (var admin in organizationAdmins)
                {
                    admin.OrganizationName = org.OrganizationName;
                }
            }

            // ==========================================
            // 4. SAVE CHANGES
            // ==========================================

            await _context.SaveChangesAsync();

            // ==========================================
            // 5. AUDIT LOG
            // ==========================================

            await _auditLogService.LogAsync(
                action: "Update",
                module: "Organizations",
                entityId: org.Id.ToString(),
                description: $"Updated organization '{org.OrganizationName}' (ID: {org.Id})",
                oldValue: oldValue,
                newValue: JsonSerializer.Serialize(new
                {
                    Organization = dto.OrganizationName,
                    AdminUpdated = hasAdminSync
                }),
                user: user,
                ipAddress: ipAddress);


            // ==========================================
            // 6. RETURN UPDATED ORGANIZATION
            // ==========================================

            return await GetOrganizationById(org.Id);
        }

        public async Task<bool> UpdateOrganizationStatus(int id, UpdateEntityStatusDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            var org = await _context.Organizations.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (org == null) return false;

            string previousStatus = org.Status;
            string newStatus = !string.IsNullOrWhiteSpace(dto.Status)
                ? dto.Status
                : (dto.IsActive.HasValue && dto.IsActive.Value ? "Active" : "Inactive");

            org.Status = newStatus;
            org.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditLogService.LogStatusChangeAsync(
                entityType: "Organization",
                entityId: org.Id.ToString(),
                previousStatus: previousStatus,
                newStatus: newStatus,
                reason: dto.Reason,
                user: user);

            await _auditLogService.LogAsync(
                action: "StatusChange",
                module: "Organizations",
                entityId: org.Id.ToString(),
                description: $"Changed status of organization '{org.OrganizationName}' from '{previousStatus}' to '{newStatus}'. Reason: {dto.Reason ?? "None"}",
                oldValue: previousStatus,
                newValue: newStatus,
                user: user,
                ipAddress: ipAddress);

            if (newStatus == "Inactive" || newStatus == "Suspended")
            {
                await _auditLogService.CreateSuperAdminNotificationAsync(
                    title: "Organization Deactivated",
                    message: $"Organization '{org.OrganizationName}' has been marked as {newStatus}.",
                    type: "Warning");
            }

            return true;
        }

        public async Task<(bool Success, string Message)> DeleteOrganization(int id, ClaimsPrincipal? user, string? ipAddress)
        {
            var org = await _context.Organizations.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (org == null)
            {
                return (false, "Organization not found.");
            }

            // Check if organization has active admins or employees
            int linkedAdmins = await _context.Admins.CountAsync(a => a.OrganizationId == id);
            int linkedEmployees = await _context.Employees.CountAsync(e => e.AdminId != null && _context.Admins.Any(a => a.Id == e.AdminId && a.OrganizationId == id));

            if (linkedAdmins > 0 || linkedEmployees > 0)
            {
                // Soft delete according to business rules
                org.IsDeleted = true;
                org.Status = "Inactive";
                org.UpdatedDate = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                await _auditLogService.LogAsync(
                    action: "SoftDelete",
                    module: "Organizations",
                    entityId: org.Id.ToString(),
                    description: $"Soft-deleted organization '{org.OrganizationName}' due to {linkedAdmins} existing admins and {linkedEmployees} employees.",
                    user: user,
                    ipAddress: ipAddress);

                return (true, "Organization soft-deleted successfully (retained for data integrity).");
            }

            // Safe to fully remove
            org.IsDeleted = true;
            org.Status = "Inactive";
            org.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "Delete",
                module: "Organizations",
                entityId: org.Id.ToString(),
                description: $"Deleted organization '{org.OrganizationName}' (ID: {org.Id})",
                user: user,
                ipAddress: ipAddress);

            return (true, "Organization deleted successfully.");
        }

        // =========================================================
        // 3b. ORGANIZATION SUBSCRIPTION MANAGEMENT
        // =========================================================
        public async Task<OrganizationSubscriptionDto> CreateOrganizationSubscription(CreateOrganizationSubscriptionDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            if (dto.MaxUsers <= 0)
                throw new ArgumentException("Maximum users must be greater than zero.");

            if (dto.EndDate <= dto.StartDate)
                throw new ArgumentException("End date must be greater than start date.");

            var org = await _context.Organizations
                .FirstOrDefaultAsync(x => x.Id == dto.OrganizationId && !x.IsDeleted);

            if (org == null)
                throw new KeyNotFoundException($"Organization with ID {dto.OrganizationId} not found.");

            // Calculate existing employees in organization
            int currentUsers = await _context.Employees
                .CountAsync(e => e.AdminId != null && _context.Admins.Any(a => a.Id == e.AdminId && a.OrganizationId == dto.OrganizationId));

            if (dto.MaxUsers < currentUsers)
            {
                throw new InvalidOperationException($"Cannot set plan limit to {dto.MaxUsers}. Organization '{org.OrganizationName}' currently has {currentUsers} employees.");
            }

            // Deactivate any existing active subscriptions for this organization
            var existingSubs = await _context.OrganizationSubscriptions
                .Where(s => s.OrganizationId == dto.OrganizationId && s.IsActive)
                .ToListAsync();

            foreach (var sub in existingSubs)
            {
                sub.IsActive = false;
                sub.UpdatedDate = DateTime.UtcNow;
                sub.UpdatedBy = user?.FindFirst(ClaimTypes.Email)?.Value ?? "SuperAdmin";
            }

            string userEmail = user?.FindFirst(ClaimTypes.Email)?.Value ?? "SuperAdmin";

            var newSub = new OrganizationSubscription
            {
                OrganizationId = dto.OrganizationId,
                MaxUsers = dto.MaxUsers,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                IsActive = dto.IsActive,
                PlanName = dto.PlanName?.Trim() ?? "Standard",
                BillingCycle = dto.BillingCycle?.Trim() ?? "Monthly",
                Price = dto.Price,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = userEmail
            };

            await _context.OrganizationSubscriptions.AddAsync(newSub);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "CreateSubscription",
                module: "OrganizationSubscriptions",
                entityId: newSub.Id.ToString(),
                description: $"Created subscription for organization '{org.OrganizationName}' (ID: {org.Id}): {newSub.MaxUsers} members, Plan: {newSub.PlanName}, Expires: {newSub.EndDate:yyyy-MM-dd}",
                newValue: JsonSerializer.Serialize(dto),
                user: user,
                ipAddress: ipAddress);

            int remainingUsers = Math.Max(0, newSub.MaxUsers - currentUsers);
            double usagePct = newSub.MaxUsers > 0 ? Math.Round(((double)currentUsers / newSub.MaxUsers) * 100, 2) : 0;
            bool isExpired = newSub.EndDate < DateTime.UtcNow;

            return new OrganizationSubscriptionDto
            {
                Id = newSub.Id,
                OrganizationId = newSub.OrganizationId,
                OrganizationName = org.OrganizationName,
                OrganizationCode = org.OrganizationCode,
                MaxUsers = newSub.MaxUsers,
                CurrentUsers = currentUsers,
                RemainingUsers = remainingUsers,
                UsagePercentage = usagePct,
                StartDate = newSub.StartDate,
                EndDate = newSub.EndDate,
                IsActive = newSub.IsActive,
                IsExpired = isExpired,
                PlanName = newSub.PlanName,
                BillingCycle = newSub.BillingCycle,
                Price = newSub.Price,
                CreatedDate = newSub.CreatedDate,
                CreatedBy = newSub.CreatedBy
            };
        }

        public async Task<OrganizationSubscriptionDto?> GetOrganizationSubscription(int organizationId)
        {
            var org = await _context.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == organizationId && !x.IsDeleted);

            if (org == null) return null;

            var sub = await _context.OrganizationSubscriptions
                .AsNoTracking()
                .Where(s => s.OrganizationId == organizationId)
                .OrderByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            if (sub == null) return null;

            int currentUsers = await _context.Employees
                .CountAsync(e => e.AdminId != null && _context.Admins.Any(a => a.Id == e.AdminId && a.OrganizationId == organizationId));

            int remainingUsers = Math.Max(0, sub.MaxUsers - currentUsers);
            double usagePct = sub.MaxUsers > 0 ? Math.Round(((double)currentUsers / sub.MaxUsers) * 100, 2) : 0;
            bool isExpired = sub.EndDate < DateTime.UtcNow;

            return new OrganizationSubscriptionDto
            {
                Id = sub.Id,
                OrganizationId = sub.OrganizationId,
                OrganizationName = org.OrganizationName,
                OrganizationCode = org.OrganizationCode,
                MaxUsers = sub.MaxUsers,
                CurrentUsers = currentUsers,
                RemainingUsers = remainingUsers,
                UsagePercentage = usagePct,
                StartDate = sub.StartDate,
                EndDate = sub.EndDate,
                IsActive = sub.IsActive,
                IsExpired = isExpired,
                PlanName = sub.PlanName,
                BillingCycle = sub.BillingCycle,
                Price = sub.Price,
                CreatedDate = sub.CreatedDate,
                UpdatedDate = sub.UpdatedDate,
                CreatedBy = sub.CreatedBy,
                UpdatedBy = sub.UpdatedBy
            };
        }

        public async Task<OrganizationSubscriptionDto> UpdateOrganizationSubscription(int organizationId, UpdateOrganizationSubscriptionDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            if (dto.MaxUsers <= 0)
                throw new ArgumentException("Maximum users must be greater than zero.");

            if (dto.EndDate <= dto.StartDate)
                throw new ArgumentException("End date must be greater than start date.");

            var org = await _context.Organizations
                .FirstOrDefaultAsync(x => x.Id == organizationId && !x.IsDeleted);

            if (org == null)
                throw new KeyNotFoundException($"Organization with ID {organizationId} not found.");

            var sub = await _context.OrganizationSubscriptions
                .Where(s => s.OrganizationId == organizationId)
                .OrderByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            int currentUsers = await _context.Employees
                .CountAsync(e => e.AdminId != null && _context.Admins.Any(a => a.Id == e.AdminId && a.OrganizationId == organizationId));

            if (dto.MaxUsers < currentUsers)
            {
                throw new InvalidOperationException($"Cannot reduce user limit to {dto.MaxUsers}. Organization '{org.OrganizationName}' currently has {currentUsers} active employees.");
            }

            string userEmail = user?.FindFirst(ClaimTypes.Email)?.Value ?? "SuperAdmin";

            if (sub == null)
            {
                // Create new subscription if none existed
                sub = new OrganizationSubscription
                {
                    OrganizationId = organizationId,
                    MaxUsers = dto.MaxUsers,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    IsActive = dto.IsActive,
                    PlanName = dto.PlanName?.Trim() ?? "Standard",
                    BillingCycle = dto.BillingCycle?.Trim() ?? "Monthly",
                    Price = dto.Price,
                    CreatedDate = DateTime.UtcNow,
                    CreatedBy = userEmail
                };
                await _context.OrganizationSubscriptions.AddAsync(sub);
            }
            else
            {
                sub.MaxUsers = dto.MaxUsers;
                sub.StartDate = dto.StartDate;
                sub.EndDate = dto.EndDate;
                sub.IsActive = dto.IsActive;
                if (!string.IsNullOrWhiteSpace(dto.PlanName)) sub.PlanName = dto.PlanName.Trim();
                if (!string.IsNullOrWhiteSpace(dto.BillingCycle)) sub.BillingCycle = dto.BillingCycle.Trim();
                if (dto.Price.HasValue) sub.Price = dto.Price.Value;
                sub.UpdatedDate = DateTime.UtcNow;
                sub.UpdatedBy = userEmail;
            }

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "UpdateSubscription",
                module: "OrganizationSubscriptions",
                entityId: sub.Id.ToString(),
                description: $"Updated subscription for organization '{org.OrganizationName}' (ID: {org.Id}): {sub.MaxUsers} members, Plan: {sub.PlanName}, Expires: {sub.EndDate:yyyy-MM-dd}",
                newValue: JsonSerializer.Serialize(dto),
                user: user,
                ipAddress: ipAddress);

            int remainingUsers = Math.Max(0, sub.MaxUsers - currentUsers);
            double usagePct = sub.MaxUsers > 0 ? Math.Round(((double)currentUsers / sub.MaxUsers) * 100, 2) : 0;
            bool isExpired = sub.EndDate < DateTime.UtcNow;

            return new OrganizationSubscriptionDto
            {
                Id = sub.Id,
                OrganizationId = sub.OrganizationId,
                OrganizationName = org.OrganizationName,
                OrganizationCode = org.OrganizationCode,
                MaxUsers = sub.MaxUsers,
                CurrentUsers = currentUsers,
                RemainingUsers = remainingUsers,
                UsagePercentage = usagePct,
                StartDate = sub.StartDate,
                EndDate = sub.EndDate,
                IsActive = sub.IsActive,
                IsExpired = isExpired,
                PlanName = sub.PlanName,
                BillingCycle = sub.BillingCycle,
                Price = sub.Price,
                CreatedDate = sub.CreatedDate,
                UpdatedDate = sub.UpdatedDate,
                CreatedBy = sub.CreatedBy,
                UpdatedBy = sub.UpdatedBy
            };
        }

        public async Task<OrganizationSubscriptionUsageDto> GetOrganizationSubscriptionUsage(int organizationId)
        {
            var org = await _context.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == organizationId && !x.IsDeleted);

            if (org == null)
                throw new KeyNotFoundException($"Organization with ID {organizationId} not found.");

            var sub = await _context.OrganizationSubscriptions
                .AsNoTracking()
                .Where(s => s.OrganizationId == organizationId)
                .OrderByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            int totalAdmins = await _context.Admins
                .CountAsync(a => a.OrganizationId == organizationId);

            int currentUsers = await _context.Employees
                .CountAsync(e => e.AdminId != null && _context.Admins.Any(a => a.Id == e.AdminId && a.OrganizationId == organizationId));

            if (sub == null)
            {
                return new OrganizationSubscriptionUsageDto
                {
                    OrganizationId = org.Id,
                    OrganizationName = org.OrganizationName,
                    OrganizationCode = org.OrganizationCode,
                    SubscriptionId = 0,
                    MaxUsers = 0,
                    CurrentUsers = currentUsers,
                    RemainingUsers = 0,
                    UsagePercentage = 0,
                    StartDate = DateTime.MinValue,
                    EndDate = DateTime.MinValue,
                    IsActive = false,
                    IsExpired = true,
                    TotalAdmins = totalAdmins,
                    PlanName = "No Plan Assigned",
                    BillingCycle = null
                };
            }

            int remainingUsers = Math.Max(0, sub.MaxUsers - currentUsers);
            double usagePct = sub.MaxUsers > 0 ? Math.Round(((double)currentUsers / sub.MaxUsers) * 100, 2) : 0;
            bool isExpired = sub.EndDate < DateTime.UtcNow;

            return new OrganizationSubscriptionUsageDto
            {
                OrganizationId = org.Id,
                OrganizationName = org.OrganizationName,
                OrganizationCode = org.OrganizationCode,
                SubscriptionId = sub.Id,
                MaxUsers = sub.MaxUsers,
                CurrentUsers = currentUsers,
                RemainingUsers = remainingUsers,
                UsagePercentage = usagePct,
                StartDate = sub.StartDate,
                EndDate = sub.EndDate,
                IsActive = sub.IsActive,
                IsExpired = isExpired,
                TotalAdmins = totalAdmins,
                PlanName = sub.PlanName,
                BillingCycle = sub.BillingCycle
            };
        }

        public async Task<PagedResultDto<OrganizationSubscriptionDto>> GetAllOrganizationSubscriptions(OrganizationSubscriptionFilterDto filter)
        {
            int page = Math.Max(1, filter.PageNumber);
            int pageSize = filter.PageSize > 0 ? Math.Min(100, filter.PageSize) : 10;

            var now = DateTime.UtcNow;

            // Get all non-deleted organizations
            var orgQuery = _context.Organizations.AsNoTracking().Where(o => !o.IsDeleted);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                string s = filter.Search.Trim().ToLower();
                orgQuery = orgQuery.Where(o => o.OrganizationName.ToLower().Contains(s) || (o.OrganizationCode != null && o.OrganizationCode.ToLower().Contains(s)));
            }

            var orgs = await orgQuery.ToListAsync();

            // Fetch latest subscriptions for each organization
            var allSubs = await _context.OrganizationSubscriptions
                .AsNoTracking()
                .OrderByDescending(s => s.Id)
                .ToListAsync();

            var list = new List<OrganizationSubscriptionDto>();

            foreach (var org in orgs)
            {
                var sub = allSubs.FirstOrDefault(s =>
                    s.OrganizationId == org.Id);

                // ✅ ONLY SHOW ORGANIZATIONS THAT HAVE A SUBSCRIPTION
                if (sub == null)
                    continue;

                int currentUsers = await _context.Employees
                    .CountAsync(e => e.AdminId != null &&
                        _context.Admins.Any(a =>
                            a.Id == e.AdminId &&
                            a.OrganizationId == org.Id));

                int maxUsers = sub.MaxUsers; int remainingUsers = sub != null ? Math.Max(0, sub.MaxUsers - currentUsers) : 0;
                double usagePct = maxUsers > 0 ? Math.Round(((double)currentUsers / maxUsers) * 100, 2) : 0;
                bool isExpired = sub == null || sub.EndDate < now;
                bool isActive = sub?.IsActive ?? false;

                // Apply filter criteria
                if (filter.IsActive.HasValue && isActive != filter.IsActive.Value)
                    continue;

                if (filter.IsExpired.HasValue && isExpired != filter.IsExpired.Value)
                    continue;

                list.Add(new OrganizationSubscriptionDto
                {
                    Id = sub?.Id ?? 0,
                    OrganizationId = org.Id,
                    OrganizationName = org.OrganizationName,
                    OrganizationCode = org.OrganizationCode,
                    MaxUsers = maxUsers,
                    CurrentUsers = currentUsers,
                    RemainingUsers = remainingUsers,
                    UsagePercentage = usagePct,
                    StartDate = sub?.StartDate ?? DateTime.MinValue,
                    EndDate = sub?.EndDate ?? DateTime.MinValue,
                    IsActive = isActive,
                    IsExpired = isExpired,
                    PlanName = sub?.PlanName ?? "Unassigned",
                    BillingCycle = sub?.BillingCycle,
                    Price = sub?.Price,
                    CreatedDate = sub?.CreatedDate ?? org.CreatedDate,
                    UpdatedDate = sub?.UpdatedDate,
                    CreatedBy = sub?.CreatedBy,
                    UpdatedBy = sub?.UpdatedBy
                });
            }

            int totalCount = list.Count;
            var pagedItems = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new PagedResultDto<OrganizationSubscriptionDto>
            {
                Items = pagedItems,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }

        // =========================================================
        // 5. ADMIN MANAGEMENT
        // =========================================================
        public async Task<PagedResultDto<SuperAdminAdminDto>> GetAdmins(string? search, bool? isActive, int? organizationId, int page, int pageSize)
        {
            page = Math.Max(1, page);
            pageSize = pageSize > 0 ? Math.Min(100, pageSize) : 10;

            if (string.Equals(search, "string", StringComparison.OrdinalIgnoreCase)) search = null;
            if (organizationId.HasValue && organizationId.Value <= 0) organizationId = null;

            var query = _context.Admins.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim().ToLower();
                query = query.Where(a =>
                    a.Email.ToLower().Contains(search) ||
                    (a.FullName != null && a.FullName.ToLower().Contains(search)) ||
                    (a.OrganizationName != null && a.OrganizationName.ToLower().Contains(search)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(a => a.IsActive == isActive.Value);
            }

            if (organizationId.HasValue)
            {
                query = query.Where(a => a.OrganizationId == organizationId.Value);
            }

            int totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(a => a.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new SuperAdminAdminDto
                {
                    Id = a.Id,
                    Email = a.Email,
                    FullName = a.FullName,
                    PhoneNumber = a.PhoneNumber,
                    Role = a.Role,
                    IsActive = a.IsActive,
                    OrganizationId = a.OrganizationId,
                    OrganizationName = a.OrganizationName,
                    EmployeeCount = _context.Employees.Count(e => e.AdminId == a.Id),
                    CreatedAt = a.CreatedAt,
                    LastLogin = a.LastLogin
                })
                .ToListAsync();

            return new PagedResultDto<SuperAdminAdminDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }

        public async Task<SuperAdminAdminDto?> GetAdminById(int id)
        {
            var a = await _context.Admins
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (a == null) return null;

            return new SuperAdminAdminDto
            {
                Id = a.Id,
                Email = a.Email,
                FullName = a.FullName,
                PhoneNumber = a.PhoneNumber,
                Role = a.Role,
                IsActive = a.IsActive,
                OrganizationId = a.OrganizationId,
                OrganizationName = a.OrganizationName,
                EmployeeCount = await _context.Employees.CountAsync(e => e.AdminId == a.Id),
                CreatedAt = a.CreatedAt,
                LastLogin = a.LastLogin
            };
        }

        public async Task<SuperAdminAdminDto> CreateAdmin(CreateSuperAdminAdminDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            bool exists = await _context.Admins.AnyAsync(x => x.Email.ToLower() == dto.Email.Trim().ToLower());
            if (exists)
            {
                throw new InvalidOperationException("An Admin with this email already exists.");
            }

            string? orgName = null;
            if (dto.OrganizationId.HasValue)
            {
                var org = await _context.Organizations.FirstOrDefaultAsync(o => o.Id == dto.OrganizationId.Value);
                orgName = org?.OrganizationName;
            }

            var admin = new Admin
            {
                Email = dto.Email.Trim(),
                Password = dto.Password, // Preserves compatibility with existing Admin login flow
                FullName = dto.FullName?.Trim(),
                PhoneNumber = dto.PhoneNumber?.Trim(),
                OrganizationId = dto.OrganizationId,
                OrganizationName = orgName,
                Role = "Admin",
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Admins.Add(admin);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "Create",
                module: "Admins",
                entityId: admin.Id.ToString(),
                description: $"Created Admin '{admin.Email}' assigned to Org: {orgName ?? "None"}",
                user: user,
                ipAddress: ipAddress);

            await _auditLogService.CreateSuperAdminNotificationAsync(
                title: "New Admin Account Created",
                message: $"Admin '{admin.Email}' was created for organization '{orgName ?? "Unassigned"}'.",
                type: "Info");

            return new SuperAdminAdminDto
            {
                Id = admin.Id,
                Email = admin.Email,
                FullName = admin.FullName,
                PhoneNumber = admin.PhoneNumber,
                Role = admin.Role,
                IsActive = admin.IsActive,
                OrganizationId = admin.OrganizationId,
                OrganizationName = admin.OrganizationName,
                EmployeeCount = 0,
                CreatedAt = admin.CreatedAt
            };
        }

        public async Task<SuperAdminAdminDto?> UpdateAdmin(int id, UpdateSuperAdminAdminDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            var admin = await _context.Admins.FirstOrDefaultAsync(x => x.Id == id);
            if (admin == null) return null;

            string? orgName = null;
            if (dto.OrganizationId.HasValue)
            {
                var org = await _context.Organizations.FirstOrDefaultAsync(o => o.Id == dto.OrganizationId.Value);
                orgName = org?.OrganizationName;
            }

            string oldValue = JsonSerializer.Serialize(new
            {
                admin.Email,
                admin.FullName,
                admin.PhoneNumber,
                admin.OrganizationId,
                admin.OrganizationName,
                admin.IsActive
            });

            admin.Email = dto.Email.Trim();
            admin.FullName = dto.FullName?.Trim();
            admin.PhoneNumber = dto.PhoneNumber?.Trim();
            admin.OrganizationId = dto.OrganizationId;
            admin.OrganizationName = orgName;
            admin.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "Update",
                module: "Admins",
                entityId: admin.Id.ToString(),
                description: $"Updated Admin '{admin.Email}' (ID: {admin.Id})",
                oldValue: oldValue,
                newValue: JsonSerializer.Serialize(dto),
                user: user,
                ipAddress: ipAddress);

            return await GetAdminById(admin.Id);
        }

        public async Task<SuperAdminAdminDto?> AssignAdminOrganization(int id, AssignAdminOrganizationDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            var admin = await _context.Admins.FirstOrDefaultAsync(x => x.Id == id);
            if (admin == null) return null;

            string? orgName = null;
            if (dto.OrganizationId.HasValue && dto.OrganizationId.Value > 0)
            {
                var org = await _context.Organizations.FirstOrDefaultAsync(o => o.Id == dto.OrganizationId.Value && !o.IsDeleted);
                if (org == null)
                {
                    throw new InvalidOperationException($"Organization with ID {dto.OrganizationId.Value} not found.");
                }
                orgName = org.OrganizationName;
            }

            string oldValue = JsonSerializer.Serialize(new
            {
                admin.OrganizationId,
                admin.OrganizationName
            });

            admin.OrganizationId = (dto.OrganizationId.HasValue && dto.OrganizationId.Value > 0) ? dto.OrganizationId : null;
            admin.OrganizationName = orgName;

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "AssignOrganization",
                module: "Admins",
                entityId: admin.Id.ToString(),
                description: orgName != null
                    ? $"Assigned Admin '{admin.Email}' (ID: {admin.Id}) to Organization '{orgName}' (ID: {admin.OrganizationId})"
                    : $"Unassigned Admin '{admin.Email}' (ID: {admin.Id}) from Organization",
                oldValue: oldValue,
                newValue: JsonSerializer.Serialize(new { admin.OrganizationId, admin.OrganizationName }),
                user: user,
                ipAddress: ipAddress);

            await _auditLogService.CreateSuperAdminNotificationAsync(
                title: "Admin Organization Assignment Updated",
                message: orgName != null
                    ? $"Admin '{admin.Email}' was assigned to organization '{orgName}'."
                    : $"Admin '{admin.Email}' was unassigned from organization.",
                type: "Info");

            return await GetAdminById(admin.Id);
        }

        public async Task<bool> UpdateAdminStatus(int id, UpdateEntityStatusDto dto, ClaimsPrincipal? user, string? ipAddress)

        {
            var admin = await _context.Admins.FirstOrDefaultAsync(x => x.Id == id);
            if (admin == null) return false;

            string previousStatus = admin.IsActive ? "Active" : "Inactive";
            bool newIsActive = dto.IsActive ?? (string.Equals(dto.Status, "Active", StringComparison.OrdinalIgnoreCase));
            string newStatus = newIsActive ? "Active" : "Inactive";

            admin.IsActive = newIsActive;
            await _context.SaveChangesAsync();

            await _auditLogService.LogStatusChangeAsync(
                entityType: "Admin",
                entityId: admin.Id.ToString(),
                previousStatus: previousStatus,
                newStatus: newStatus,
                reason: dto.Reason,
                user: user);

            await _auditLogService.LogAsync(
                action: "StatusChange",
                module: "Admins",
                entityId: admin.Id.ToString(),
                description: $"Admin '{admin.Email}' status updated from {previousStatus} to {newStatus}. Reason: {dto.Reason ?? "None"}",
                oldValue: previousStatus,
                newValue: newStatus,
                user: user,
                ipAddress: ipAddress);

            return true;
        }

        //public async Task<bool> ResetAdminPassword(int id, ResetAdminPasswordDto dto, ClaimsPrincipal? user, string? ipAddress)
        //{
        //    if (dto.NewPassword != dto.ConfirmPassword)
        //    {
        //        throw new ArgumentException("New password and confirm password do not match.");
        //    }

        //    var admin = await _context.Admins.FirstOrDefaultAsync(x => x.Id == id);
        //    if (admin == null) return false;

        //    admin.Password = dto.NewPassword;
        //    await _context.SaveChangesAsync();

        //    await _auditLogService.LogAsync(
        //        action: "ResetPassword",
        //        module: "Admins",
        //        entityId: admin.Id.ToString(),
        //        description: $"Super Admin reset password for Admin '{admin.Email}'.",
        //        user: user,
        //        ipAddress: ipAddress);

        //    return true;
        //}


        public async Task<bool> ResetAdminPassword(
    int id,
    ResetAdminPasswordDto dto,
    ClaimsPrincipal? user,
    string? ipAddress)
        {
            // ==========================================
            // 1. FIND ADMIN
            // ==========================================

            var admin = await _context.Admins
                .FirstOrDefaultAsync(a => a.Id == id);

            if (admin == null)
            {
                throw new KeyNotFoundException("Admin not found.");
            }


            // ==========================================
            // 2. VALIDATE NEW PASSWORD CONFIRMATION
            // ==========================================

            if (dto.NewPassword != dto.ConfirmPassword)
            {
                throw new InvalidOperationException(
                    "New password and confirmation password do not match.");
            }


            // ==========================================
            // 3. VERIFY CURRENT PASSWORD
            // ==========================================

            bool isCurrentPasswordValid =
                BCrypt.Net.BCrypt.Verify(
                    dto.CurrentPassword,
                    admin.Password
                );

            if (!isCurrentPasswordValid)
            {
                throw new InvalidOperationException(
                    "Current password is incorrect. Password was not changed.");
            }


            // ==========================================
            // 4. OPTIONAL: PREVENT SAME PASSWORD
            // ==========================================

            bool isSamePassword =
                BCrypt.Net.BCrypt.Verify(
                    dto.NewPassword,
                    admin.Password
                );

            if (isSamePassword)
            {
                throw new InvalidOperationException(
                    "New password cannot be the same as your current password.");
            }


            // ==========================================
            // 5. HASH NEW PASSWORD
            // ==========================================

            admin.Password = BCrypt.Net.BCrypt.HashPassword(
                dto.NewPassword.Trim()
            );


            // ==========================================
            // 6. SAVE DATABASE
            // ==========================================

            await _context.SaveChangesAsync();


            // ==========================================
            // 7. AUDIT LOG
            // ==========================================

            await _auditLogService.LogAsync(
                action: "Reset Password",
                module: "Admins",
                entityId: admin.Id.ToString(),
                description: $"Password changed for admin '{admin.Email}'",
                oldValue: null,
                newValue: null,
                user: user,
                ipAddress: ipAddress
            );


            return true;
        }

        public async Task<(bool Success, string Message)> DeleteAdmin(int id, ClaimsPrincipal? user, string? ipAddress)
        {
            var admin = await _context.Admins.FirstOrDefaultAsync(a => a.Id == id);
            if (admin == null)
            {
                return (false, "Admin not found.");
            }

            // Find a fallback admin in the same organization to take over employees & branches
            Admin? fallbackAdmin = null;
            if (admin.OrganizationId.HasValue)
            {
                fallbackAdmin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.OrganizationId == admin.OrganizationId.Value && a.Id != admin.Id);
            }

            // 1. Clean up AdminPermissions
            var adminPerms = await _context.AdminPermissions.Where(p => p.AdminId == admin.Id).ToListAsync();
            if (adminPerms.Any())
            {
                _context.AdminPermissions.RemoveRange(adminPerms);
            }

            // 2. Clean up AdminNotifications
            var adminNotifs = await _context.AdminNotifications.Where(n => n.AdminId == admin.Id).ToListAsync();
            if (adminNotifs.Any())
            {
                _context.AdminNotifications.RemoveRange(adminNotifs);
            }

            // 3. Clean up AdminSubscriptions
            var adminSubs = await _context.AdminSubscriptions.Where(s => s.AdminId == admin.Id).ToListAsync();
            if (adminSubs.Any())
            {
                _context.AdminSubscriptions.RemoveRange(adminSubs);
            }

            // 4. Reassign employees
            var linkedEmployees = await _context.Employees.Where(e => e.AdminId == admin.Id).ToListAsync();
            foreach (var emp in linkedEmployees)
            {
                emp.AdminId = fallbackAdmin?.Id;
            }

            // 5. Reassign branches
            var linkedBranches = await _context.Branches.Where(b => b.AdminId == admin.Id).ToListAsync();
            foreach (var branch in linkedBranches)
            {
                branch.AdminId = fallbackAdmin?.Id;
            }

            // 6. Delete the admin record
            _context.Admins.Remove(admin);
            await _context.SaveChangesAsync();

            // 7. Audit log
            await _auditLogService.LogAsync(
                action: "Delete",
                module: "Admins",
                entityId: admin.Id.ToString(),
                description: $"Deleted Admin '{admin.Email}' (ID: {admin.Id}) from Organization '{admin.OrganizationName ?? "N/A"}'",
                user: user,
                ipAddress: ipAddress);

            return (true, "Admin deleted successfully.");
        }

        public async Task<(bool Success, string Message)> RemoveAdminFromOrganization(int organizationId, int adminId, ClaimsPrincipal? user, string? ipAddress)
        {
            var admin = await _context.Admins.FirstOrDefaultAsync(a => a.Id == adminId && a.OrganizationId == organizationId);
            if (admin == null)
            {
                return (false, "Admin not found in this organization.");
            }

            return await DeleteAdmin(adminId, user, ipAddress);
        }

        // =========================================================
        // 6. EMPLOYEE MONITORING (Organization-Scoped)
        // =========================================================
        public async Task<PagedResultDto<SuperAdminEmployeeItemDto>> GetEmployeesByOrganization(int organizationId, SuperAdminEmployeeFilterDto filter)
        {
            var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == organizationId && !o.IsDeleted);
            if (org == null)
            {
                return null!;
            }

            int page = Math.Max(1, filter.PageNumber);
            int pageSize = filter.PageSize > 0 ? Math.Min(100, filter.PageSize) : 10;

            if (string.Equals(filter.Search, "string", StringComparison.OrdinalIgnoreCase)) filter.Search = null;
            if (string.Equals(filter.Status, "string", StringComparison.OrdinalIgnoreCase)) filter.Status = null;
            if (string.Equals(filter.Department, "string", StringComparison.OrdinalIgnoreCase)) filter.Department = null;
            if (string.Equals(filter.OnboardingStatus, "string", StringComparison.OrdinalIgnoreCase)) filter.OnboardingStatus = null;
            if (filter.RoleId.HasValue && filter.RoleId.Value <= 0) filter.RoleId = null;

            var query = _context.Employees
                .AsNoTracking()
                .Where(e => e.AdminId != null &&
                    _context.Admins.Any(a => a.Id == e.AdminId && a.OrganizationId == organizationId));

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                string s = filter.Search.Trim().ToLower();
                query = query.Where(e =>
                    e.Name.ToLower().Contains(s) ||
                    e.Employee_Id.ToLower().Contains(s) ||
                    (e.Email != null && e.Email.ToLower().Contains(s)) ||
                    e.Department.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(e => e.Status.ToLower() == filter.Status.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(filter.Department))
            {
                query = query.Where(e => e.Department.ToLower() == filter.Department.Trim().ToLower());
            }

            if (filter.RoleId.HasValue)
            {
                query = query.Where(e => e.RoleId == filter.RoleId.Value);
            }

            int totalCount = await query.CountAsync();

            var items = await (
                from e in query
                join adm in _context.Admins on e.AdminId equals adm.Id into adminJoin
                from a in adminJoin.DefaultIfEmpty()
                orderby e.Id descending
                select new SuperAdminEmployeeItemDto
                {
                    Id = e.Id,
                    EmployeeId = e.Employee_Id,
                    Name = e.Name,
                    Email = e.Email,
                    Department = e.Department,
                    RoleName = e.RoleName,
                    RoleId = e.RoleId,
                    Status = e.Status,
                    CTC = e.CTC,
                    JoiningDate = e.JoiningDate,
                    AdminId = e.AdminId,
                    AdminEmail = a != null ? a.Email : null,
                    OrganizationName = org.OrganizationName
                }
            )
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

            return new PagedResultDto<SuperAdminEmployeeItemDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }

        public async Task<SuperAdminEmployeeDetailDto?> GetEmployeeByOrganizationAndId(int organizationId, string employeeId)
        {
            var match = await (
                from emp in _context.Employees.AsNoTracking()
                join admin in _context.Admins.AsNoTracking() on emp.AdminId equals admin.Id
                where emp.Employee_Id == employeeId && admin.OrganizationId == organizationId
                select new { Employee = emp, Admin = admin }
            ).FirstOrDefaultAsync();

            if (match == null) return null;

            var e = match.Employee;
            var a = match.Admin;

            var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == organizationId);
            string? orgName = org?.OrganizationName ?? a.OrganizationName;

            var personal = await _context.EmployeePersonalInfos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Employee_Id == employeeId);

            var bank = await _context.EmployeeBankDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Employee_Id == employeeId);

            return new SuperAdminEmployeeDetailDto
            {
                Id = e.Id,
                EmployeeId = e.Employee_Id,
                Name = e.Name,
                Email = e.Email,
                Department = e.Department,
                DepartmentId = e.Department_Id,
                BranchId = e.Branch_Id,
                RoleName = e.RoleName,
                RoleId = e.RoleId,
                Status = e.Status,
                CTC = e.CTC,
                JoiningDate = e.JoiningDate,
                AdminId = e.AdminId,
                AdminEmail = a.Email,
                OrganizationName = orgName,
                PersonalInfo = personal != null ? new EmployeePersonalInfoDto
                {
                    Employee_Id = personal.Employee_Id,
                    FirstName = personal.FirstName,
                    LastName = personal.LastName,
                    MiddleName = personal.MiddleName,
                    PhoneNumber = personal.PhoneNumber,
                    Email = personal.Email,
                    Gender = personal.Gender,
                    DateOfBirth = personal.DateOfBirth,
                    AadhaarNumber = personal.AadhaarNumber,
                    PanNumber = personal.PanNumber,
                    BloodGroup = personal.BloodGroup,
                    Marital_Status = personal.Marital_Status,
                    HouseNo = personal.HouseNo,
                    Street = personal.Street,
                    City = personal.City,
                    District = personal.District,
                    State = personal.State,
                    Country = personal.Country,
                    Pincode = personal.Pincode
                } : null,
                BankDetails = bank != null ? new EmployeeBankDetailDto
                {
                    Account_Number = bank.Account_Number,
                    Bank_Name = bank.Bank_Name,
                    IFSC_Code = bank.IFSC_Code,
                    Branch_Name = bank.Branch_Name
                } : null
            };
        }

        public async Task<bool> UpdateEmployeeStatusByOrganization(int organizationId, string employeeId, UpdateEntityStatusDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            var emp = await (
                from employee in _context.Employees
                join admin in _context.Admins on employee.AdminId equals admin.Id
                where employee.Employee_Id == employeeId && admin.OrganizationId == organizationId
                select employee
            ).FirstOrDefaultAsync();

            if (emp == null) return false;

            string previousStatus = emp.Status;
            string newStatus = !string.IsNullOrWhiteSpace(dto.Status)
                ? dto.Status
                : (dto.IsActive.HasValue && dto.IsActive.Value ? "Active" : "Inactive");

            emp.Status = newStatus;
            await _context.SaveChangesAsync();

            await _auditLogService.LogStatusChangeAsync(
                entityType: "Employee",
                entityId: emp.Employee_Id,
                previousStatus: previousStatus,
                newStatus: newStatus,
                reason: dto.Reason,
                user: user);

            await _auditLogService.LogAsync(
                action: "StatusChange",
                module: "Employees",
                entityId: emp.Employee_Id,
                description: $"Changed employee '{emp.Name}' ({emp.Employee_Id}) in Organization ID {organizationId} status from {previousStatus} to {newStatus}. Reason: {dto.Reason ?? "None"}",
                oldValue: previousStatus,
                newValue: newStatus,
                user: user,
                ipAddress: ipAddress);

            return true;
        }

        // =========================================================
        // 7. ROLE MANAGEMENT
        // =========================================================
        public async Task<List<SuperAdminRoleDto>> GetAllRoles()
        {
            var roles = await _context.Roles
                .AsNoTracking()
                .OrderBy(r => r.RoleId)
                .Select(r => new SuperAdminRoleDto
                {
                    RoleId = r.RoleId,
                    Name = r.Name,
                    IsActive = r.IsActive,
                    UserCount = _context.Users.Count(u => u.RoleId == r.RoleId) + _context.Employees.Count(e => e.RoleId == r.RoleId),
                    PermissionCount = _context.RolePermissions.Count(rp => rp.RoleId == r.RoleId && rp.CanAccess)
                })
                .ToListAsync();

            return roles;
        }

        public async Task<SuperAdminRoleDto> CreateRole(CreateRoleDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                throw new ArgumentException("Role name cannot be empty.");
            }

            bool exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == dto.Name.Trim().ToLower());
            if (exists)
            {
                throw new InvalidOperationException($"Role '{dto.Name}' already exists.");
            }

            var role = new Role
            {
                Name = dto.Name.Trim(),
                IsActive = true
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "Create",
                module: "Roles",
                entityId: role.RoleId.ToString(),
                description: $"Created Role '{role.Name}'",
                user: user,
                ipAddress: ipAddress);

            return new SuperAdminRoleDto
            {
                RoleId = role.RoleId,
                Name = role.Name,
                IsActive = role.IsActive,
                UserCount = 0,
                PermissionCount = 0
            };
        }

        public async Task<SuperAdminRoleDto?> UpdateRole(int roleId, CreateRoleDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == roleId);
            if (role == null) return null;

            string oldName = role.Name;
            role.Name = dto.Name.Trim();
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "Update",
                module: "Roles",
                entityId: role.RoleId.ToString(),
                description: $"Renamed Role from '{oldName}' to '{role.Name}'",
                oldValue: oldName,
                newValue: role.Name,
                user: user,
                ipAddress: ipAddress);

            return new SuperAdminRoleDto
            {
                RoleId = role.RoleId,
                Name = role.Name,
                IsActive = role.IsActive,
                UserCount = await _context.Employees.CountAsync(e => e.RoleId == role.RoleId),
                PermissionCount = await _context.RolePermissions.CountAsync(rp => rp.RoleId == role.RoleId && rp.CanAccess)
            };
        }

        public async Task<bool> ToggleRoleStatus(int roleId, bool isActive, ClaimsPrincipal? user, string? ipAddress)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == roleId);
            if (role == null) return false;

            string oldStatus = role.IsActive ? "Active" : "Inactive";
            role.IsActive = isActive;
            string newStatus = isActive ? "Active" : "Inactive";

            await _context.SaveChangesAsync();

            await _auditLogService.LogStatusChangeAsync(
                entityType: "Role",
                entityId: role.RoleId.ToString(),
                previousStatus: oldStatus,
                newStatus: newStatus,
                user: user);

            await _auditLogService.LogAsync(
                action: "StatusChange",
                module: "Roles",
                entityId: role.RoleId.ToString(),
                description: $"Toggled Role '{role.Name}' status to {newStatus}",
                oldValue: oldStatus,
                newValue: newStatus,
                user: user,
                ipAddress: ipAddress);

            return true;
        }

        public async Task<List<RoleUserDto>> GetUsersByRole(int roleId)
        {
            var employees = await (
                from e in _context.Employees.AsNoTracking().Where(x => x.RoleId == roleId)
                join a in _context.Admins on e.AdminId equals a.Id into adminJoin
                from a in adminJoin.DefaultIfEmpty()
                select new RoleUserDto
                {
                    UserId = e.Id,
                    EmployeeId = e.Employee_Id,
                    Name = e.Name,
                    Email = e.Email ?? string.Empty,
                    Status = e.Status,
                    OrganizationName = a != null ? a.OrganizationName : null
                }
            ).ToListAsync();

            return employees;
        }

        // =========================================================
        // 8. AUDIT LOGS
        // =========================================================
        public async Task<PagedResultDto<AuditLogItemDto>> GetAuditLogs(AuditLogFilterDto filter)
        {
            int page = Math.Max(1, filter.PageNumber);
            int pageSize = filter.PageSize > 0 ? Math.Min(200, filter.PageSize) : 20;

            if (string.Equals(filter.Search, "string", StringComparison.OrdinalIgnoreCase)) filter.Search = null;
            if (string.Equals(filter.Module, "string", StringComparison.OrdinalIgnoreCase)) filter.Module = null;
            if (string.Equals(filter.Action, "string", StringComparison.OrdinalIgnoreCase)) filter.Action = null;
            if (string.Equals(filter.UserId, "string", StringComparison.OrdinalIgnoreCase)) filter.UserId = null;
            if (string.Equals(filter.UserRole, "string", StringComparison.OrdinalIgnoreCase)) filter.UserRole = null;

            var query = _context.AuditLogs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                string s = filter.Search.Trim().ToLower();
                query = query.Where(a =>
                    a.Action.ToLower().Contains(s) ||
                    a.Module.ToLower().Contains(s) ||
                    (a.Description != null && a.Description.ToLower().Contains(s)) ||
                    (a.UserName != null && a.UserName.ToLower().Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(filter.Module))
            {
                query = query.Where(a => a.Module.ToLower() == filter.Module.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(filter.Action))
            {
                query = query.Where(a => a.Action.ToLower() == filter.Action.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(filter.UserId))
            {
                query = query.Where(a => a.UserId == filter.UserId.Trim());
            }

            if (!string.IsNullOrWhiteSpace(filter.UserRole))
            {
                query = query.Where(a => a.UserRole != null && a.UserRole.ToLower() == filter.UserRole.Trim().ToLower());
            }

            if (filter.FromDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= filter.FromDate.Value);
            }

            if (filter.ToDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt <= filter.ToDate.Value);
            }

            int totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AuditLogItemDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    UserName = a.UserName,
                    UserRole = a.UserRole,
                    Action = a.Action,
                    Module = a.Module,
                    EntityId = a.EntityId,
                    Description = a.Description,
                    OldValue = a.OldValue,
                    NewValue = a.NewValue,
                    IpAddress = a.IpAddress,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return new PagedResultDto<AuditLogItemDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = page,
                PageSize = pageSize
            };
        }

        public async Task<List<string>> GetAuditModules()
        {
            return await _context.AuditLogs
                .AsNoTracking()
                .Select(a => a.Module)
                .Distinct()
                .OrderBy(m => m)
                .ToListAsync();
        }

        public async Task<List<string>> GetAuditActions()
        {
            return await _context.AuditLogs
                .AsNoTracking()
                .Select(a => a.Action)
                .Distinct()
                .OrderBy(a => a)
                .ToListAsync();
        }

        // =========================================================
        // 9. SYSTEM SETTINGS
        // =========================================================
        public async Task<SystemSettingsDto> GetSystemSettings()
        {
            var settingsList = await _context.SystemSettings.AsNoTracking().ToListAsync();

            var emailSetting = await _context.EmailSettings.AsNoTracking().FirstOrDefaultAsync();

            var dto = new SystemSettingsDto
            {
                AppName = settingsList.FirstOrDefault(s => s.SettingKey == "AppName")?.SettingValue ?? "Employee Management System",
                CompanyLogoUrl = settingsList.FirstOrDefault(s => s.SettingKey == "CompanyLogoUrl")?.SettingValue,
                DefaultTimeZone = settingsList.FirstOrDefault(s => s.SettingKey == "DefaultTimeZone")?.SettingValue ?? "UTC",
                DefaultLanguage = settingsList.FirstOrDefault(s => s.SettingKey == "DefaultLanguage")?.SettingValue ?? "en",
                SessionTimeoutMinutes = int.TryParse(settingsList.FirstOrDefault(s => s.SettingKey == "SessionTimeoutMinutes")?.SettingValue, out int timeout) ? timeout : 120,
                MaxFileUploadSizeMB = int.TryParse(settingsList.FirstOrDefault(s => s.SettingKey == "MaxFileUploadSizeMB")?.SettingValue, out int maxMb) ? maxMb : 10,
                AllowedDocumentTypes = settingsList.FirstOrDefault(s => s.SettingKey == "AllowedDocumentTypes")?.SettingValue ?? ".pdf,.docx,.xlsx,.png,.jpg,.jpeg",
                MaintenanceMode = bool.TryParse(settingsList.FirstOrDefault(s => s.SettingKey == "MaintenanceMode")?.SettingValue, out bool maint) && maint,
                GeneralNotes = settingsList.FirstOrDefault(s => s.SettingKey == "GeneralNotes")?.SettingValue,
                EmailConfigured = emailSetting != null && !string.IsNullOrWhiteSpace(emailSetting.SmtpHost),
                SmtpHost = emailSetting?.SmtpHost,
                SenderEmail = emailSetting?.SenderEmail
            };

            return dto;
        }

        public async Task<SystemSettingsDto> UpdateSystemSettings(UpdateSystemSettingsDto dto, ClaimsPrincipal? user, string? ipAddress)
        {
            var map = new Dictionary<string, string?>
            {
                ["AppName"] = dto.AppName,
                ["CompanyLogoUrl"] = dto.CompanyLogoUrl,
                ["DefaultTimeZone"] = dto.DefaultTimeZone,
                ["DefaultLanguage"] = dto.DefaultLanguage,
                ["SessionTimeoutMinutes"] = dto.SessionTimeoutMinutes.ToString(),
                ["MaxFileUploadSizeMB"] = dto.MaxFileUploadSizeMB.ToString(),
                ["AllowedDocumentTypes"] = dto.AllowedDocumentTypes,
                ["MaintenanceMode"] = dto.MaintenanceMode.ToString(),
                ["GeneralNotes"] = dto.GeneralNotes
            };

            foreach (var kvp in map)
            {
                var existing = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == kvp.Key);
                if (existing == null)
                {
                    _context.SystemSettings.Add(new SystemSetting
                    {
                        SettingKey = kvp.Key,
                        SettingValue = kvp.Value,
                        GroupName = "General",
                        UpdatedAt = DateTime.UtcNow,
                        UpdatedBy = user?.FindFirst(ClaimTypes.Email)?.Value ?? "SuperAdmin"
                    });
                }
                else
                {
                    existing.SettingValue = kvp.Value;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.UpdatedBy = user?.FindFirst(ClaimTypes.Email)?.Value ?? "SuperAdmin";
                }
            }

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                action: "UpdateSettings",
                module: "SystemSettings",
                description: "Super Admin updated system configuration parameters.",
                newValue: JsonSerializer.Serialize(dto),
                user: user,
                ipAddress: ipAddress);

            return await GetSystemSettings();
        }

        // =========================================================
        // 10. GLOBAL SEARCH
        // =========================================================
        public async Task<GlobalSearchResponseDto> GlobalSearch(string keyword)
        {
            var response = new GlobalSearchResponseDto
            {
                Keyword = keyword ?? string.Empty
            };

            if (string.IsNullOrWhiteSpace(keyword) || keyword.Trim().Length < 2)
            {
                return response;
            }

            keyword = keyword.Trim().ToLower();

            // 1. Organizations
            var orgs = await _context.Organizations
                .AsNoTracking()
                .Where(o => !o.IsDeleted && (o.OrganizationName.ToLower().Contains(keyword) || (o.OrganizationCode != null && o.OrganizationCode.ToLower().Contains(keyword))))
                .Take(5)
                .Select(o => new GlobalSearchResultItemDto
                {
                    Id = o.Id.ToString(),
                    Title = o.OrganizationName,
                    Subtitle = $"Code: {o.OrganizationCode ?? "N/A"} | Contact: {o.ContactPerson ?? "N/A"}",
                    EntityType = "Organization",
                    Status = o.Status,
                    NavigationRoute = $"/superadmin/organizations/{o.Id}"
                })
                .ToListAsync();

            // 2. Admins
            var admins = await _context.Admins
                .AsNoTracking()
                .Where(a => a.Email.ToLower().Contains(keyword) || (a.FullName != null && a.FullName.ToLower().Contains(keyword)))
                .Take(5)
                .Select(a => new GlobalSearchResultItemDto
                {
                    Id = a.Id.ToString(),
                    Title = a.FullName ?? a.Email,
                    Subtitle = $"Email: {a.Email} | Org: {a.OrganizationName ?? "Unassigned"}",
                    EntityType = "Admin",
                    Status = a.IsActive ? "Active" : "Inactive",
                    NavigationRoute = $"/superadmin/admins/{a.Id}"
                })
                .ToListAsync();

            // 3. Employees
            var employees = await _context.Employees
                .AsNoTracking()
                .Where(e => e.Name.ToLower().Contains(keyword) || e.Employee_Id.ToLower().Contains(keyword) || (e.Email != null && e.Email.ToLower().Contains(keyword)))
                .Take(5)
                .Select(e => new GlobalSearchResultItemDto
                {
                    Id = e.Employee_Id,
                    Title = e.Name,
                    Subtitle = $"ID: {e.Employee_Id} | Dept: {e.Department} | Role: {e.RoleName}",
                    EntityType = "Employee",
                    Status = e.Status,
                    NavigationRoute = $"/superadmin/employees/{e.Employee_Id}"
                })
                .ToListAsync();

            response.Organizations = orgs;
            response.Admins = admins;
            response.Employees = employees;
            response.TotalMatches = orgs.Count + admins.Count + employees.Count;

            return response;
        }

        // =========================================================
        // 11. NOTIFICATIONS & ALERTS
        // =========================================================
        public async Task<List<SuperAdminNotificationDto>> GetNotifications(bool unreadOnly)
        {
            var query = _context.SuperAdminNotifications.AsNoTracking();

            if (unreadOnly)
            {
                query = query.Where(n => !n.IsRead);
            }

            return await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .Select(n => new SuperAdminNotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    Type = n.Type,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<int> GetUnreadNotificationCount()
        {
            return await _context.SuperAdminNotifications.CountAsync(n => !n.IsRead);
        }

        public async Task<bool> MarkNotificationAsRead(int id)
        {
            var n = await _context.SuperAdminNotifications.FirstOrDefaultAsync(x => x.Id == id);
            if (n == null) return false;

            n.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAllNotificationsAsRead()
        {
            var unread = await _context.SuperAdminNotifications.Where(n => !n.IsRead).ToListAsync();
            foreach (var n in unread)
            {
                n.IsRead = true;
            }
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
