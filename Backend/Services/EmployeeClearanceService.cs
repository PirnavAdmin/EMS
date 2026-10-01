using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class EmployeeClearanceService : IEmployeeClearanceService

    {

        private readonly AppDbContext _context;

        public EmployeeClearanceService(AppDbContext context)

        {

            _context = context;

        }

        // ============================================================

        // CREATE CLEARANCE

        // ============================================================

        public async Task<bool> Create(CreateClearanceDto dto)

        {

            var resignation = await _context.EmployeeResignations

                .Include(x => x.Employee)

                .FirstOrDefaultAsync(x =>

                    x.ResignationId == dto.ResignationId);

            if (resignation == null)

                return false;

            // Clearance can only be created for an approved resignation

            if (!string.Equals(

                    resignation.OverallStatus,

                    "Approved",

                    StringComparison.OrdinalIgnoreCase))

            {

                return false;

            }

            // Prevent duplicate clearance

            bool exists = await _context.EmployeeClearances

                .AnyAsync(x =>

                    x.ResignationId == dto.ResignationId);

            if (exists)

                return false;

            var clearance = new EmployeeClearance

            {

                ResignationId = dto.ResignationId,

                ITStatus = "Pending",

                AdminStatus = "Pending",

                FinanceStatus = "Pending",

                HRStatus = "Pending",

                ITRemarks = null,

                AdminRemarks = null,

                FinanceRemarks = null,

                HRRemarks = null,

                CompletedDate = null

            };

            _context.EmployeeClearances.Add(clearance);

            await _context.SaveChangesAsync();

            return true;

        }

        // ============================================================

        // UPDATE DEPARTMENT CLEARANCE

        // ============================================================

        public async Task<bool> UpdateDepartment(

            UpdateDepartmentClearanceDto dto)

        {

            var clearance = await _context.EmployeeClearances

                .Include(x => x.EmployeeResignation)

                .FirstOrDefaultAsync(x =>

                    x.ClearanceId == dto.ClearanceId);

            if (clearance == null)

                return false;

            // Do not allow clearance processing if resignation

            // is no longer approved.

            if (clearance.EmployeeResignation == null ||

                !string.Equals(

                    clearance.EmployeeResignation.OverallStatus,

                    "Approved",

                    StringComparison.OrdinalIgnoreCase))

            {

                return false;

            }

            // Once clearance is completed, don't modify it.

            if (clearance.CompletedDate != null)

                return false;

            string department =

                dto.Department.Trim().ToUpperInvariant();

            string status =

                dto.IsApproved ? "Approved" : "Rejected";

            switch (department)

            {

                case "IT":

                    // Don't process again after final decision

                    if (clearance.ITStatus != "Pending")

                        return false;

                    clearance.ITStatus = status;

                    clearance.ITRemarks = dto.Remarks;

                    break;

                case "ADMIN":

                    if (clearance.AdminStatus != "Pending")

                        return false;

                    clearance.AdminStatus = status;

                    clearance.AdminRemarks = dto.Remarks;

                    break;

                case "FINANCE":

                    if (clearance.FinanceStatus != "Pending")

                        return false;

                    clearance.FinanceStatus = status;

                    clearance.FinanceRemarks = dto.Remarks;

                    break;

                case "HR":

                    if (clearance.HRStatus != "Pending")

                        return false;

                    clearance.HRStatus = status;

                    clearance.HRRemarks = dto.Remarks;

                    break;

                default:

                    return false;

            }

            // ========================================================

            // FINAL CLEARANCE CHECK

            // ========================================================

            //

            // Clearance is completed only when all four departments

            // have approved.

            //

            if (string.Equals(

                    clearance.ITStatus,

                    "Approved",

                    StringComparison.OrdinalIgnoreCase)
&&

                string.Equals(

                    clearance.AdminStatus,

                    "Approved",

                    StringComparison.OrdinalIgnoreCase)
&&

                string.Equals(

                    clearance.FinanceStatus,

                    "Approved",

                    StringComparison.OrdinalIgnoreCase)
&&

                string.Equals(

                    clearance.HRStatus,

                    "Approved",

                    StringComparison.OrdinalIgnoreCase))

            {

                clearance.CompletedDate = DateTime.Now;

            }

            await _context.SaveChangesAsync();

            return true;

        }

        // ============================================================

        // GET CLEARANCE BY RESIGNATION

        // ============================================================

        public async Task<ClearanceResponseDto?> GetByResignation(

            int resignationId)

        {

            var clearance = await _context.EmployeeClearances

                .Include(x => x.EmployeeResignation)

                    .ThenInclude(x => x!.Employee)

                .FirstOrDefaultAsync(x =>

                    x.ResignationId == resignationId);

            if (clearance == null)

                return null;

            return await BuildResponse(clearance);

        }

        // ============================================================

        // GET PENDING CLEARANCES

        // ============================================================

        public async Task<List<ClearanceResponseDto>> GetPending()

        {

            var clearances = await _context.EmployeeClearances

                .Include(x => x.EmployeeResignation)

                    .ThenInclude(x => x!.Employee)

                .Where(x => x.CompletedDate == null)

                .OrderByDescending(x => x.ClearanceId)

                .ToListAsync();

            var result = new List<ClearanceResponseDto>();

            foreach (var clearance in clearances)

            {

                result.Add(await BuildResponse(clearance));

            }

            return result;

        }

        // ============================================================

        // GET COMPLETED CLEARANCES

        // ============================================================

        public async Task<List<ClearanceResponseDto>> GetCompleted()

        {

            var clearances = await _context.EmployeeClearances

                .Include(x => x.EmployeeResignation)

                    .ThenInclude(x => x!.Employee)

                .Where(x => x.CompletedDate != null)

                .OrderByDescending(x => x.CompletedDate)

                .ToListAsync();

            var result = new List<ClearanceResponseDto>();

            foreach (var clearance in clearances)

            {

                result.Add(await BuildResponse(clearance));

            }

            return result;

        }

        // ============================================================

        // BUILD RESPONSE

        // ============================================================

        private async Task<ClearanceResponseDto> BuildResponse(

            EmployeeClearance clearance)

        {

            string employeeId =

                clearance.EmployeeResignation?.Employee_Id

                ?? string.Empty;

            string employeeName =

                clearance.EmployeeResignation?.Employee?.Name

                ?? string.Empty;

            // --------------------------------------------------------

            // ASSETS

            // --------------------------------------------------------

            var assets = await _context.Assets

                .Where(x =>

                    x.AssignedTo != null &&

                    x.AssignedTo == employeeId)

                .ToListAsync();

            int totalAssets = assets.Count;

            int pendingAssets = assets.Count(x =>

                !string.Equals(

                    x.Status,

                    "Returned",

                    StringComparison.OrdinalIgnoreCase)
&&

                !string.Equals(

                    x.Status,

                    "Available",

                    StringComparison.OrdinalIgnoreCase));

            // --------------------------------------------------------

            // TASKS

            // --------------------------------------------------------

            var tasks = await _context.TaskManagement

                .Where(x =>

                    x.AssignedTo != null &&

                    x.AssignedTo == employeeId)

                .ToListAsync();

            int totalTasks = tasks.Count;

            int pendingTasks = tasks.Count(x =>

                !string.Equals(

                    x.Status,

                    "Completed",

                    StringComparison.OrdinalIgnoreCase));

            // --------------------------------------------------------

            // PROJECTS

            // --------------------------------------------------------

            int totalProjects =

                await _context.ProjectTeamMembers

                    .Where(x =>

                        x.EmployeeId == employeeId)

                    .Select(x => x.ProjectId)

                    .Distinct()

                    .CountAsync();

            return new ClearanceResponseDto

            {

                ClearanceId = clearance.ClearanceId,

                ResignationId = clearance.ResignationId,

                Employee_Id = employeeId,

                EmployeeName = employeeName,

                ResignationDate =

                    clearance.EmployeeResignation?.ResignationDate,

                LastWorkingDate =

                    clearance.EmployeeResignation?.LastWorkingDate,

                ResignationStatus =

                    clearance.EmployeeResignation?.OverallStatus,

                ITStatus = clearance.ITStatus,

                ITRemarks = clearance.ITRemarks,

                AdminStatus = clearance.AdminStatus,

                AdminRemarks = clearance.AdminRemarks,

                FinanceStatus = clearance.FinanceStatus,

                FinanceRemarks = clearance.FinanceRemarks,

                HRStatus = clearance.HRStatus,

                HRRemarks = clearance.HRRemarks,

                CompletedDate = clearance.CompletedDate,

                TotalAssets = totalAssets,

                PendingAssets = pendingAssets,

                TotalTasks = totalTasks,

                PendingTasks = pendingTasks,

                TotalProjects = totalProjects

            };

        }

    }

}
