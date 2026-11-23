using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class ReportsService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ReportsService(
            AppDbContext context,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<AllReportsDTO> GetAllReports(ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor?.HttpContext?.User;

            int? orgId = null;
            List<int>? adminIds = null;

            if (user != null)
            {
                var contextResult = await CurrentUserHelper.GetTenantContextAsync(_context, user);
                orgId = contextResult.OrgId;
                adminIds = contextResult.AdminIds;
            }

            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            // Employee & Department Queries
            var empQuery = _context.Employees.AsNoTracking();
            var deptQuery = _context.Departments.AsNoTracking();
            var ticketQuery = _context.Tickets.AsNoTracking();
            var projectQuery = _context.Projects.AsNoTracking();
            var leaveQuery = _context.EmployeeLeaves.AsNoTracking();
            var clientQuery = _context.Clients.AsNoTracking();

            if (orgId.HasValue)
            {
                empQuery = empQuery.Where(e => e.OrganizationId == orgId.Value);
                deptQuery = deptQuery.Where(d => d.OrganizationId == orgId.Value);
                ticketQuery = ticketQuery.Where(t => t.OrganizationId == orgId.Value);
                projectQuery = projectQuery.Where(p => p.OrganizationId == orgId.Value);
                leaveQuery = leaveQuery.Where(l => l.OrganizationId == orgId.Value);
                clientQuery = clientQuery.Where(c => c.OrganizationId == orgId.Value);
            }
            else if (adminIds != null && adminIds.Any())
            {
                empQuery = empQuery.Where(e => e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value));
                clientQuery = clientQuery.Where(c => c.AdminId.HasValue && adminIds.Contains(c.AdminId.Value));
            }

            var totalEmployees = await empQuery.CountAsync();
            var totalDepartments = await deptQuery.CountAsync();

            // Attendance Counts (filtered by tenant employees)
            var attendanceQuery = _context.Attendance
                .AsNoTracking()
                .Where(a => a.Attendance_Date >= today && a.Attendance_Date < tomorrow);

            if (orgId.HasValue)
            {
                attendanceQuery = attendanceQuery.Where(a =>
                    _context.Employees.Any(e => e.Employee_Id == a.Employee_Id && e.OrganizationId == orgId.Value));
            }
            else if (adminIds != null && adminIds.Any())
            {
                attendanceQuery = attendanceQuery.Where(a =>
                    _context.Employees.Any(e => e.Employee_Id == a.Employee_Id && e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value)));
            }

            var presentToday = await attendanceQuery
                .CountAsync(a =>
                    a.Status == "Present" ||
                    a.Status == "present" ||
                    a.Status == "Late" ||
                    a.Status == "late");

            var leaveToday = await attendanceQuery
                .CountAsync(a =>
                    a.Status == "Leave" ||
                    a.Status == "leave");

            var absentToday = Math.Max(0, totalEmployees - (presentToday + leaveToday));

            var totalTickets = await ticketQuery.CountAsync();
            var totalProjects = await projectQuery.CountAsync();
            var totalLeaves = await leaveQuery.CountAsync();

            // Salary for current payroll month (filtered by tenant employees)
            var payslipQuery = _context.PaySlips.AsNoTracking();
            if (orgId.HasValue)
            {
                payslipQuery = payslipQuery.Where(p =>
                    _context.Employees.Any(e => e.Employee_Id == p.EmployeeId && e.OrganizationId == orgId.Value));
            }
            else if (adminIds != null && adminIds.Any())
            {
                payslipQuery = payslipQuery.Where(p =>
                    _context.Employees.Any(e => e.Employee_Id == p.EmployeeId && e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value)));
            }

            var latestPayslip = await payslipQuery
                .OrderByDescending(p => p.Year)
                .ThenByDescending(p => p.Generated_On)
                .FirstOrDefaultAsync();

            decimal totalSalaryPaid = 0;
            if (latestPayslip != null)
            {
                totalSalaryPaid = await payslipQuery
                    .Where(p =>
                        p.Month == latestPayslip.Month &&
                        p.Year == latestPayslip.Year)
                    .SumAsync(p => (decimal?)p.NetSalary) ?? 0;
            }

            var totalClients = await clientQuery.CountAsync();

            return new AllReportsDTO
            {
                TotalEmployees = totalEmployees,
                TotalDepartments = totalDepartments,
                PresentToday = presentToday,
                AbsentToday = absentToday,
                TotalTickets = totalTickets,
                TotalProjects = totalProjects,
                TotalLeaves = totalLeaves,
                TotalSalaryPaid = totalSalaryPaid,
                TotalClients = totalClients
            };
        }
    }
}