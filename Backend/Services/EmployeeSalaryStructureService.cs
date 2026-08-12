using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class EmployeeSalaryStructureService
        : IEmployeeSalaryStructureService
    {
        private readonly AppDbContext _context;

        public EmployeeSalaryStructureService(
            AppDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // CREATE
        // ==========================================

        public async Task<EmployeeSalaryStructure> CreateAsync(
      EmployeeSalaryStructureDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Employee_Id))
                throw new Exception("Employee Id is required.");

            var employeeExists = await _context.Employees
                .AnyAsync(x =>
                    x.Employee_Id == dto.Employee_Id);

            if (!employeeExists)
                throw new Exception("Employee not found.");

            var existing = await _context.EmployeeSalaryStructures
                .AnyAsync(x =>
                    x.Employee_Id == dto.Employee_Id);

            if (existing)
            {
                throw new Exception(
                    "Salary structure already exists for this employee.");
            }

            // ==========================================
            // MONTHLY EARNINGS
            // ==========================================

            decimal monthlyEarnings =
                dto.BasicSalary +
                dto.HRA +
                dto.ConveyanceAllowance +
                dto.MedicalAllowance +
                dto.SpecialAllowance;

            // ==========================================
            // MONTHLY CTC
            // ==========================================
            // Employer PF is company/employer cost.
            // Employee PF/PT/TDS are deductions from salary,
            // so don't add them again to CTC.

            decimal monthlyCTC =
                monthlyEarnings +
                dto.EmployerPF;

            monthlyCTC = Math.Round(
                monthlyCTC,
                2,
                MidpointRounding.AwayFromZero);

            // ==========================================
            // ANNUAL CTC
            // ==========================================

            decimal annualCTC =
                Math.Round(
                    monthlyCTC * 12,
                    2,
                    MidpointRounding.AwayFromZero);

            var salary = new EmployeeSalaryStructure
            {
                Employee_Id = dto.Employee_Id,

                // Calculated by backend
                MonthlyCTC = monthlyCTC,
                AnnualCTC = annualCTC,

                // Earnings
                BasicSalary = dto.BasicSalary,
                HRA = dto.HRA,
                ConveyanceAllowance =
                    dto.ConveyanceAllowance,
                MedicalAllowance =
                    dto.MedicalAllowance,
                SpecialAllowance =
                    dto.SpecialAllowance,

                // PF
                EmployeePF = dto.EmployeePF,
                EmployerPF = dto.EmployerPF,

                // Deductions
                ProfessionalTax =
                    dto.ProfessionalTax,

                TDS = dto.TDS,

                OtherDeduction =
                    dto.OtherDeduction,

                EffectiveFrom =
                    dto.EffectiveFrom,

                IsActive =
                    dto.IsActive,

                CreatedAt =
                    DateTime.UtcNow
            };

            _context.EmployeeSalaryStructures.Add(salary);

            await _context.SaveChangesAsync();

            return salary;
        }
        // ==========================================
        // GET BY EMPLOYEE
        // ==========================================

        public async Task<EmployeeSalaryStructure?>
            GetByEmployeeIdAsync(string employeeId)
        {
            return await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == employeeId);
        }

        // ==========================================
        // GET ALL
        // ==========================================

        public async Task<List<EmployeeSalaryStructure>>
            GetAllAsync()
        {
            return await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();
        }

        // ==========================================
        // UPDATE
        // ==========================================

        public async Task<EmployeeSalaryStructure?> UpdateAsync(
       string employeeId,
       EmployeeSalaryStructureDto dto)
        {
            var salary =
                await _context.EmployeeSalaryStructures
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId);

            if (salary == null)
                return null;

            // ==========================================
            // CALCULATE MONTHLY EARNINGS
            // ==========================================

            decimal monthlyEarnings =
                dto.BasicSalary +
                dto.HRA +
                dto.ConveyanceAllowance +
                dto.MedicalAllowance +
                dto.SpecialAllowance;

            // ==========================================
            // CALCULATE MONTHLY CTC
            // ==========================================

            decimal monthlyCTC =
                monthlyEarnings +
                dto.EmployerPF;

            monthlyCTC = Math.Round(
                monthlyCTC,
                2,
                MidpointRounding.AwayFromZero);

            // ==========================================
            // CALCULATE ANNUAL CTC
            // ==========================================

            decimal annualCTC =
                Math.Round(
                    monthlyCTC * 12,
                    2,
                    MidpointRounding.AwayFromZero);

            // ==========================================
            // UPDATE
            // ==========================================

            salary.BasicSalary =
                dto.BasicSalary;

            salary.HRA =
                dto.HRA;

            salary.ConveyanceAllowance =
                dto.ConveyanceAllowance;

            salary.MedicalAllowance =
                dto.MedicalAllowance;

            salary.SpecialAllowance =
                dto.SpecialAllowance;

            salary.EmployeePF =
                dto.EmployeePF;

            salary.EmployerPF =
                dto.EmployerPF;

            salary.ProfessionalTax =
                dto.ProfessionalTax;

            salary.TDS =
                dto.TDS;

            salary.OtherDeduction =
                dto.OtherDeduction;

            // Calculated values
            salary.MonthlyCTC =
                monthlyCTC;

            salary.AnnualCTC =
                annualCTC;

            salary.EffectiveFrom =
                dto.EffectiveFrom;

            salary.IsActive =
                dto.IsActive;

            salary.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return salary;
        }   // ==========================================
        // DELETE
        // ==========================================

        public async Task<bool> DeleteAsync(
            string employeeId)
        {
            var salary =
                await _context.EmployeeSalaryStructures
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId);

            if (salary == null)
                return false;

            _context.EmployeeSalaryStructures
                .Remove(salary);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}