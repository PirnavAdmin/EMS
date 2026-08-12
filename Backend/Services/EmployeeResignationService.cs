using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class EmployeeResignationService : IEmployeeResignationService
    {
        private readonly AppDbContext _context;

        public EmployeeResignationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> ApplyResignation(CreateResignationDto dto)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.Employee_Id);

            if (employee == null)
                return false;

            bool alreadyApplied = await _context.EmployeeResignations
                .AnyAsync(x => x.Employee_Id == dto.Employee_Id &&
                               x.OverallStatus == "Pending");

            if (alreadyApplied)
                return false;

            EmployeeResignation resignation = new EmployeeResignation
            {
                Employee_Id = dto.Employee_Id,
                ResignationDate = dto.ResignationDate,
                LastWorkingDate = dto.LastWorkingDate,
                NoticePeriod = (dto.LastWorkingDate - dto.ResignationDate).Days,
                Reason = dto.Reason,
                ManagerStatus = "Pending",
                HRStatus = "Pending",
                OverallStatus = "Pending",
                CreatedDate = DateTime.Now
            };

            _context.EmployeeResignations.Add(resignation);

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> UpdateResignation(UpdateResignationDto dto)
        {
            var resignation = await _context.EmployeeResignations
                .FirstOrDefaultAsync(x => x.ResignationId == dto.ResignationId);

            if (resignation == null)
                return false;

            if (resignation.ManagerStatus != "Pending")
                return false;

            resignation.LastWorkingDate = dto.LastWorkingDate;
            resignation.Reason = dto.Reason;
            resignation.NoticePeriod =
                (dto.LastWorkingDate - resignation.ResignationDate).Days;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeleteResignation(int resignationId)
        {
            var resignation = await _context.EmployeeResignations
                .FirstOrDefaultAsync(x => x.ResignationId == resignationId);

            if (resignation == null)
                return false;

            if (resignation.ManagerStatus != "Pending")
                return false;

            _context.EmployeeResignations.Remove(resignation);

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<ResignationResponseDto>> GetAll()
        {
            return await _context.EmployeeResignations
                .OrderByDescending(x => x.CreatedDate)
                .Select(x => new ResignationResponseDto
                {
                    ResignationId = x.ResignationId,
                    Employee_Id = x.Employee_Id,
                    ResignationDate = x.ResignationDate,
                    LastWorkingDate = x.LastWorkingDate,
                    NoticePeriod = x.NoticePeriod,
                    Reason = x.Reason,
                    ManagerStatus = x.ManagerStatus,
                    HRStatus = x.HRStatus,
                    OverallStatus = x.OverallStatus,
                    CreatedDate = x.CreatedDate
                }).ToListAsync();
        }

        public async Task<ResignationResponseDto?> GetById(int resignationId)
        {
            return await _context.EmployeeResignations
                .Where(x => x.ResignationId == resignationId)
                .Select(x => new ResignationResponseDto
                {
                    ResignationId = x.ResignationId,
                    Employee_Id = x.Employee_Id,
                    ResignationDate = x.ResignationDate,
                    LastWorkingDate = x.LastWorkingDate,
                    NoticePeriod = x.NoticePeriod,
                    Reason = x.Reason,
                    ManagerStatus = x.ManagerStatus,
                    HRStatus = x.HRStatus,
                    OverallStatus = x.OverallStatus,
                    CreatedDate = x.CreatedDate
                }).FirstOrDefaultAsync();
        }

        public async Task<List<ResignationResponseDto>> GetByEmployee(string employeeId)
        {
            return await _context.EmployeeResignations
                .Where(x => x.Employee_Id == employeeId)
                .OrderByDescending(x => x.CreatedDate)
                .Select(x => new ResignationResponseDto
                {
                    ResignationId = x.ResignationId,
                    Employee_Id = x.Employee_Id,
                    ResignationDate = x.ResignationDate,
                    LastWorkingDate = x.LastWorkingDate,
                    NoticePeriod = x.NoticePeriod,
                    Reason = x.Reason,
                    ManagerStatus = x.ManagerStatus,
                    HRStatus = x.HRStatus,
                    OverallStatus = x.OverallStatus,
                    CreatedDate = x.CreatedDate
                }).ToListAsync();
        }

        public async Task<List<ResignationResponseDto>> GetPendingManagerApprovals()
        {
            return await _context.EmployeeResignations
                .Where(x => x.ManagerStatus == "Pending")
                .Select(x => new ResignationResponseDto
                {
                    ResignationId = x.ResignationId,
                    Employee_Id = x.Employee_Id,
                    ResignationDate = x.ResignationDate,
                    LastWorkingDate = x.LastWorkingDate,
                    NoticePeriod = x.NoticePeriod,
                    Reason = x.Reason,
                    ManagerStatus = x.ManagerStatus,
                    HRStatus = x.HRStatus,
                    OverallStatus = x.OverallStatus,
                    CreatedDate = x.CreatedDate
                }).ToListAsync();
        }

        public async Task<List<ResignationResponseDto>> GetPendingHRApprovals()
        {
            return await _context.EmployeeResignations
                .Where(x => x.ManagerStatus == "Approved" &&
                            x.HRStatus == "Pending")
                .Select(x => new ResignationResponseDto
                {
                    ResignationId = x.ResignationId,
                    Employee_Id = x.Employee_Id,
                    ResignationDate = x.ResignationDate,
                    LastWorkingDate = x.LastWorkingDate,
                    NoticePeriod = x.NoticePeriod,
                    Reason = x.Reason,
                    ManagerStatus = x.ManagerStatus,
                    HRStatus = x.HRStatus,
                    OverallStatus = x.OverallStatus,
                    CreatedDate = x.CreatedDate
                }).ToListAsync();
        }

        public async Task<bool> ManagerApproval(ManagerApprovalDto dto)
        {
            var resignation = await _context.EmployeeResignations
                .FirstOrDefaultAsync(x => x.ResignationId == dto.ResignationId);

            if (resignation == null)
                return false;

            resignation.ManagerStatus = dto.IsApproved ? "Approved" : "Rejected";
            resignation.ManagerRemarks = dto.Remarks;

            if (!dto.IsApproved)
                resignation.OverallStatus = "Rejected";

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> HRApproval(HRApprovalDto dto)
        {
            var resignation = await _context.EmployeeResignations
                .FirstOrDefaultAsync(x => x.ResignationId == dto.ResignationId);

            if (resignation == null)
                return false;

            // Manager must approve first
            if (resignation.ManagerStatus != "Approved")
                return false;

            // Prevent duplicate HR approval
            if (resignation.HRStatus != "Pending")
                return false;

            if (dto.IsApproved)
            {
                resignation.HRStatus = "Approved";
                resignation.OverallStatus = "Approved";
            }
            else
            {
                resignation.HRStatus = "Rejected";
                resignation.OverallStatus = "Rejected";
            }

            resignation.HRRemarks = dto.Remarks;

            // Automatically create Employee Clearance
            if (dto.IsApproved)
            {
                bool clearanceExists = await _context.EmployeeClearances
                    .AnyAsync(x => x.ResignationId == resignation.ResignationId);

                if (!clearanceExists)
                {
                    EmployeeClearance clearance = new EmployeeClearance
                    {
                        ResignationId = resignation.ResignationId,
                        ITStatus = "Pending",
                        AdminStatus = "Pending",
                        FinanceStatus = "Pending",
                        HRStatus = "Pending",
                        CompletedDate = null
                    };

                    _context.EmployeeClearances.Add(clearance);
                }
            }

            await _context.SaveChangesAsync();

            return true;
        }
    }
}