using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class FullFinalSettlementService : IFullFinalSettlementService
    {
        private readonly AppDbContext _context;

        public FullFinalSettlementService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> GenerateSettlement(GenerateSettlementDto dto)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.Employee_Id);

            if (employee == null)
                return false;

            bool exists = await _context.FullFinalSettlements
                .AnyAsync(x => x.Employee_Id == dto.Employee_Id);

            if (exists)
                return false;

            // TODO:
            // Replace these values with Payroll, Leave, Assets and TDS calculations
            decimal grossSalary = 0;
            decimal leaveEncashment = 0;
            decimal bonus = 0;
            decimal deductions = 0;

            decimal netSettlement =
                grossSalary +
                leaveEncashment +
                bonus -
                deductions;

            FullFinalSettlement settlement = new FullFinalSettlement
            {
                Employee_Id = dto.Employee_Id,
                GrossSalary = grossSalary,
                LeaveEncashment = leaveEncashment,
                Bonus = bonus,
                Deductions = deductions,
                NetSettlement = netSettlement,
                GeneratedDate = DateTime.Now,
                Status = "Pending"
            };

            _context.FullFinalSettlements.Add(settlement);

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ApproveSettlement(ApproveSettlementDto dto)
        {
            var settlement = await _context.FullFinalSettlements
                .FirstOrDefaultAsync(x => x.SettlementId == dto.SettlementId);

            if (settlement == null)
                return false;

            settlement.Status = dto.IsApproved
                ? "Approved"
                : "Rejected";

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<SettlementResponseDto>> GetAll()
        {
            return await _context.FullFinalSettlements
                .OrderByDescending(x => x.GeneratedDate)
                .Select(x => new SettlementResponseDto
                {
                    SettlementId = x.SettlementId,
                    Employee_Id = x.Employee_Id,
                    GrossSalary = x.GrossSalary,
                    LeaveEncashment = x.LeaveEncashment,
                    Bonus = x.Bonus,
                    Deductions = x.Deductions,
                    NetSettlement = x.NetSettlement,
                    GeneratedDate = x.GeneratedDate,
                    Status = x.Status
                })
                .ToListAsync();
        }

        public async Task<SettlementResponseDto?> GetEmployeeSettlement(string employeeId)
        {
            return await _context.FullFinalSettlements
                .Where(x => x.Employee_Id == employeeId)
                .Select(x => new SettlementResponseDto
                {
                    SettlementId = x.SettlementId,
                    Employee_Id = x.Employee_Id,
                    GrossSalary = x.GrossSalary,
                    LeaveEncashment = x.LeaveEncashment,
                    Bonus = x.Bonus,
                    Deductions = x.Deductions,
                    NetSettlement = x.NetSettlement,
                    GeneratedDate = x.GeneratedDate,
                    Status = x.Status
                })
                .FirstOrDefaultAsync();
        }

        public async Task<bool> DeleteSettlement(int settlementId)
        {
            var settlement = await _context.FullFinalSettlements
                .FirstOrDefaultAsync(x => x.SettlementId == settlementId);

            if (settlement == null)
                return false;

            _context.FullFinalSettlements.Remove(settlement);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}