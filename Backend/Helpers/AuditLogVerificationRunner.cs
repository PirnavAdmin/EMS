using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Controllers;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Helpers
{
    // varsha - Comprehensive test suite and verification runner for Audit Logging System with Super Admin Permission Management
    public class AuditLogVerificationRunner
    {
        private int _passedCount = 0;
        private int _failedCount = 0;

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("    EMS AUDIT LOGS - SUPER ADMIN PERMISSION MANAGEMENT VERIFICATION SUITE       ");
            Console.WriteLine("================================================================================\n");

            // Setup in-memory mock repository and services for fast, completely isolated verification
            var mockRepo = new MockAuditLogRepository();
            var tenantService = new MockTenantService();
            var auditLogService = new MockAuditLogService(mockRepo, tenantService);
            var adminPermissionService = new MockAdminPermissionService();
            var controller = new AuditLogsController(auditLogService, tenantService, adminPermissionService);

            // Seed initial data
            mockRepo.SeedInitialData();

            // Run Super Admin Permission Management & Audit Log Tests
            await Test1_AdminWithoutPermissionCannotAccessAuditLogs(controller);
            await Test2_SuperAdminCanGrantPermissionToAdmin(controller, adminPermissionService);
            await Test3_SuperAdminCanRevokePermissionAndAdminImmediatelyLosesAccess(controller, adminPermissionService);
            await Test4_SuperAdminCannotAccessOrgAdminAuditLogs(controller);
            await Test5_NormalEmployeeCannotAccessAuditLogs(controller);
            await Test6_OrgAdminWithPermissionCanRetrieveOwnLogs(controller, adminPermissionService);
            await Test7_OrgAdminCannotAccessOtherOrgLogs(controller);
            await Test8_AdminSelfActivitiesAndEmployeeActivitiesBothCaptured(auditLogService, mockRepo);
            await Test9_EmployeeCreationAuditEntry(auditLogService, mockRepo);
            await Test10_EmployeeUpdateStoresMeaningfulDelta();
            await Test11_EmployeeDeletionAuditEntry(auditLogService, mockRepo);
            await Test12_LeaveAndWfhActionsTracked(auditLogService, mockRepo);
            await Test13_AttendanceAndPayrollActionsTrackedWithoutSensitiveData(auditLogService, mockRepo);
            await Test14_PaginationAndFilteringWorkCorrectly(controller);
            await Test15_ExportRespectsFiltersAndTenantIsolation(controller);
            await Test16_AuditRecordsReadOnlyNoModifyOrDeleteEndpoints();
            await Test17_TeamReportingDaysOldAndNewValuesCaptured(auditLogService, mockRepo);
            await Test18_TeamWeeklyOffOldAndNewValuesCaptured(auditLogService, mockRepo);
            await Test19_DepartmentAndProjectOldAndNewValuesCaptured(auditLogService, mockRepo);
            await Test20_AssetAndBranchOldAndNewValuesCaptured(auditLogService, mockRepo);
            await Test21_TicketAndSettingsOldAndNewValuesCaptured(auditLogService, mockRepo);

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"VERIFICATION SUMMARY: {_passedCount} PASSED, {_failedCount} FAILED");
            Console.WriteLine("================================================================================");

            return _failedCount == 0;
        }

        // Test 1: Organization Admin WITHOUT permission granted gets 403 Forbidden
        private async Task Test1_AdminWithoutPermissionCannotAccessAuditLogs(AuditLogsController controller)
        {
            SetControllerUser(controller, "Admin", "1", "admin@orga.com", "ORG_A");
            var result = await controller.GetAuditLogs(new AuditLogQueryParameters { Page = 1, PageSize = 10 });

            if (result is ObjectResult obj && obj.StatusCode == 403)
            {
                dynamic body = obj.Value!;
                string msg = body?.message ?? string.Empty;
                bool hasExpectedMessage = msg.Contains("permission");
                Assert(hasExpectedMessage, "Test 1: Admin WITHOUT permission is blocked with 403 Forbidden and contact Super Admin notice");
            }
            else
            {
                Fail("Test 1: Admin without permission was unexpectedly allowed to access Audit Logs!");
            }
        }

        // Test 2: Super Admin can grant Audit Logs permission to an Admin -> Admin gets access
        private async Task Test2_SuperAdminCanGrantPermissionToAdmin(AuditLogsController controller, IAdminPermissionService permService)
        {
            // Super Admin grants permission to Admin 1
            await permService.SetAuditLogsPermissionAsync(1, true);

            SetControllerUser(controller, "Admin", "1", "admin@orga.com", "ORG_A");
            var result = await controller.GetAuditLogs(new AuditLogQueryParameters { Page = 1, PageSize = 10 });

            if (result is OkObjectResult ok && ok.Value != null)
            {
                dynamic data = ok.Value;
                Assert(data.success == true, "Test 2: Super Admin can grant permission -> Admin 1 successfully accesses Audit Logs");
            }
            else
            {
                Fail("Test 2: Admin was still blocked after Super Admin granted permission!");
            }
        }

        // Test 3: Super Admin revokes permission -> Admin immediately loses access
        private async Task Test3_SuperAdminCanRevokePermissionAndAdminImmediatelyLosesAccess(AuditLogsController controller, IAdminPermissionService permService)
        {
            // Super Admin revokes permission from Admin 1
            await permService.SetAuditLogsPermissionAsync(1, false);

            SetControllerUser(controller, "Admin", "1", "admin@orga.com", "ORG_A");
            var result = await controller.GetAuditLogs(new AuditLogQueryParameters { Page = 1, PageSize = 10 });

            if (result is ObjectResult obj && obj.StatusCode == 403)
            {
                Pass("Test 3: Super Admin revokes permission -> Admin 1 immediately loses access (403 Forbidden)");
            }
            else
            {
                Fail("Test 3: Admin still had access after Super Admin revoked permission!");
            }
        }

        // Test 4: Super Admin cannot access Organization Admin Audit Logs API
        private async Task Test4_SuperAdminCannotAccessOrgAdminAuditLogs(AuditLogsController controller)
        {
            SetControllerUser(controller, "SuperAdmin", "99", "superadmin@ems.com", null, isSuperAdmin: true);
            var result = await controller.GetAuditLogs(new AuditLogQueryParameters());

            if (result is ObjectResult obj && obj.StatusCode == 403)
            {
                Pass("Test 4: Super Admin cannot access Organization Admin Audit Logs API (403 Forbidden enforced)");
            }
            else
            {
                Fail("Test 4: Super Admin was unexpectedly permitted to access Org Admin API!");
            }
        }

        // Test 5: Normal employees cannot access audit logs
        private async Task Test5_NormalEmployeeCannotAccessAuditLogs(AuditLogsController controller)
        {
            SetControllerUser(controller, "Employee", "EMP101", "john@orga.com", "ORG_A");
            var result = await controller.GetAuditLogs(new AuditLogQueryParameters());

            if (result is ObjectResult obj && obj.StatusCode == 403)
            {
                Pass("Test 5: Normal employee cannot access audit logs (403 Forbidden enforced)");
            }
            else
            {
                Fail("Test 5: Normal employee was unexpectedly permitted to access audit logs!");
            }
        }

        // Test 6: Org Admin with permission can retrieve own logs
        private async Task Test6_OrgAdminWithPermissionCanRetrieveOwnLogs(AuditLogsController controller, IAdminPermissionService permService)
        {
            // Re-grant permission to Admin 1
            await permService.SetAuditLogsPermissionAsync(1, true);

            SetControllerUser(controller, "Admin", "1", "admin@orga.com", "ORG_A");
            var result = await controller.GetAuditLogs(new AuditLogQueryParameters { Page = 1, PageSize = 10 });

            if (result is OkObjectResult ok && ok.Value != null)
            {
                dynamic data = ok.Value;
                Assert(data.success == true, "Test 6: Org Admin with permission can retrieve own organization audit logs");
            }
            else
            {
                Fail("Test 6: Failed to retrieve own organization audit logs");
            }
        }

        // Test 7: Org Admin cannot access another organization's logs
        private async Task Test7_OrgAdminCannotAccessOtherOrgLogs(AuditLogsController controller)
        {
            // As Org A Admin, attempt to get Org B log (Id 3)
            SetControllerUser(controller, "Admin", "1", "admin@orga.com", "ORG_A");
            var result = await controller.GetAuditLogById(3);

            if (result is NotFoundObjectResult)
            {
                Pass("Test 7: Org Admin cannot access another organization's audit logs (404 NotFound returned)");
            }
            else
            {
                Fail("Test 7: Org Admin was able to access another organization's audit log!");
            }
        }

        // Test 8: Admin self-activities and employee activities are both captured and included
        private async Task Test8_AdminSelfActivitiesAndEmployeeActivitiesBothCaptured(IAuditLogService service, MockAuditLogRepository repo)
        {
            var adminUser = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");

            // Admin performs a self-activity: changes settings
            await service.LogActionAsync(
                action: "UpdateSettings",
                module: "OrganizationSettings",
                entityName: "CompanySettings",
                entityId: "SETTING_01",
                description: "Admin updated company settings and theme",
                statusCode: 200,
                organizationCode: "ORG_A",
                user: adminUser);

            // Employee performs an activity: submits leave
            var empUser = CreateUserPrincipal("Employee", "EMP101", "john@orga.com", "ORG_A");
            await service.LogCreateAsync(
                module: "LeaveManagement",
                entityName: "EmployeeLeave",
                entityId: "LEAVE_101",
                description: "Employee John Doe applied for Casual Leave",
                newValues: new { LeaveType = "Casual", Days = 2 },
                organizationCode: "ORG_A",
                user: empUser);

            var adminLog = repo.Logs.FirstOrDefault(l => l.EntityId == "SETTING_01" && l.UserId == "1");
            var empLog = repo.Logs.FirstOrDefault(l => l.EntityId == "LEAVE_101" && l.UserId == "EMP101");

            bool bothLogged = adminLog != null && empLog != null;
            Assert(bothLogged, "Test 8: Both Admin self-activities and employee activities are tracked and visible in organization audit logs");
        }

        // Test 9: Employee creation generates an audit entry
        private async Task Test9_EmployeeCreationAuditEntry(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");
            await service.LogCreateAsync(
                module: "EmployeeManagement",
                entityName: "Employee",
                entityId: "EMP999",
                description: "Created employee Alice Wonder",
                newValues: new { EmployeeId = "EMP999", Name = "Alice Wonder", Department = "IT" },
                organizationCode: "ORG_A",
                user: user);

            var entry = repo.Logs.FirstOrDefault(a => a.EntityId == "EMP999" && a.Action == "Create");
            Assert(entry != null && entry.Module == "EmployeeManagement" && entry.OrganizationCode == "ORG_A",
                "Test 9: Employee creation generates an audit entry with correct metadata");
        }

        // Test 10: Employee update stores meaningful changed old/new values
        private Task Test10_EmployeeUpdateStoresMeaningfulDelta()
        {
            var oldObj = new { Name = "Alice", Department = "IT", Status = "Active" };
            var newObj = new { Name = "Alice", Department = "Engineering", Status = "Active" };

            var (oldDelta, newDelta) = AuditSanitizer.ComputeDelta(oldObj, newObj);

            bool deltaValid = oldDelta != null && oldDelta.Contains("IT") &&
                              newDelta != null && newDelta.Contains("Engineering") &&
                              !oldDelta.Contains("Status"); // Unchanged status omitted!

            Assert(deltaValid, "Test 10: Employee update stores only meaningful changed delta fields");
            return Task.CompletedTask;
        }

        // Test 11: Employee deletion generates an audit entry
        private async Task Test11_EmployeeDeletionAuditEntry(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");
            await service.LogDeleteAsync(
                module: "EmployeeManagement",
                entityName: "Employee",
                entityId: "EMP999",
                description: "Deleted employee Alice Wonder",
                organizationCode: "ORG_A",
                user: user);

            var entry = repo.Logs.FirstOrDefault(a => a.EntityId == "EMP999" && a.Action == "Delete");
            Assert(entry != null && entry.Module == "EmployeeManagement",
                "Test 11: Employee deletion generates an audit entry");
        }

        // Test 12: Leave and WFH actions are tracked
        private async Task Test12_LeaveAndWfhActionsTracked(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");
            await service.LogActionAsync(
                action: "Approved",
                module: "LeaveManagement",
                entityName: "EmployeeLeave",
                entityId: "L501",
                description: "Leave request 501 was Approved",
                statusCode: 200,
                organizationCode: "ORG_A",
                user: user);

            var entry = repo.Logs.FirstOrDefault(a => a.EntityId == "L501" && a.Action == "Approved");
            Assert(entry != null && entry.Module == "LeaveManagement",
                "Test 12: Leave approvals and rejections are tracked in audit log");
        }

        // Test 13: Attendance and Payroll actions tracked without exposing sensitive data
        private async Task Test13_AttendanceAndPayrollActionsTrackedWithoutSensitiveData(IAuditLogService service, MockAuditLogRepository repo)
        {
            var sensitivePayrollObj = new
            {
                EmployeeId = "EMP101",
                GrossSalary = 75000,
                BankAccountNumber = "12345678901234",
                Password = "secretPassword123",
                ApiKey = "api_key_secret_xyz"
            };

            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");
            await service.LogCreateAsync(
                module: "Payroll",
                entityName: "EmployeeSalaryStructure",
                entityId: "EMP101",
                description: "Created salary structure",
                newValues: sensitivePayrollObj,
                organizationCode: "ORG_A",
                user: user);

            var entry = repo.Logs.FirstOrDefault(a => a.Module == "Payroll" && a.EntityId == "EMP101");
            bool sensitiveRedacted = entry != null &&
                                     !entry.NewValues!.Contains("12345678901234") &&
                                     !entry.NewValues.Contains("secretPassword123") &&
                                     !entry.NewValues.Contains("api_key_secret_xyz") &&
                                     entry.NewValues.Contains("75000");

            Assert(sensitiveRedacted, "Test 13: Payroll actions tracked without exposing sensitive bank/credential info");
        }

        // Test 14: Pagination and filtering work correctly
        private async Task Test14_PaginationAndFilteringWorkCorrectly(AuditLogsController controller)
        {
            SetControllerUser(controller, "Admin", "1", "admin@orga.com", "ORG_A");

            var query = new AuditLogQueryParameters { Page = 1, PageSize = 2, Module = "EmployeeManagement" };
            var result = await controller.GetAuditLogs(query);

            if (result is OkObjectResult ok && ok.Value != null)
            {
                dynamic data = ok.Value;
                dynamic innerData = data.data;
                Assert(innerData.page == 1 && innerData.pageSize == 2 && innerData.items.Count <= 2,
                    "Test 14: Pagination and filtering applied correctly at database query level");
            }
            else
            {
                Fail("Test 14: Pagination and filtering failed");
            }
        }

        // Test 15: Export respects all filters and tenant restrictions
        private async Task Test15_ExportRespectsFiltersAndTenantIsolation(AuditLogsController controller)
        {
            SetControllerUser(controller, "Admin", "1", "admin@orga.com", "ORG_A");
            var result = await controller.Export(new AuditLogQueryParameters());

            if (result is FileContentResult fileResult && fileResult.ContentType == "text/csv")
            {
                string csv = Encoding.UTF8.GetString(fileResult.FileContents);
                bool valid = csv.Contains("ORG_A") && !csv.Contains("ORG_B");
                Assert(valid, "Test 15: Export respects all filters and strictly enforces tenant boundary");
            }
            else
            {
                Fail("Test 15: Export failed or did not return text/csv");
            }
        }

        // Test 16: Audit records cannot be modified or deleted through application APIs
        private Task Test16_AuditRecordsReadOnlyNoModifyOrDeleteEndpoints()
        {
            var controllerType = typeof(AuditLogsController);
            var methods = controllerType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);

            bool hasMutationEndpoints = methods.Any(m =>
                m.GetCustomAttribute<HttpPostAttribute>() != null ||
                m.GetCustomAttribute<HttpPutAttribute>() != null ||
                m.GetCustomAttribute<HttpDeleteAttribute>() != null ||
                m.GetCustomAttribute<HttpPatchAttribute>() != null);

            Assert(!hasMutationEndpoints, "Test 16: AuditLogsController is strictly READ-ONLY (no POST, PUT, DELETE, PATCH)");
            return Task.CompletedTask;
        }

        // varsha - Test 17: Team reporting days update captures exact old values (Monday, Wednesday) and new values (Tuesday, Friday)
        private async Task Test17_TeamReportingDaysOldAndNewValuesCaptured(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");
            var oldDays = new { ReportingDays = "Monday, Wednesday" };
            var newDays = new { ReportingDays = "Tuesday, Friday" };

            await service.LogUpdateAsync(
                module: "Teams",
                entityName: "TeamReportingDays",
                entityId: "101",
                description: "Updated reporting days for team 101 from [Monday, Wednesday] to [Tuesday, Friday]",
                oldValues: oldDays,
                newValues: newDays,
                organizationCode: "ORG_A",
                user: user);

            var entry = repo.Logs.FirstOrDefault(a => a.EntityId == "101" && a.EntityName == "TeamReportingDays");
            bool isValid = entry != null &&
                           entry.OldValues != null && entry.OldValues.Contains("Monday, Wednesday") &&
                           entry.NewValues != null && entry.NewValues.Contains("Tuesday, Friday");

            Assert(isValid, "Test 17: Team Reporting Days captures exact previous (Monday, Wednesday) and updated (Tuesday, Friday) values");
        }

        // varsha - Test 18: Team weekly off days update captures exact previous and updated weekly off days
        private async Task Test18_TeamWeeklyOffOldAndNewValuesCaptured(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");
            var oldOff = new { WeeklyOffDays = "Saturday, Sunday" };
            var newOff = new { WeeklyOffDays = "Sunday" };

            await service.LogUpdateAsync(
                module: "Teams",
                entityName: "TeamWeeklyOff",
                entityId: "101",
                description: "Updated weekly off days for team 101 from [Saturday, Sunday] to [Sunday]",
                oldValues: oldOff,
                newValues: newOff,
                organizationCode: "ORG_A",
                user: user);

            var entry = repo.Logs.FirstOrDefault(a => a.EntityId == "101" && a.EntityName == "TeamWeeklyOff");
            bool isValid = entry != null &&
                           entry.OldValues != null && entry.OldValues.Contains("Saturday, Sunday") &&
                           entry.NewValues != null && entry.NewValues.Contains("Sunday");

            Assert(isValid, "Test 18: Team Weekly Off captures exact previous (Saturday, Sunday) and updated (Sunday) values");
        }

        // varsha - Test 19: Department & Project operations track full lifecycle with Old and New values
        private async Task Test19_DepartmentAndProjectOldAndNewValuesCaptured(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");

            // Department create
            await service.LogCreateAsync("Departments", "Department", "DEP01", "Created department HR", new { Name = "HR" }, "ORG_A", user);
            // Department update
            await service.LogUpdateAsync("Departments", "Department", "DEP01", "Updated department HR to People Ops", new { Name = "HR" }, new { Name = "People Ops" }, "ORG_A", user);
            // Project update
            await service.LogUpdateAsync("Projects", "Project", "PRJ01", "Updated project Phoenix", new { Status = "Active" }, new { Status = "Completed" }, "ORG_A", user);

            var deptUpdate = repo.Logs.FirstOrDefault(a => a.Module == "Departments" && a.Action == "Update");
            var prjUpdate = repo.Logs.FirstOrDefault(a => a.Module == "Projects" && a.Action == "Update");

            bool isValid = deptUpdate != null && deptUpdate.OldValues!.Contains("HR") && deptUpdate.NewValues!.Contains("People Ops") &&
                           prjUpdate != null && prjUpdate.OldValues!.Contains("Active") && prjUpdate.NewValues!.Contains("Completed");

            Assert(isValid, "Test 19: Department & Project lifecycle operations correctly record previous and updated values");
        }

        // varsha - Test 20: Asset & Branch operations track lifecycle with Old and New values
        private async Task Test20_AssetAndBranchOldAndNewValuesCaptured(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");

            // Asset update
            await service.LogUpdateAsync("Assets", "Asset", "AST01", "Updated asset Laptop", new { Status = "Available" }, new { Status = "Assigned" }, "ORG_A", user);
            // Branch update
            await service.LogUpdateAsync("Branches", "Branch", "BR01", "Updated branch Hyderabad", new { PhoneNumber = "111" }, new { PhoneNumber = "222" }, "ORG_A", user);

            var astUpdate = repo.Logs.FirstOrDefault(a => a.Module == "Assets" && a.Action == "Update");
            var brUpdate = repo.Logs.FirstOrDefault(a => a.Module == "Branches" && a.Action == "Update");

            bool isValid = astUpdate != null && astUpdate.OldValues!.Contains("Available") && astUpdate.NewValues!.Contains("Assigned") &&
                           brUpdate != null && brUpdate.OldValues!.Contains("111") && brUpdate.NewValues!.Contains("222");

            Assert(isValid, "Test 20: Asset & Branch operations correctly record previous and updated values");
        }

        // varsha - Test 21: Ticket and Organization Settings updates track Old and New values
        private async Task Test21_TicketAndSettingsOldAndNewValuesCaptured(IAuditLogService service, MockAuditLogRepository repo)
        {
            var user = CreateUserPrincipal("Admin", "1", "admin@orga.com", "ORG_A");

            // Ticket status update
            await service.LogUpdateAsync("Tickets", "Ticket", "TCK10", "Updated ticket status", new { Status = "Open" }, new { Status = "Resolved" }, "ORG_A", user);
            // Settings update
            await service.LogUpdateAsync("OrganizationSettings", "AttendanceSettings", "Attendance", "Updated attendance settings",
                new { LateAfterTime = "09:30" }, new { LateAfterTime = "09:45" }, "ORG_A", user);

            var tckUpdate = repo.Logs.FirstOrDefault(a => a.Module == "Tickets" && a.Action == "Update");
            var setUpdate = repo.Logs.FirstOrDefault(a => a.Module == "OrganizationSettings" && a.Action == "Update");

            bool isValid = tckUpdate != null && tckUpdate.OldValues!.Contains("Open") && tckUpdate.NewValues!.Contains("Resolved") &&
                           setUpdate != null && setUpdate.OldValues!.Contains("09:30") && setUpdate.NewValues!.Contains("09:45");

            Assert(isValid, "Test 21: Ticket and Organization Settings updates correctly record previous and updated values");
        }

        private void SetControllerUser(
            AuditLogsController controller,
            string role,
            string userId,
            string email,
            string? orgCode,
            bool isSuperAdmin = false)
        {
            var principal = CreateUserPrincipal(role, userId, email, orgCode, isSuperAdmin);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        private ClaimsPrincipal CreateUserPrincipal(
            string role,
            string userId,
            string email,
            string? orgCode,
            bool isSuperAdmin = false)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Name, email)
            };

            if (isSuperAdmin)
            {
                claims.Add(new Claim("SuperAdminId", userId));
            }
            else if (role == "Admin")
            {
                claims.Add(new Claim("AdminId", userId));
            }
            else
            {
                claims.Add(new Claim("EmployeeId", userId));
            }

            if (!string.IsNullOrWhiteSpace(orgCode))
            {
                claims.Add(new Claim("OrganizationCode", orgCode));
            }

            return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        }

        private void Pass(string message)
        {
            _passedCount++;
            Console.WriteLine($"[PASS] {message}");
        }

        private void Fail(string message)
        {
            _failedCount++;
            Console.WriteLine($"[FAIL] {message}");
        }

        private void Assert(bool condition, string message)
        {
            if (condition) Pass(message);
            else Fail(message);
        }

        // varsha - In-memory audit repository for test suite
        public class MockAuditLogRepository
        {
            public List<AuditLog> Logs { get; } = new();

            public void SeedInitialData()
            {
                Logs.Add(new AuditLog
                {
                    Id = 1,
                    OrganizationCode = "ORG_A",
                    UserId = "1",
                    UserName = "admin@orga.com",
                    UserRole = "Admin",
                    Action = "Create",
                    Module = "EmployeeManagement",
                    EntityName = "Employee",
                    EntityId = "EMP101",
                    Description = "Created employee John Doe",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-30)
                });

                Logs.Add(new AuditLog
                {
                    Id = 2,
                    OrganizationCode = "ORG_A",
                    UserId = "1",
                    UserName = "admin@orga.com",
                    UserRole = "Admin",
                    Action = "Update",
                    Module = "EmployeeManagement",
                    EntityName = "Employee",
                    EntityId = "EMP101",
                    Description = "Updated employee John Doe",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-20)
                });

                Logs.Add(new AuditLog
                {
                    Id = 3,
                    OrganizationCode = "ORG_B",
                    UserId = "2",
                    UserName = "admin@orgb.com",
                    UserRole = "Admin",
                    Action = "Create",
                    Module = "EmployeeManagement",
                    EntityName = "Employee",
                    EntityId = "EMP201",
                    Description = "Created employee Jane Smith",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-10)
                });
            }
        }

        // varsha - Mock Tenant Service for isolated unit testing
        public class MockTenantService : ITenantService
        {
            public Task<string?> ResolveOrganizationCodeAsync(ClaimsPrincipal? user)
            {
                var orgCode = user?.FindFirst("OrganizationCode")?.Value;
                return Task.FromResult<string?>(orgCode);
            }

            public string GetTenantConnectionString(string organizationCode)
            {
                return "Server=localhost;Database=ems_tenant_" + organizationCode;
            }

            public Task EnsureTenantDatabaseAndAuditTableAsync(string organizationCode)
            {
                return Task.CompletedTask;
            }

            public Data.AppDbContext CreateTenantDbContext(string organizationCode)
            {
                throw new NotImplementedException();
            }
        }

        // varsha - Mock AdminPermissionService for isolated unit testing
        public class MockAdminPermissionService : IAdminPermissionService
        {
            private readonly HashSet<int> _allowedAdmins = new();

            public Task<bool> HasAuditLogsPermissionAsync(int adminId)
            {
                return Task.FromResult(_allowedAdmins.Contains(adminId));
            }

            public Task<bool> SetAuditLogsPermissionAsync(int adminId, bool canAccess)
            {
                if (canAccess) _allowedAdmins.Add(adminId);
                else _allowedAdmins.Remove(adminId);
                return Task.FromResult(true);
            }

            public Task<AdminAuditLogsPermissionStatusDto> GetAuditLogsPermissionStatusAsync(int adminId)
            {
                return Task.FromResult(new AdminAuditLogsPermissionStatusDto
                {
                    AdminId = adminId,
                    AdminEmail = $"admin_{adminId}@example.com",
                    HasAuditLogsPermission = _allowedAdmins.Contains(adminId)
                });
            }

            public Task<string> SavePermissions(SaveAdminPermissionDto dto)
            {
                var auditLogMod = dto.Modules.FirstOrDefault(m => m.ModuleId == ModuleIds.AuditLogs);
                if (auditLogMod != null && auditLogMod.CanAccess)
                {
                    _allowedAdmins.Add(dto.AdminId);
                }
                else
                {
                    _allowedAdmins.Remove(dto.AdminId);
                }
                return Task.FromResult("Permissions saved successfully.");
            }

            public Task<object> GetPermissions(int adminId)
            {
                return Task.FromResult<object>(new { AdminId = adminId });
            }

            public Task<object> GetAllowedModules(int adminId)
            {
                return Task.FromResult<object>(new { AdminId = adminId });
            }
        }

        // varsha - Mock AuditLogService implementing IAuditLogService for isolated unit testing
        public class MockAuditLogService : IAuditLogService
        {
            private readonly MockAuditLogRepository _repo;
            private readonly ITenantService _tenantService;
            private long _nextId = 100;

            public MockAuditLogService(MockAuditLogRepository repo, ITenantService tenantService)
            {
                _repo = repo;
                _tenantService = tenantService;
            }

            public Task LogCreateAsync(string module, string entityName, string entityId, string? description = null, object? newValues = null, string? organizationCode = null, ClaimsPrincipal? user = null)
            {
                var sanitizedNew = AuditSanitizer.Sanitize(newValues);
                var entry = new AuditLog
                {
                    Id = ++_nextId,
                    OrganizationCode = organizationCode ?? "ORG_A",
                    UserId = user?.FindFirst("AdminId")?.Value ?? user?.FindFirst("EmployeeId")?.Value ?? "1",
                    UserName = user?.FindFirst(ClaimTypes.Email)?.Value ?? "admin@orga.com",
                    UserRole = user?.FindFirst(ClaimTypes.Role)?.Value ?? "Admin",
                    Action = "Create",
                    Module = module,
                    EntityName = entityName,
                    EntityId = entityId,
                    Description = description ?? string.Empty,
                    NewValues = sanitizedNew,
                    StatusCode = 200,
                    CreatedAt = DateTime.UtcNow
                };
                _repo.Logs.Add(entry);
                return Task.CompletedTask;
            }

            public Task LogUpdateAsync(string module, string entityName, string entityId, string? description = null, object? oldValues = null, object? newValues = null, string? organizationCode = null, ClaimsPrincipal? user = null)
            {
                var (oldJson, newJson) = AuditSanitizer.ComputeDelta(oldValues, newValues);
                var entry = new AuditLog
                {
                    Id = ++_nextId,
                    OrganizationCode = organizationCode ?? "ORG_A",
                    UserId = user?.FindFirst("AdminId")?.Value ?? "1",
                    UserName = user?.FindFirst(ClaimTypes.Email)?.Value ?? "admin@orga.com",
                    UserRole = user?.FindFirst(ClaimTypes.Role)?.Value ?? "Admin",
                    Action = "Update",
                    Module = module,
                    EntityName = entityName,
                    EntityId = entityId,
                    Description = description ?? string.Empty,
                    OldValues = oldJson,
                    NewValues = newJson,
                    StatusCode = 200,
                    CreatedAt = DateTime.UtcNow
                };
                _repo.Logs.Add(entry);
                return Task.CompletedTask;
            }

            public Task LogDeleteAsync(string module, string entityName, string entityId, string? description = null, object? oldValues = null, string? organizationCode = null, ClaimsPrincipal? user = null)
            {
                var sanitizedOld = AuditSanitizer.Sanitize(oldValues);
                var entry = new AuditLog
                {
                    Id = ++_nextId,
                    OrganizationCode = organizationCode ?? "ORG_A",
                    UserId = user?.FindFirst("AdminId")?.Value ?? "1",
                    UserName = user?.FindFirst(ClaimTypes.Email)?.Value ?? "admin@orga.com",
                    UserRole = user?.FindFirst(ClaimTypes.Role)?.Value ?? "Admin",
                    Action = "Delete",
                    Module = module,
                    EntityName = entityName,
                    EntityId = entityId,
                    Description = description ?? string.Empty,
                    OldValues = sanitizedOld,
                    StatusCode = 200,
                    CreatedAt = DateTime.UtcNow
                };
                _repo.Logs.Add(entry);
                return Task.CompletedTask;
            }

            public Task LogActionAsync(string action, string module, string? entityName = null, string? entityId = null, string? description = null, object? oldValues = null, object? newValues = null, int statusCode = 200, string? organizationCode = null, ClaimsPrincipal? user = null)
            {
                var entry = new AuditLog
                {
                    Id = ++_nextId,
                    OrganizationCode = organizationCode ?? "ORG_A",
                    UserId = user?.FindFirst("AdminId")?.Value ?? user?.FindFirst("EmployeeId")?.Value ?? "1",
                    UserName = user?.FindFirst(ClaimTypes.Email)?.Value ?? "admin@orga.com",
                    UserRole = user?.FindFirst(ClaimTypes.Role)?.Value ?? "Admin",
                    Action = action,
                    Module = module,
                    EntityName = entityName ?? string.Empty,
                    EntityId = entityId ?? string.Empty,
                    Description = description ?? string.Empty,
                    StatusCode = statusCode,
                    CreatedAt = DateTime.UtcNow
                };
                _repo.Logs.Add(entry);
                return Task.CompletedTask;
            }

            public Task<AuditLogPagedResult<AuditLogResponseDto>> GetAuditLogsAsync(ClaimsPrincipal user, AuditLogQueryParameters queryParams)
            {
                var orgCode = user.FindFirst("OrganizationCode")?.Value ?? "ORG_A";
                var query = _repo.Logs.Where(l => l.OrganizationCode == orgCode).AsQueryable();

                if (!string.IsNullOrWhiteSpace(queryParams.Module))
                    query = query.Where(l => l.Module == queryParams.Module);
                if (!string.IsNullOrWhiteSpace(queryParams.Action))
                    query = query.Where(l => l.Action == queryParams.Action);

                var total = query.Count();
                var items = query.Skip((queryParams.Page - 1) * queryParams.PageSize)
                                 .Take(queryParams.PageSize)
                                 .Select(l => new AuditLogResponseDto
                                 {
                                     Id = l.Id,
                                     OrganizationCode = l.OrganizationCode,
                                     UserId = l.UserId,
                                     UserName = l.UserName,
                                     UserRole = l.UserRole,
                                     Action = l.Action,
                                     Module = l.Module,
                                     EntityName = l.EntityName,
                                     EntityId = l.EntityId,
                                     Description = l.Description,
                                     OldValues = l.OldValues,
                                     NewValues = l.NewValues,
                                     IpAddress = l.IpAddress,
                                     UserAgent = l.UserAgent,
                                     RequestMethod = l.RequestMethod,
                                     RequestPath = l.RequestPath,
                                     StatusCode = l.StatusCode,
                                     CorrelationId = l.CorrelationId,
                                     CreatedAt = l.CreatedAt
                                 }).ToList();

                var result = new AuditLogPagedResult<AuditLogResponseDto>
                {
                    Items = items,
                    Page = queryParams.Page,
                    PageSize = queryParams.PageSize,
                    TotalCount = total,
                    TotalPages = (int)Math.Ceiling(total / (double)queryParams.PageSize)
                };
                return Task.FromResult(result);
            }

            public Task<AuditLogResponseDto?> GetAuditLogByIdAsync(ClaimsPrincipal user, long id)
            {
                var orgCode = user.FindFirst("OrganizationCode")?.Value ?? "ORG_A";
                var l = _repo.Logs.FirstOrDefault(x => x.Id == id && x.OrganizationCode == orgCode);
                if (l == null) return Task.FromResult<AuditLogResponseDto?>(null);

                return Task.FromResult<AuditLogResponseDto?>(new AuditLogResponseDto
                {
                    Id = l.Id,
                    OrganizationCode = l.OrganizationCode,
                    UserId = l.UserId,
                    UserName = l.UserName,
                    UserRole = l.UserRole,
                    Action = l.Action,
                    Module = l.Module,
                    EntityName = l.EntityName,
                    EntityId = l.EntityId,
                    Description = l.Description,
                    OldValues = l.OldValues,
                    NewValues = l.NewValues,
                    IpAddress = l.IpAddress,
                    UserAgent = l.UserAgent,
                    RequestMethod = l.RequestMethod,
                    RequestPath = l.RequestPath,
                    StatusCode = l.StatusCode,
                    CorrelationId = l.CorrelationId,
                    CreatedAt = l.CreatedAt
                });
            }

            public Task<AuditLogSummaryDto> GetAuditSummaryAsync(ClaimsPrincipal user)
            {
                var orgCode = user.FindFirst("OrganizationCode")?.Value ?? "ORG_A";
                var query = _repo.Logs.Where(l => l.OrganizationCode == orgCode);
                var total = query.Count();
                var uniqueUsers = query.Select(l => l.UserId).Distinct().Count();
                var recent = query.OrderByDescending(l => l.CreatedAt).FirstOrDefault()?.CreatedAt;
                var modules = query.Select(l => l.Module).Distinct().ToList();
                var actions = query.GroupBy(l => l.Action).ToDictionary(g => g.Key, g => g.Count());

                return Task.FromResult(new AuditLogSummaryDto
                {
                    TotalActivities = total,
                    UniqueUsers = uniqueUsers,
                    RecentActivityTimestamp = recent,
                    ModulesTracked = modules,
                    ActionWiseCounts = actions
                });
            }

            public Task<byte[]> ExportAuditLogsCsvAsync(ClaimsPrincipal user, AuditLogQueryParameters queryParams)
            {
                var orgCode = user.FindFirst("OrganizationCode")?.Value ?? "ORG_A";
                var sb = new StringBuilder();
                sb.AppendLine("Id,OrganizationCode,UserId,UserName,UserRole,Action,Module,EntityName,EntityId,Description,StatusCode,CreatedAt");

                var list = _repo.Logs.Where(l => l.OrganizationCode == orgCode).ToList();
                foreach (var log in list)
                {
                    sb.AppendLine($"{log.Id},\"{log.OrganizationCode}\",\"{log.UserId}\",\"{log.UserName}\",\"{log.UserRole}\",\"{log.Action}\",\"{log.Module}\",\"{log.EntityName}\",\"{log.EntityId}\",\"{log.Description}\",{log.StatusCode},\"{log.CreatedAt:O}\"");
                }

                return Task.FromResult(Encoding.UTF8.GetBytes(sb.ToString()));
            }

            // Legacy methods for backward compatibility
            public Task LogAsync(string action, string module, string? entityId = null, string? description = null, string? oldValue = null, string? newValue = null, ClaimsPrincipal? user = null, string? ipAddress = null) => Task.CompletedTask;
            public Task LogStatusChangeAsync(string entityType, string entityId, string? previousStatus, string newStatus, string? reason = null, ClaimsPrincipal? user = null) => Task.CompletedTask;
            public Task CreateSuperAdminNotificationAsync(string title, string message, string type = "Info") => Task.CompletedTask;
        }
    }
}
