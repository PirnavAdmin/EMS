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

        public async Task<bool> Create(CreateClearanceDto dto)
        {
            var resignation = await _context.EmployeeResignations
                .FirstOrDefaultAsync(x => x.ResignationId == dto.ResignationId);

            if (resignation == null)
                return false;

            bool exists = await _context.EmployeeClearances
                .AnyAsync(x => x.ResignationId == dto.ResignationId);

            if (exists)
                return false;

            EmployeeClearance clearance = new EmployeeClearance
            {
                ResignationId = dto.ResignationId,
                ITStatus = "Pending",
                AdminStatus = "Pending",
                FinanceStatus = "Pending",
                HRStatus = "Pending"
            };

            _context.EmployeeClearances.Add(clearance);

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> UpdateDepartment(UpdateDepartmentClearanceDto dto)
        {
            var clearance = await _context.EmployeeClearances
                .FirstOrDefaultAsync(x => x.ClearanceId == dto.ClearanceId);

            if (clearance == null)
                return false;

            string status = dto.IsApproved ? "Approved" : "Rejected";

            switch (dto.Department.ToUpper())
            {
                case "IT":
                    clearance.ITStatus = status;
                    clearance.ITRemarks = dto.Remarks;
                    break;

                case "ADMIN":
                    clearance.AdminStatus = status;
                    clearance.AdminRemarks = dto.Remarks;
                    break;

                case "FINANCE":
                    clearance.FinanceStatus = status;
                    clearance.FinanceRemarks = dto.Remarks;
                    break;

                case "HR":
                    clearance.HRStatus = status;
                    clearance.HRRemarks = dto.Remarks;
                    break;

                default:
                    return false;
            }

            if (clearance.ITStatus == "Approved" &&
                clearance.AdminStatus == "Approved" &&
                clearance.FinanceStatus == "Approved" &&
                clearance.HRStatus == "Approved")
            {
                clearance.CompletedDate = DateTime.Now;
            }

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<ClearanceResponseDto?> GetByResignation(int resignationId)
        {
            return await _context.EmployeeClearances
                .Where(x => x.ResignationId == resignationId)
                .Select(x => new ClearanceResponseDto
                {
                    ClearanceId = x.ClearanceId,
                    ResignationId = x.ResignationId,
                    ITStatus = x.ITStatus,
                    AdminStatus = x.AdminStatus,
                    FinanceStatus = x.FinanceStatus,
                    HRStatus = x.HRStatus,
                    CompletedDate = x.CompletedDate
                })
                .FirstOrDefaultAsync();
        }

        public async Task<List<ClearanceResponseDto>> GetPending()
        {
            return await _context.EmployeeClearances
                .Where(x => x.CompletedDate == null)
                .Select(x => new ClearanceResponseDto
                {
                    ClearanceId = x.ClearanceId,
                    ResignationId = x.ResignationId,
                    ITStatus = x.ITStatus,
                    AdminStatus = x.AdminStatus,
                    FinanceStatus = x.FinanceStatus,
                    HRStatus = x.HRStatus,
                    CompletedDate = x.CompletedDate
                })
                .ToListAsync();
        }

        public async Task<List<ClearanceResponseDto>> GetCompleted()
        {
            return await _context.EmployeeClearances
                .Where(x => x.CompletedDate != null)
                .Select(x => new ClearanceResponseDto
                {
                    ClearanceId = x.ClearanceId,
                    ResignationId = x.ResignationId,
                    ITStatus = x.ITStatus,
                    AdminStatus = x.AdminStatus,
                    FinanceStatus = x.FinanceStatus,
                    HRStatus = x.HRStatus,
                    CompletedDate = x.CompletedDate
                })
                .ToListAsync();
        }
    }
}