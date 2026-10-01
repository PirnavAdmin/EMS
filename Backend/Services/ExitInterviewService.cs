using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ExitInterviewService : IExitInterviewService

    {

        private readonly AppDbContext _context;

        public ExitInterviewService(AppDbContext context)

        {

            _context = context;

        }

        // ============================================================

        // CREATE EXIT INTERVIEW

        // ============================================================

        public async Task<bool> Create(

            CreateExitInterviewDto dto)

        {

            try

            {

                // ----------------------------------------------------

                // 1. Check resignation

                // ----------------------------------------------------

                var resignation =

                    await _context.EmployeeResignations

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

            return await _context.ExitInterviews

                .AsNoTracking()

                .Where(x =>

                    x.ResignationId ==

                    resignationId)

                .Select(x =>

                    new ExitInterviewResponseDto

                    {

                        ExitInterviewId =

                            x.ExitInterviewId,

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

            return await _context.ExitInterviews

                .AsNoTracking()

                .OrderByDescending(x =>

                    x.InterviewDate)

                .Select(x =>

                    new ExitInterviewResponseDto

                    {

                        ExitInterviewId =

                            x.ExitInterviewId,

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

                var interview =

                    await _context.ExitInterviews

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
