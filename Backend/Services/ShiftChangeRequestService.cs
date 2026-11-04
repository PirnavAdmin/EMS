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

        public async Task<IEnumerable<ShiftChangeRequest>> GetAllAsync(string? employeeId = null, string? status = null)
        {
            var today = DateTime.Today;
            // 1. Auto-expire any past pending requests (non-permanent)
            var expiredRequests = await _context.ShiftChangeRequests
                .Where(x => x.Status.StartsWith("Pending") && !x.IsPermanent && (x.EffectiveTo ?? x.EffectiveFrom) < today)
                .ToListAsync();
            if (expiredRequests.Any())
            {
                foreach (var req in expiredRequests)
                {
                    req.Status = "Expired";
                }
                await _context.SaveChangesAsync();
            }
            var query = _context.ShiftChangeRequests.AsQueryable();

            if (!string.IsNullOrWhiteSpace(employeeId))
            {
                query = query.Where(x => x.Employee_Id == employeeId);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var s = status.Trim().ToLower();
                if (s == "pending")
                {
                    query = query.Where(x => x.Status.ToLower().StartsWith("pending"));
                }
                else if (s == "approved" || s == "accepted")
                {
                    query = query.Where(x => x.Status.ToLower().StartsWith("approved") || x.Status.ToLower().StartsWith("accepted"));
                }
                else if (s == "rejected")
                {
                    query = query.Where(x => x.Status.ToLower().StartsWith("rejected"));
                }
                else
                {
                    query = query.Where(x => x.Status.ToLower() == s || x.Status.ToLower().Contains(s));
                }
            }

            return await query
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();
        }

        public async Task<ShiftChangeRequest?> GetByIdAsync(int id)
        {
            return await _context.ShiftChangeRequests.FindAsync(id);
        }

        public async Task<bool> CreateAsync(CreateShiftChangeRequestDto dto)
        {
            var result = await CreateDetailedAsync(dto);
            return result.Success;
        }

        public async Task<(bool Success, string Message)> CreateDetailedAsync(CreateShiftChangeRequestDto dto)
        {
            if (dto == null) return (false, "Request payload cannot be empty.");

            var empId = dto.Employee_Id?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(empId))
                empId = dto.EmployeeId?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(empId))
                return (false, "Employee ID is required.");

            var employeeExists = await _context.Employees.AnyAsync(x => x.Employee_Id == empId);
            if (!employeeExists)
                return (false, $"Employee with ID '{empId}' does not exist.");

            // Resolve requested shift
            int requestedShiftId = dto.RequestedShiftId;
            if (requestedShiftId <= 0)
                return (false, "Please select a valid target shift.");

            var requestedShiftExists = await _context.ShiftMasters.AnyAsync(x => x.ShiftId == requestedShiftId && x.IsActive);
            if (!requestedShiftExists)
                return (false, $"Active shift with ID {requestedShiftId} was not found.");

            // Resolve Effective Dates
            var effectiveFrom = dto.EffectiveFrom != default ? dto.EffectiveFrom.Date : DateTime.Today;
            DateTime? effectiveTo = dto.EffectiveTo?.Date;

            // DATE VALIDATION: Must be today or future date
            var today = DateTime.Today;
            if (effectiveFrom < today)
            {
                return (false, $"Effective from date cannot be in the past ({effectiveFrom:yyyy-MM-dd}). Please select today ({today:yyyy-MM-dd}) or a future date.");
            }

            if (effectiveTo.HasValue && effectiveTo.Value < effectiveFrom)
            {
                return (false, $"Effective to date ({effectiveTo:yyyy-MM-dd}) cannot be earlier than effective from date ({effectiveFrom:yyyy-MM-dd}).");
            }

            // Resolve current shift if not supplied or invalid
            int currentShiftId = dto.CurrentShiftId;
            if (currentShiftId <= 0)
            {
                var roster = await _context.ShiftRosters
                    .FirstOrDefaultAsync(x => x.Employee_Id == empId && x.RosterDate.Date == effectiveFrom);
                if (roster != null)
                {
                    currentShiftId = roster.ShiftId;
                }
                else
                {
                    var assignment = await _context.EmployeeShiftAssignments
                        .FirstOrDefaultAsync(x => x.Employee_Id == empId && x.IsActive);
                    if (assignment != null)
                    {
                        currentShiftId = assignment.ShiftId;
                    }
                    else
                    {
                        var member = await _context.TeamMembers
                            .Include(m => m.Team)
                            .FirstOrDefaultAsync(m => m.EmployeeId == empId);
                        if (member?.Team?.ShiftId.HasValue == true)
                        {
                            currentShiftId = member.Team.ShiftId.Value;
                        }
                        else
                        {
                            var defaultShift = await _context.ShiftMasters.FirstOrDefaultAsync(s => s.IsActive);
                            currentShiftId = defaultShift?.ShiftId ?? requestedShiftId;
                        }
                    }
                }
            }

            // Auto-expire any past pending requests for this employee first (non-permanent)
            var pastPending = await _context.ShiftChangeRequests
                .Where(x => x.Employee_Id == empId && x.Status.StartsWith("Pending") && !x.IsPermanent && (x.EffectiveTo ?? x.EffectiveFrom) < today)
                .ToListAsync();
            if (pastPending.Any())
            {
                foreach (var p in pastPending)
                {
                    p.Status = "Expired";
                }
                await _context.SaveChangesAsync();
            }
            // Only block if an active FUTURE or TODAY pending request exists
            var exists = await _context.ShiftChangeRequests.AnyAsync(x =>
                x.Employee_Id == empId &&
                x.Status.StartsWith("Pending") &&
                (x.IsPermanent || (x.EffectiveTo ?? x.EffectiveFrom) >= today));
            if (exists)
                return (false, $"A pending shift change request already exists for employee '{empId}'.");

            var request = new ShiftChangeRequest
            {
                Employee_Id = empId,
                CurrentShiftId = currentShiftId,
                RequestedShiftId = requestedShiftId,
                EffectiveFrom = effectiveFrom,
                EffectiveTo = effectiveTo,
                IsPermanent = dto.IsPermanent,
                Reason = dto.Reason,
                Status = "Pending",
                CreatedDate = DateTime.Now
            };

            _context.ShiftChangeRequests.Add(request);

            // Notify Admin Dashboard
            var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == empId);
            var reqShift = await _context.ShiftMasters.AsNoTracking().FirstOrDefaultAsync(x => x.ShiftId == requestedShiftId);
            var dateStr = dto.IsPermanent
                ? $"effective from {effectiveFrom:dd MMM yyyy} (Permanent)"
                : $"from {effectiveFrom:dd MMM yyyy} to {(effectiveTo?.ToString("dd MMM yyyy") ?? effectiveFrom.ToString("dd MMM yyyy"))}";

            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = "Shift Change Request",
                Message = $"{emp?.Name ?? empId} ({empId}) requested a shift change to {reqShift?.ShiftName ?? reqShift?.ShiftCode ?? requestedShiftId.ToString()} {dateStr}. Reason: {dto.Reason ?? "Not specified"}",
                UserRole = "Employee",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                OrganizationId = emp?.OrganizationId
            });

            await _context.SaveChangesAsync();
            return (true, "Shift change request submitted successfully.");
        }

        public async Task<bool> ApproveAsync(int id, string? approvedBy = null)
        {
            var request = await _context.ShiftChangeRequests.FindAsync(id);
            if (request == null || request.Status.StartsWith("Approved") || request.Status.StartsWith("Accepted") || request.Status.StartsWith("Rejected") || request.Status == "Expired")
                return false;
            // Check if the requested date has already passed (for non-permanent requests)
            if (!request.IsPermanent && (request.EffectiveTo ?? request.EffectiveFrom) < DateTime.Today)
            {
                request.Status = "Expired";
                await _context.SaveChangesAsync();
                return false;
            }

            string approverRole = "Admin";
            if (!string.IsNullOrWhiteSpace(approvedBy))
            {
                if (approvedBy.IndexOf("Manager", StringComparison.OrdinalIgnoreCase) >= 0)
                    approverRole = "Manager";
                else if (approvedBy.IndexOf("Admin", StringComparison.OrdinalIgnoreCase) >= 0)
                    approverRole = "Admin";
                else
                    approverRole = approvedBy;
            }

            request.Status = $"Approved by {approverRole}";
            request.ApprovedBy = approvedBy ?? approverRole;
            request.ApprovedDate = DateTime.Now;

            if (request.IsPermanent)
            {
                var assignment = await _context.EmployeeShiftAssignments
                    .FirstOrDefaultAsync(x => x.Employee_Id == request.Employee_Id && x.IsActive);

                if (assignment != null)
                {
                    assignment.ShiftId = request.RequestedShiftId;
                    assignment.UpdatedDate = DateTime.Now;
                }
                else
                {
                    _context.EmployeeShiftAssignments.Add(new EmployeeShiftAssignment
                    {
                        Employee_Id = request.Employee_Id,
                        ShiftId = request.RequestedShiftId,
                        EffectiveFrom = request.EffectiveFrom,
                        IsActive = true,
                        CreatedDate = DateTime.Now
                    });
                }
            }
            else
            {
                var date = request.EffectiveFrom.Date;
                var endDate = request.EffectiveTo?.Date ?? date;

                while (date <= endDate)
                {
                    var roster = await _context.ShiftRosters
                        .FirstOrDefaultAsync(x => x.Employee_Id == request.Employee_Id && x.RosterDate.Date == date);

                    if (roster != null)
                    {
                        roster.ShiftId = request.RequestedShiftId;
                        roster.UpdatedDate = DateTime.Now;
                        roster.UpdatedBy = request.ApprovedBy;
                    }
                    else
                    {
                        _context.ShiftRosters.Add(new ShiftRoster
                        {
                            Employee_Id = request.Employee_Id,
                            ShiftId = request.RequestedShiftId,
                            RosterDate = date,
                            Remarks = "Approved Shift Change",
                            IsPublished = true,
                            CreatedBy = request.ApprovedBy,
                            CreatedDate = DateTime.Now
                        });
                    }

                    date = date.AddDays(1);
                }
            }

            // Sync TeamMemberOverride if employee is in a team
            var teamMember = await _context.TeamMembers.FirstOrDefaultAsync(tm => tm.EmployeeId == request.Employee_Id);
            if (teamMember != null)
            {
                var tmo = await _context.TeamMemberOverrides.FirstOrDefaultAsync(o => o.TeamMemberId == teamMember.Id);
                if (tmo != null)
                {
                    tmo.OverrideShiftId = request.RequestedShiftId;
                    tmo.CustomShift = true;
                }
                else
                {
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = teamMember.Id,
                        OverrideShiftId = request.RequestedShiftId,
                        CustomShift = true
                    });
                }
            }

            var reqShift = await _context.ShiftMasters.AsNoTracking().FirstOrDefaultAsync(x => x.ShiftId == request.RequestedShiftId);

            // Notify Employee
            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = request.Employee_Id,
                Title = "Shift Change Approved",
                Message = $"Your shift change request to {reqShift?.ShiftName ?? request.RequestedShiftId.ToString()} has been {request.Status}.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectAsync(int id, string? remarks = null, string? rejectedBy = null)
        {
            var request = await _context.ShiftChangeRequests.FindAsync(id);
            if (request == null || request.Status.StartsWith("Approved") || request.Status.StartsWith("Accepted"))
                return false;

            string rejecterRole = "Admin";
            if (!string.IsNullOrWhiteSpace(rejectedBy))
            {
                if (rejectedBy.IndexOf("Manager", StringComparison.OrdinalIgnoreCase) >= 0)
                    rejecterRole = "Manager";
                else if (rejectedBy.IndexOf("Admin", StringComparison.OrdinalIgnoreCase) >= 0)
                    rejecterRole = "Admin";
                else
                    rejecterRole = rejectedBy;
            }

            request.Status = $"Rejected by {rejecterRole}";
            request.ApprovedBy = rejectedBy ?? rejecterRole;
            request.ApprovedDate = DateTime.Now;

            if (!string.IsNullOrWhiteSpace(remarks))
            {
                request.Reason = string.IsNullOrWhiteSpace(request.Reason)
                    ? $"Rejected by {rejecterRole}: {remarks}"
                    : $"{request.Reason} | Rejected by {rejecterRole}: {remarks}";
            }

            // Notify Employee
            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = request.Employee_Id,
                Title = "Shift Change Rejected",
                Message = $"Your shift change request has been {request.Status}." + (!string.IsNullOrWhiteSpace(remarks) ? $" Remarks: {remarks}" : ""),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var request = await _context.ShiftChangeRequests.FindAsync(id);
            if (request == null || request.Status.StartsWith("Approved") || request.Status.StartsWith("Accepted"))
                return false;

            _context.ShiftChangeRequests.Remove(request);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

