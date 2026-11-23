using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Helpers;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Http;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ExitInterviewService : IExitInterviewService

    {

        private readonly AppDbContext _context;

        private readonly IHttpContextAccessor _httpContextAccessor;

        public ExitInterviewService(AppDbContext context, IHttpContextAccessor httpContextAccessor)

        {

            _context = context;

            _httpContextAccessor = httpContextAccessor;

        }

        // ============================================================

        // CREATE EXIT INTERVIEW

        // ============================================================

        public async Task<bool> Create(

            CreateExitInterviewDto dto)

        {

            try

            {

                var user = _httpContextAccessor.HttpContext?.User;

                var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

                // ----------------------------------------------------

                // 1. Check resignation

                // ----------------------------------------------------

                var resignationQuery = _context.EmployeeResignations

                    .Include(x => x.Employee)

                    .AsQueryable();

                if (orgId.HasValue && orgId.Value > 0)

                {

                    resignationQuery = resignationQuery.Where(x => x.OrganizationId == orgId.Value);

                }

                else if (adminIds != null && adminIds.Any())

                {

                    resignationQuery = resignationQuery.Where(x => x.Employee != null && x.Employee.AdminId.HasValue && adminIds.Contains(x.Employee.AdminId.Value));

                }

                var resignation =

                    await resignationQuery

                        .FirstOrDefaultAsync(x =>

                            x.ResignationId ==

                            dto.ResignationId);

                if (resignation == null)

                    return false;

                // ----------------------------------------------------

                // 2. Resignation must be Approved

                // ----------------------------------------------------

                if (!string.Equals(

                        resignation.OverallStatus,

                        "Approved",

                        StringComparison.OrdinalIgnoreCase))

                {

                    return false;

                }

                // ----------------------------------------------------

                // 3. Clearance must exist

                // ----------------------------------------------------

                var clearance =

                    await _context.EmployeeClearances

                        .FirstOrDefaultAsync(x =>

                            x.ResignationId ==

                            dto.ResignationId);

                if (clearance == null)

                    return false;

                // ----------------------------------------------------

                // 4. Clearance must be completed

                // ----------------------------------------------------

                if (clearance.CompletedDate == null)

                    return false;

                // ----------------------------------------------------

                // 5. Prevent duplicate Exit Interview

                // ----------------------------------------------------

                bool alreadyExists =

                    await _context.ExitInterviews

                        .AnyAsync(x =>

                            x.ResignationId ==

                            dto.ResignationId);

                if (alreadyExists)

                    return false;

                // ----------------------------------------------------

                // 6. Create Exit Interview

                // ----------------------------------------------------

                var interview =

                    new ExitInterview

                    {

                        OrganizationId = resignation.OrganizationId ?? orgId,

                        ResignationId =

                            dto.ResignationId,

                        ConductedBy =

                            dto.ConductedBy,

                        ReasonForLeaving =

                            dto.ReasonForLeaving,

                        Feedback =

                            dto.Feedback,

                        Suggestions =

                            dto.Suggestions,

                        InterviewDate =

                            dto.InterviewDate

                    };

                _context.ExitInterviews.Add(

                    interview);

                await _context.SaveChangesAsync();

                return true;

            }

            catch (Exception ex)

            {

                Console.WriteLine(

                    $"Create Exit Interview failed: {ex}");

                return false;

            }

        }

        // ============================================================

        // GET EXIT INTERVIEW BY RESIGNATION

        // ============================================================

        public async Task<ExitInterviewResponseDto?>

            GetByResignation(int resignationId)

        {

            var user = _httpContextAccessor.HttpContext?.User;

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var query = _context.ExitInterviews

                .Include(x => x.EmployeeResignation)

                    .ThenInclude(x => x!.Employee)

                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)

            {

                query = query.Where(x => x.OrganizationId == orgId.Value ||

                    (x.EmployeeResignation != null && x.EmployeeResignation.OrganizationId == orgId.Value));

            }

            else if (adminIds != null && adminIds.Any())

            {

                query = query.Where(x => x.EmployeeResignation != null && x.EmployeeResignation.Employee != null && x.EmployeeResignation.Employee.AdminId.HasValue && adminIds.Contains(x.EmployeeResignation.Employee.AdminId.Value));

            }

            return await query

                .Where(x =>

                    x.ResignationId ==

                    resignationId)

                .Select(x =>

                    new ExitInterviewResponseDto

                    {

                        ExitInterviewId =

                            x.ExitInterviewId,

                        OrganizationId =

                            x.OrganizationId,

                        ResignationId =

                            x.ResignationId,

                        ConductedBy =

                            x.ConductedBy,

                        ReasonForLeaving =

                            x.ReasonForLeaving,

                        Feedback =

                            x.Feedback,

                        Suggestions =

                            x.Suggestions,

                        InterviewDate =

                            x.InterviewDate

                    })

                .FirstOrDefaultAsync();

        }

        // ============================================================

        // GET ALL EXIT INTERVIEWS

        // ============================================================

        public async Task<List<ExitInterviewResponseDto>>

            GetAll()

        {

            var user = _httpContextAccessor.HttpContext?.User;

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var query = _context.ExitInterviews

                .Include(x => x.EmployeeResignation)

                    .ThenInclude(x => x!.Employee)

                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)

            {

                query = query.Where(x => x.OrganizationId == orgId.Value ||

                    (x.EmployeeResignation != null && x.EmployeeResignation.OrganizationId == orgId.Value));

            }

            else if (adminIds != null && adminIds.Any())

            {

                query = query.Where(x => x.EmployeeResignation != null && x.EmployeeResignation.Employee != null && x.EmployeeResignation.Employee.AdminId.HasValue && adminIds.Contains(x.EmployeeResignation.Employee.AdminId.Value));

            }

            return await query

                .OrderByDescending(x =>

                    x.InterviewDate)

                .Select(x =>

                    new ExitInterviewResponseDto

                    {

                        ExitInterviewId =

                            x.ExitInterviewId,

                        OrganizationId =

                            x.OrganizationId,

                        ResignationId =

                            x.ResignationId,

                        ConductedBy =

                            x.ConductedBy,

                        ReasonForLeaving =

                            x.ReasonForLeaving,

                        Feedback =

                            x.Feedback,

                        Suggestions =

                            x.Suggestions,

                        InterviewDate =

                            x.InterviewDate

                    })

                .ToListAsync();

        }

        // ============================================================

        // DELETE EXIT INTERVIEW

        // ============================================================

        public async Task<bool> Delete(

            int exitInterviewId)

        {

            try

            {

                var user = _httpContextAccessor.HttpContext?.User;

                var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

                var query = _context.ExitInterviews

                    .Include(x => x.EmployeeResignation)

                        .ThenInclude(x => x!.Employee)

                    .AsQueryable();

                if (orgId.HasValue && orgId.Value > 0)

                {

                    query = query.Where(x => x.OrganizationId == orgId.Value ||

                        (x.EmployeeResignation != null && x.EmployeeResignation.OrganizationId == orgId.Value));

                }

                else if (adminIds != null && adminIds.Any())

                {

                    query = query.Where(x => x.EmployeeResignation != null && x.EmployeeResignation.Employee != null && x.EmployeeResignation.Employee.AdminId.HasValue && adminIds.Contains(x.EmployeeResignation.Employee.AdminId.Value));

                }

                var interview =

                    await query

                        .FirstOrDefaultAsync(x =>

                            x.ExitInterviewId ==

                            exitInterviewId);

                if (interview == null)

                    return false;

                _context.ExitInterviews.Remove(

                    interview);

                await _context.SaveChangesAsync();

                return true;

            }

            catch (Exception ex)

            {

                Console.WriteLine(

                    $"Delete Exit Interview failed: {ex}");

                return false;

            }

        }

    }

}
