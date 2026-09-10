using EmployeeManagementSystem.DTOs;

using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces

{

    public interface ISuperAdminService

    {

        // Authentication & Dashboards

        Task<object> Login(SuperAdminLoginDto dto);

        Task<SuperAdminDashboardDto> GetDashboard();

        Task<SuperAdminEnhancedDashboardDto> GetEnhancedDashboard();

        // Organization Management

        Task<PagedResultDto<SuperAdminOrgDto>> GetOrganizations(string? search, string? status, int page, int pageSize);

        Task<SuperAdminOrgDto?> GetOrganizationById(int id);

        Task<SuperAdminOrgDto> CreateOrganization(CreateOrganizationDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<SuperAdminOrgDto?> UpdateOrganization(int id, UpdateOrganizationDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<bool> UpdateOrganizationStatus(int id, UpdateEntityStatusDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<(bool Success, string Message)> DeleteOrganization(int id, ClaimsPrincipal? user, string? ipAddress);

        // Organization Subscription Management

        Task<OrganizationSubscriptionDto> CreateOrganizationSubscription(CreateOrganizationSubscriptionDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<OrganizationSubscriptionDto?> GetOrganizationSubscription(int organizationId);

        Task<OrganizationSubscriptionDto> UpdateOrganizationSubscription(int organizationId, UpdateOrganizationSubscriptionDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<OrganizationSubscriptionUsageDto> GetOrganizationSubscriptionUsage(int organizationId);

        Task<PagedResultDto<OrganizationSubscriptionDto>> GetAllOrganizationSubscriptions(OrganizationSubscriptionFilterDto filter);

        // Admin Management

        Task<PagedResultDto<SuperAdminAdminDto>> GetAdmins(string? search, bool? isActive, int? organizationId, int page, int pageSize);

        Task<SuperAdminAdminDto?> GetAdminById(int id);

        Task<SuperAdminAdminDto> CreateAdmin(CreateSuperAdminAdminDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<SuperAdminAdminDto?> UpdateAdmin(int id, UpdateSuperAdminAdminDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<SuperAdminAdminDto?> AssignAdminOrganization(int id, AssignAdminOrganizationDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<bool> UpdateAdminStatus(int id, UpdateEntityStatusDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<bool> ResetAdminPassword(int id, ResetAdminPasswordDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<(bool Success, string Message)> DeleteAdmin(int id, ClaimsPrincipal? user, string? ipAddress);

        Task<(bool Success, string Message)> RemoveAdminFromOrganization(int organizationId, int adminId, ClaimsPrincipal? user, string? ipAddress);


        // Employee Monitoring (Organization-Scoped)

        Task<PagedResultDto<SuperAdminEmployeeItemDto>> GetEmployeesByOrganization(int organizationId, SuperAdminEmployeeFilterDto filter);

        Task<SuperAdminEmployeeDetailDto?> GetEmployeeByOrganizationAndId(int organizationId, string employeeId);

        Task<bool> UpdateEmployeeStatusByOrganization(int organizationId, string employeeId, UpdateEntityStatusDto dto, ClaimsPrincipal? user, string? ipAddress);

        // Role Management

        Task<List<SuperAdminRoleDto>> GetAllRoles();

        Task<SuperAdminRoleDto> CreateRole(CreateRoleDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<SuperAdminRoleDto?> UpdateRole(int roleId, CreateRoleDto dto, ClaimsPrincipal? user, string? ipAddress);

        Task<bool> ToggleRoleStatus(int roleId, bool isActive, ClaimsPrincipal? user, string? ipAddress);

        Task<List<RoleUserDto>> GetUsersByRole(int roleId);

        // Audit Logs

        Task<PagedResultDto<AuditLogItemDto>> GetAuditLogs(AuditLogFilterDto filter);

        Task<List<string>> GetAuditModules();

        Task<List<string>> GetAuditActions();

        // System Settings

        Task<SystemSettingsDto> GetSystemSettings();

        Task<SystemSettingsDto> UpdateSystemSettings(UpdateSystemSettingsDto dto, ClaimsPrincipal? user, string? ipAddress);

        // Global Search

        Task<GlobalSearchResponseDto> GlobalSearch(string keyword);

        // Notifications

        Task<List<SuperAdminNotificationDto>> GetNotifications(bool unreadOnly);

        Task<int> GetUnreadNotificationCount();

        Task<bool> MarkNotificationAsRead(int id);

        Task<bool> MarkAllNotificationsAsRead();

    }

}

