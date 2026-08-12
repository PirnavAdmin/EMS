using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class ReportsService
    {
        private readonly AppDbContext _context;

        public ReportsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AllReportsDTO> GetAllReports()
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            // Employee & Department Counts
            var totalEmployees = await _context.Employees
                .AsNoTracking()
                .CountAsync();

            var totalDepartments = await _context.Departments
                .AsNoTracking()
                .CountAsync();

            // Attendance Counts (SQL handles counting)
            var presentToday = await _context.Attendance
                .AsNoTracking()
                .CountAsync(a =>
                    a.Attendance_Date >= today &&
                    a.Attendance_Date < tomorrow &&
                    (
                        a.Status == "Present" ||
                        a.Status == "present" ||
                        a.Status == "Late" ||
                        a.Status == "late"
                    ));

            var leaveToday = await _context.Attendance
                .AsNoTracking()
                .CountAsync(a =>
                    a.Attendance_Date >= today &&
                    a.Attendance_Date < tomorrow &&
                    (
                        a.Status == "Leave" ||
                        a.Status == "leave"
                    ));

            var absentToday = totalEmployees - (presentToday + leaveToday);

            // Tasks
            var totalTasks = await _context.TaskManagement
                .AsNoTracking()
                .CountAsync();

            // Projects
            var totalProjects = await _context.Projects
                .AsNoTracking()
                .CountAsync();

            // Leaves
            var totalLeaves = await _context.EmployeeLeaves
                .AsNoTracking()
                .CountAsync();

            // Salary
            // Salary for current payroll month
            var currentMonth = DateTime.Now.Month;
            var currentYear = DateTime.Now.Year;

            var selectedMonth = new DateTime(currentYear, currentMonth, 1)
                .ToString("MMMM");

            var totalSalaryPaid = await _context.PaySlips
                .AsNoTracking()
                .Where(p =>
                    p.Month == selectedMonth &&
                    p.Year == currentYear)
                .SumAsync(p => (decimal?)p.NetSalary) ?? 0;

            // Clients
            var totalClients = await _context.Clients
                .AsNoTracking()
                .CountAsync();

            return new AllReportsDTO
            {
                TotalEmployees = totalEmployees,
                TotalDepartments = totalDepartments,
                PresentToday = presentToday,
                AbsentToday = absentToday,
                TotalTasks = totalTasks,
                TotalProjects = totalProjects,
                TotalLeaves = totalLeaves,
                TotalSalaryPaid = totalSalaryPaid,
                TotalClients = totalClients
            };
        }
    }
}