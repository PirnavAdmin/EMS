using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ShiftChangeRequestService : IShiftChangeRequestService

    {

        private readonly AppDbContext _context;

        public ShiftChangeRequestService(AppDbContext context)

        {

            _context = context;

        }

        public async Task<IEnumerable<ShiftChangeRequest>> GetAllAsync()

        {

            return await _context.ShiftChangeRequests

                .OrderByDescending(x => x.CreatedDate)

                .ToListAsync();

        }

        public async Task<ShiftChangeRequest?> GetByIdAsync(int id)

        {

            return await _context.ShiftChangeRequests

                .FindAsync(id);

        }

        public async Task<bool> CreateAsync(CreateShiftChangeRequestDto dto)

        {

            // Employee validation

            var employeeExists = await _context.Employees

                .AnyAsync(x => x.Employee_Id == dto.Employee_Id);

            if (!employeeExists)

                return false;

            // Current shift validation

            var currentShiftExists = await _context.ShiftMasters

                .AnyAsync(x =>

                    x.ShiftId == dto.CurrentShiftId &&

                    x.IsActive);

            if (!currentShiftExists)

                return false;

            // Requested shift validation

            var requestedShiftExists = await _context.ShiftMasters

                .AnyAsync(x =>

                    x.ShiftId == dto.RequestedShiftId &&

                    x.IsActive);

            if (!requestedShiftExists)

                return false;

            // Cannot request same shift

            if (dto.CurrentShiftId == dto.RequestedShiftId)

                return false;

            // Effective date validation

            if (dto.EffectiveFrom == default)

                return false;

            if (dto.EffectiveTo.HasValue &&

                dto.EffectiveTo.Value.Date < dto.EffectiveFrom.Date)

            {

                return false;

            }

            // Only one pending request per employee

            var exists = await _context.ShiftChangeRequests.AnyAsync(x =>

                x.Employee_Id == dto.Employee_Id &&

                x.Status == "Pending");

            if (exists)

                return false;

            var request = new ShiftChangeRequest

            {

                Employee_Id = dto.Employee_Id,

                CurrentShiftId = dto.CurrentShiftId,

                RequestedShiftId = dto.RequestedShiftId,

                EffectiveFrom = dto.EffectiveFrom,

                EffectiveTo = dto.EffectiveTo,

                IsPermanent = dto.IsPermanent,

                Reason = dto.Reason,

                Status = "Pending",

                CreatedDate = DateTime.Now

            };

            _context.ShiftChangeRequests.Add(request);

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> ApproveAsync(

            ApproveShiftChangeRequestDto dto)

        {

            var request = await _context.ShiftChangeRequests

                .FindAsync(dto.RequestId);

            if (request == null)

                return false;

            // Don't process an already processed request

            if (request.Status != "Pending")

                return false;

            if (dto.Approve &&

                string.IsNullOrWhiteSpace(dto.ApprovedBy))

            {

                return false;

            }

            request.Status = dto.Approve

                ? "Approved"

                : "Rejected";

            request.ApprovedBy = dto.ApprovedBy;

            request.ApprovedDate = DateTime.Now;

            if (dto.Approve)

            {

                if (request.IsPermanent)

                {

                    var assignment = await _context.EmployeeShiftAssignments

                        .FirstOrDefaultAsync(x =>

                            x.Employee_Id == request.Employee_Id &&

                            x.IsActive);

                    if (assignment == null)

                        return false;

                    assignment.ShiftId = request.RequestedShiftId;

                    assignment.UpdatedDate = DateTime.Now;

                }

                else

                {

                    var date = request.EffectiveFrom.Date;

                    var endDate = request.EffectiveTo?.Date ?? date;

                    while (date <= endDate)

                    {

                        var roster = await _context.ShiftRosters

                            .FirstOrDefaultAsync(x =>

                                x.Employee_Id == request.Employee_Id &&

                                x.RosterDate.Date == date);

                        if (roster != null)

                        {

                            roster.ShiftId = request.RequestedShiftId;

                            roster.UpdatedDate = DateTime.Now;

                        }

                        else

                        {

                            _context.ShiftRosters.Add(new ShiftRoster

                            {

                                Employee_Id = request.Employee_Id,

                                ShiftId = request.RequestedShiftId,

                                RosterDate = date,

                                IsPublished = true,

                                CreatedBy = dto.ApprovedBy,

                                CreatedDate = DateTime.Now

                            });

                        }

                        date = date.AddDays(1);

                    }

                }

            }

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> DeleteAsync(int id)

        {

            var request = await _context.ShiftChangeRequests

                .FindAsync(id);

            if (request == null)

                return false;

            // Don't delete approved request

            if (request.Status == "Approved")

                return false;

            _context.ShiftChangeRequests.Remove(request);

            await _context.SaveChangesAsync();

            return true;

        }

    }

}
