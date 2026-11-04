using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ShiftRotationService : IShiftRotationService

    {

        private readonly AppDbContext _context;

        public ShiftRotationService(AppDbContext context)

        {

            _context = context;

        }

        public async Task<IEnumerable<ShiftRotation>> GetAllAsync()

        {

            return await _context.ShiftRotations

                .OrderByDescending(x => x.CreatedDate)

                .ToListAsync();

        }

        public async Task<ShiftRotation?> GetByIdAsync(int id)

        {

            return await _context.ShiftRotations

                .FirstOrDefaultAsync(x => x.RotationId == id);

        }

        public async Task<bool> CreateAsync(CreateShiftRotationDto dto)
        {
            if (dto.EmployeeIds == null || dto.EmployeeIds.Count == 0)
                return false;

            if (dto.EffectiveFrom == default)
                return false;

            // 1. Validate mandatory shift 1
            var shift1Exists = await _context.ShiftMasters
                .AnyAsync(x => x.ShiftId == dto.Shift1Id && x.IsActive);

            if (!shift1Exists)
                return false;

            // 2. Validate optional shifts
            if (dto.Shift2Id.HasValue)
            {
                var shift2Exists = await _context.ShiftMasters
                    .AnyAsync(x => x.ShiftId == dto.Shift2Id.Value && x.IsActive);

                if (!shift2Exists || dto.Shift2Id.Value == dto.Shift1Id)
                    return false;
            }

            if (dto.Shift3Id.HasValue)
            {
                var shift3Exists = await _context.ShiftMasters
                    .AnyAsync(x => x.ShiftId == dto.Shift3Id.Value && x.IsActive);

                if (!shift3Exists || dto.Shift3Id.Value == dto.Shift1Id || dto.Shift3Id.Value == dto.Shift2Id)
                    return false;
            }

            // 3. Validate all Employee IDs
            var distinctIds = dto.EmployeeIds
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

            var validEmployeeIds = await _context.Employees
                .Where(x => distinctIds.Contains(x.Employee_Id))
                .Select(x => x.Employee_Id)
                .ToListAsync();

            if (validEmployeeIds.Count != distinctIds.Count)
                return false;

            // 4. Close any existing active rotation and create new rotation for each employee
            foreach (var empId in validEmployeeIds)
            {
                var existingRotations = await _context.ShiftRotations
                    .Where(x => x.Employee_Id == empId && x.IsActive)
                    .ToListAsync();

                foreach (var ex in existingRotations)
                {
                    ex.IsActive = false;
                }

                _context.ShiftRotations.Add(new ShiftRotation
                {
                    Employee_Id = empId,
                    RotationType = dto.RotationType,
                    Shift1Id = dto.Shift1Id,
                    Shift2Id = dto.Shift2Id,
                    Shift3Id = dto.Shift3Id,
                    EffectiveFrom = dto.EffectiveFrom,
                    IsActive = true,
                    CreatedDate = DateTime.Now
                });
            }

            await _context.SaveChangesAsync();
            return true;
        }


        public async Task<bool> UpdateAsync(

            int id,

            UpdateShiftRotationDto dto)

        {

            var rotation = await _context.ShiftRotations

                .FirstOrDefaultAsync(x => x.RotationId == id);

            if (rotation == null)

                return false;

            var employeeExists = await _context.Employees

                .AnyAsync(x => x.Employee_Id == rotation.Employee_Id);

            if (!employeeExists)

                return false;

            var shift1Exists = await _context.ShiftMasters

                .AnyAsync(x =>

                    x.ShiftId == dto.Shift1Id &&

                    x.IsActive);

            if (!shift1Exists)

                return false;

            if (dto.Shift2Id.HasValue)

            {

                var exists = await _context.ShiftMasters.AnyAsync(x =>

                    x.ShiftId == dto.Shift2Id.Value &&

                    x.IsActive);

                if (!exists)

                    return false;

            }

            if (dto.Shift3Id.HasValue)

            {

                var exists = await _context.ShiftMasters.AnyAsync(x =>

                    x.ShiftId == dto.Shift3Id.Value &&

                    x.IsActive);

                if (!exists)

                    return false;

            }

            if (dto.EffectiveFrom == default)

                return false;

            if (dto.Shift2Id.HasValue &&

                dto.Shift2Id.Value == dto.Shift1Id)

            {

                return false;

            }

            if (dto.Shift3Id.HasValue &&

                (dto.Shift3Id.Value == dto.Shift1Id ||

                 dto.Shift3Id.Value == dto.Shift2Id))

            {

                return false;

            }

            rotation.RotationType = dto.RotationType;

            rotation.Shift1Id = dto.Shift1Id;

            rotation.Shift2Id = dto.Shift2Id;

            rotation.Shift3Id = dto.Shift3Id;

            rotation.EffectiveFrom = dto.EffectiveFrom;

            rotation.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> DeleteAsync(int id)

        {

            var rotation = await _context.ShiftRotations

                .FirstOrDefaultAsync(x => x.RotationId == id);

            if (rotation == null)

                return false;

            _context.ShiftRotations.Remove(rotation);

            await _context.SaveChangesAsync();

            return true;

        }

    }

}
