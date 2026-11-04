using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.DTOs
{
    // ==========================================
    // PAGINATION WRAPPER
    // ==========================================
    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    }

    // ==========================================
    // ENHANCED DASHBOARD
    // ==========================================
    public class SuperAdminEnhancedDashboardDto
    {
        // 1. Organization / Client metrics
        public int TotalOrganizations { get; set; }
        public int ActiveOrganizations { get; set; }
        public int InactiveOrganizations { get; set; }

        // 2. Admin metrics
        public int TotalAdmins { get; set; }
        public int ActiveAdmins { get; set; }
        public int InactiveAdmins { get; set; }

        // 3. Employee metrics
        public int TotalEmployees { get; set; }
        public int ActiveEmployees { get; set; }
        public int InactiveEmployees { get; set; }
        public int BlockedEmployees { get; set; }

        // 4. Onboarding metrics
        public int PendingOnboardingEmployees { get; set; }
        public int CompletedOnboardingEmployees { get; set; }
        public int TotalUsers { get; set; }

        // 5. Subscription metrics
        public int ActiveSubscriptions { get; set; }
        public int ExpiredSubscriptions { get; set; }
        public int ExpiringSoon { get; set; }
        public int NoSubscription { get; set; }

        // 6. User Capacity
        public int TotalAllowedUsers { get; set; }
        public int TotalCurrentUsers { get; set; }
        public int TotalRemainingUsers { get; set; }

        // 7. Recent entities
        public List<RecentOrganizationItemDto> RecentOrganizations { get; set; } = new();
        public List<RecentAdminItemDto> RecentAdmins { get; set; } = new();
        public List<RecentEmployeeItemDto> RecentEmployees { get; set; } = new();
        public List<RecentActivityItemDto> RecentActivities { get; set; } = new();
        public List<PendingApprovalItemDto> PendingApprovals { get; set; } = new();

        // 8. Backward-compatible Client breakdown
        public List<ClientDashboardItemDto> Clients { get; set; } = new();
    }

    public class RecentOrganizationItemDto
    {
        public int Id { get; set; }
        public string OrganizationName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Status { get; set; }
        public int EmployeeCount { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class RecentAdminItemDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? OrganizationName { get; set; }
        public bool IsActive { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class RecentEmployeeItemDto
    {
        public int Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Department { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime JoiningDate { get; set; }
    }

    public class RecentActivityItemDto
    {
        public int Id { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Activity { get; set; } = string.Empty;
        public string? User { get; set; }
        public string? Module { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PendingApprovalItemDto
    {
        public string Type { get; set; } = string.Empty; // "Onboarding", "Leave", "Resignation", "Clearance"
        public string Identifier { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequestedBy { get; set; } = string.Empty;
        public DateTime DateRequested { get; set; }
    }

    // ==========================================
    // ORGANIZATION DTOS
    // ==========================================
    public class SuperAdminOrgDto
    {
        public int Id { get; set; }
        public string OrganizationName { get; set; } = string.Empty;
        public string? OrganizationCode { get; set; }
        public string? ContactPerson { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string Status { get; set; } = "Active";
        public bool IsActive => string.Equals(Status, "Active", StringComparison.OrdinalIgnoreCase);
        public int AdminCount { get; set; }
        public int EmployeeCount { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public List<SuperAdminAdminDto> Admins { get; set; } = new();
    }

    public class CreateOrganizationDto
    {
        [Required]
        public string OrganizationName { get; set; } = string.Empty;
        public string? OrganizationCode { get; set; }
        public string? ContactPerson { get; set; }
        [EmailAddress]
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string Status { get; set; } = "Active";
    }

    public class UpdateOrganizationDto
    {
        [Required]
        public string OrganizationName { get; set; } = string.Empty;
        public string? OrganizationCode { get; set; }
        public string? ContactPerson { get; set; }
        [EmailAddress]
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string Status { get; set; } = "Active";

        public List<UpdateOrganizationAdminDto>? Admins { get; set; }
        public List<int>? AdminIds { get; set; }
        public List<int>? DeletedAdminIds { get; set; }
        public List<int>? RemovedAdminIds { get; set; }
    }

    [JsonConverter(typeof(UpdateOrganizationAdminDtoConverter))]
    public class UpdateOrganizationAdminDto
    {
        // Null = Create new admin
        // Value = Update existing admin
        public int? Id { get; set; }

        public string? Email { get; set; }

        // Optional during update.
        // Required when creating a new admin.
        public string? Password { get; set; }

        public string? FullName { get; set; }

        public string? PhoneNumber { get; set; }

        public bool IsActive { get; set; } = true;

        public string? Status { get; set; }

        public bool IsDeleted { get; set; } = false;
    }

    public class UpdateOrganizationAdminDtoConverter : JsonConverter<UpdateOrganizationAdminDto>
    {
        public override UpdateOrganizationAdminDto? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }

            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetInt32(out int intId))
                {
                    return new UpdateOrganizationAdminDto { Id = intId };
                }
            }

            if (reader.TokenType == JsonTokenType.String)
            {
                string? str = reader.GetString();
                if (int.TryParse(str, out int parsedId))
                {
                    return new UpdateOrganizationAdminDto { Id = parsedId };
                }
                return new UpdateOrganizationAdminDto { Email = str ?? string.Empty };
            }

            if (reader.TokenType == JsonTokenType.StartObject)
            {
                using var jsonDoc = JsonDocument.ParseValue(ref reader);
                var root = jsonDoc.RootElement;
                var dto = new UpdateOrganizationAdminDto();

                foreach (var prop in root.EnumerateObject())
                {
                    var propName = prop.Name.ToLowerInvariant();
                    switch (propName)
                    {
                        case "id":
                        case "adminid":
                        case "userid":
                        case "_id":
                            if (prop.Value.ValueKind == JsonValueKind.Number && prop.Value.TryGetInt32(out int idVal))
                            {
                                dto.Id = idVal;
                            }
                            else if (prop.Value.ValueKind == JsonValueKind.String && int.TryParse(prop.Value.GetString(), out int idFromStr))
                            {
                                dto.Id = idFromStr;
                            }
                            break;

                        case "email":
                        case "adminemail":
                        case "useremail":
                            dto.Email = prop.Value.GetString();
                            break;

                        case "fullname":
                        case "name":
                        case "adminname":
                        case "username":
                            dto.FullName = prop.Value.GetString();
                            break;

                        case "password":
                        case "pass":
                            dto.Password = prop.Value.GetString();
                            break;

                        case "phonenumber":
                        case "phone":
                        case "mobile":
                        case "contactnumber":
                            dto.PhoneNumber = prop.Value.GetString();
                            break;

                        case "isactive":
                            if (prop.Value.ValueKind == JsonValueKind.True || prop.Value.ValueKind == JsonValueKind.False)
                            {
                                dto.IsActive = prop.Value.GetBoolean();
                            }
                            else if (prop.Value.ValueKind == JsonValueKind.String)
                            {
                                dto.IsActive = !string.Equals(prop.Value.GetString(), "false", StringComparison.OrdinalIgnoreCase);
                            }
                            break;

                        case "status":
                            dto.Status = prop.Value.GetString();
                            if (string.Equals(dto.Status, "deleted", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(dto.Status, "removed", StringComparison.OrdinalIgnoreCase))
                            {
                                dto.IsDeleted = true;
                            }
                            break;

                        case "isdeleted":
                        case "deleted":
                        case "isremoved":
                        case "removed":
                        case "_destroy":
                            if (prop.Value.ValueKind == JsonValueKind.True)
                            {
                                dto.IsDeleted = true;
                            }
                            else if (prop.Value.ValueKind == JsonValueKind.String)
                            {
                                dto.IsDeleted = string.Equals(prop.Value.GetString(), "true", StringComparison.OrdinalIgnoreCase);
                            }
                            break;
                    }
                }

                return dto;
            }

            return null;
        }

        public override void Write(Utf8JsonWriter writer, UpdateOrganizationAdminDto value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            if (value.Id.HasValue)
            {
                writer.WriteNumber("id", value.Id.Value);
            }
            if (!string.IsNullOrEmpty(value.Email))
            {
                writer.WriteString("email", value.Email);
            }
            if (!string.IsNullOrEmpty(value.FullName))
            {
                writer.WriteString("fullName", value.FullName);
            }
            if (!string.IsNullOrEmpty(value.PhoneNumber))
            {
                writer.WriteString("phoneNumber", value.PhoneNumber);
            }
            writer.WriteBoolean("isActive", value.IsActive);
            if (value.IsDeleted)
            {
                writer.WriteBoolean("isDeleted", value.IsDeleted);
            }
            writer.WriteEndObject();
        }
    }

    // ==========================================
    // ADMIN DTOS
    // ==========================================
    public class SuperAdminAdminDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = "Admin";
        public bool IsActive { get; set; }
        public int? OrganizationId { get; set; }
        public string? OrganizationName { get; set; }
        public int EmployeeCount { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? LastLogin { get; set; }
    }

    public class CreateSuperAdminAdminDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public int? OrganizationId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateSuperAdminAdminDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public int? OrganizationId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ResetAdminPasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        [Compare("NewPassword", ErrorMessage = "New password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class AssignAdminOrganizationDto
    {
        public int? OrganizationId { get; set; }
    }


    // ==========================================
    // EMPLOYEE MONITORING DTOS
    // ==========================================
    public class SuperAdminEmployeeFilterDto
    {
        public string? Search { get; set; }
        public int? OrganizationId { get; set; }
        public int? AdminId { get; set; }
        public string? Status { get; set; } // "Active", "Inactive", "Blocked", "Pending"
        public string? OnboardingStatus { get; set; } // "Pending", "Approved", "Rejected"
        public string? Department { get; set; }
        public int? RoleId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class SuperAdminEmployeeItemDto
    {
        public int Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Department { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
        public int? RoleId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal CTC { get; set; }
        public DateTime JoiningDate { get; set; }
        public int? AdminId { get; set; }
        public string? AdminEmail { get; set; }
        public string? OrganizationName { get; set; }
    }

    public class SuperAdminEmployeeDetailDto
    {
        public int Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Department { get; set; } = string.Empty;
        public string? DepartmentId { get; set; }
        public string? BranchId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public int? RoleId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal CTC { get; set; }
        public DateTime JoiningDate { get; set; }
        public int? AdminId { get; set; }
        public string? AdminEmail { get; set; }
        public string? OrganizationName { get; set; }

        public EmployeePersonalInfoDto? PersonalInfo { get; set; }
        public EmployeeBankDetailDto? BankDetails { get; set; }
    }

    // ==========================================
    // STATUS TOGGLE & HISTORY DTOS
    // ==========================================
    public class UpdateEntityStatusDto
    {
        public string? Status { get; set; } // "Active", "Inactive", "Blocked", "Suspended"
        public bool? IsActive { get; set; }
        public string? Reason { get; set; }
    }

    public class StatusChangeLogItemDto
    {
        public int Id { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string? PreviousStatus { get; set; }
        public string NewStatus { get; set; } = string.Empty;
        public string? ChangedByUserId { get; set; }
        public string? ChangedByRole { get; set; }
        public string? Reason { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ==========================================
    // ROLES & PERMISSION GOVERNANCE DTOS
    // ==========================================
    public class SuperAdminRoleDto
    {
        public int RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int UserCount { get; set; }
        public int PermissionCount { get; set; }
    }

    public class SuperAdminModulePermissionDto
    {
        public int ModuleId { get; set; }
        public string ModuleName { get; set; } = string.Empty;
        public string? Type { get; set; }
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanAccess { get; set; }
    }

    public class AssignRolePermissionsDto
    {
        [Required]
        public int RoleId { get; set; }
        public List<ModulePermissionItemDto> Modules { get; set; } = new();
    }

    public class ModulePermissionItemDto
    {
        public int ModuleId { get; set; }
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanAccess { get; set; }
    }

    public class RoleUserDto
    {
        public int UserId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? OrganizationName { get; set; }
    }

    // ==========================================
    // AUDIT LOG DTOS
    // ==========================================
    public class AuditLogFilterDto
    {
        public string? Search { get; set; }
        public string? Module { get; set; }
        public string? Action { get; set; }
        public string? UserId { get; set; }
        public string? UserRole { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class AuditLogItemDto
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserRole { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string? EntityId { get; set; }
        public string? Description { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ==========================================
    // SYSTEM SETTINGS DTOS
    // ==========================================
    public class SystemSettingsDto
    {
        public string AppName { get; set; } = "Employee Management System";
        public string? CompanyLogoUrl { get; set; }
        public string DefaultTimeZone { get; set; } = "UTC";
        public string DefaultLanguage { get; set; } = "en";
        public int SessionTimeoutMinutes { get; set; } = 120;
        public int MaxFileUploadSizeMB { get; set; } = 10;
        public string AllowedDocumentTypes { get; set; } = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg";
        public bool EmailConfigured { get; set; }
        public string? SmtpHost { get; set; }
        public string? SenderEmail { get; set; }
        public bool MaintenanceMode { get; set; }
        public string? GeneralNotes { get; set; }
    }

    public class UpdateSystemSettingsDto
    {
        public string AppName { get; set; } = "Employee Management System";
        public string? CompanyLogoUrl { get; set; }
        public string DefaultTimeZone { get; set; } = "UTC";
        public string DefaultLanguage { get; set; } = "en";
        public int SessionTimeoutMinutes { get; set; } = 120;
        public int MaxFileUploadSizeMB { get; set; } = 10;
        public string AllowedDocumentTypes { get; set; } = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg";
        public bool MaintenanceMode { get; set; }
        public string? GeneralNotes { get; set; }
    }

    // ==========================================
    // GLOBAL SEARCH DTOS
    // ==========================================
    public class GlobalSearchResponseDto
    {
        public string Keyword { get; set; } = string.Empty;
        public int TotalMatches { get; set; }
        public List<GlobalSearchResultItemDto> Organizations { get; set; } = new();
        public List<GlobalSearchResultItemDto> Admins { get; set; } = new();
        public List<GlobalSearchResultItemDto> Employees { get; set; } = new();
    }

    public class GlobalSearchResultItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Subtitle { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty; // "Organization", "Admin", "Employee"
        public string Status { get; set; } = string.Empty;
        public string? NavigationRoute { get; set; }
        public string? ExtraInfo { get; set; }
    }

    // ==========================================
    // SUPER ADMIN NOTIFICATION DTOS
    // ==========================================
    public class SuperAdminNotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Type { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ==========================================
    // ORGANIZATION SUBSCRIPTION DTOS
    // ==========================================
    public class OrganizationSubscriptionDto
    {
        public int Id { get; set; }
        public int OrganizationId { get; set; }
        public string OrganizationName { get; set; } = string.Empty;
        public string? OrganizationCode { get; set; }
        public int MaxUsers { get; set; }
        public int CurrentUsers { get; set; }
        public int RemainingUsers { get; set; }
        public double UsagePercentage { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsExpired { get; set; }
        public string? PlanName { get; set; }
        public string? BillingCycle { get; set; }
        public decimal? Price { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }
        public string? CreatedBy { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class CreateOrganizationSubscriptionDto
    {
        [Required]
        public int OrganizationId { get; set; }

        [Required]
        [Range(1, 100000, ErrorMessage = "MaxUsers must be at least 1.")]
        public int MaxUsers { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        [StringLength(100)]
        public string? PlanName { get; set; }

        [StringLength(50)]
        public string? BillingCycle { get; set; } // "Monthly", "Yearly", "Quarterly", "Custom"

        public decimal? Price { get; set; }
    }

    public class UpdateOrganizationSubscriptionDto
    {
        [Required]
        [Range(1, 100000, ErrorMessage = "MaxUsers must be at least 1.")]
        public int MaxUsers { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        [StringLength(100)]
        public string? PlanName { get; set; }

        [StringLength(50)]
        public string? BillingCycle { get; set; }

        public decimal? Price { get; set; }
    }

    public class OrganizationSubscriptionUsageDto
    {
        public int OrganizationId { get; set; }
        public string OrganizationName { get; set; } = string.Empty;
        public string? OrganizationCode { get; set; }
        public int SubscriptionId { get; set; }
        public int MaxUsers { get; set; }
        public int CurrentUsers { get; set; }
        public int RemainingUsers { get; set; }
        public double UsagePercentage { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsExpired { get; set; }
        public int TotalAdmins { get; set; }
        public string? PlanName { get; set; }
        public string? BillingCycle { get; set; }
    }

    public class OrganizationSubscriptionFilterDto
    {
        public string? Search { get; set; }
        public bool? IsActive { get; set; }
        public bool? IsExpired { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
