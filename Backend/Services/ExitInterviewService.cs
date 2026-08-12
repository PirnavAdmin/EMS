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

        public async Task<bool> Create(CreateExitInterviewDto dto)
        {
            var resignation = await _context.EmployeeResignations
                .FirstOrDefaultAsync(x => x.ResignationId == dto.ResignationId);

            if (resignation == null)
                return false;

            // Only HR approved resignations
            if (resignation.HRStatus != "Approved")
                return false;

            // Clearance must be completed
            var clearance = await _context.EmployeeClearances
                .FirstOrDefaultAsync(x => x.ResignationId == dto.ResignationId);

            if (clearance == null || clearance.CompletedDate == null)
                return false;

            bool exists = await _context.ExitInterviews
                .AnyAsync(x => x.ResignationId == dto.ResignationId);

            if (exists)
                return false;

            ExitInterview interview = new ExitInterview
            {
                ResignationId = dto.ResignationId,
                ConductedBy = dto.ConductedBy,
                ReasonForLeaving = dto.ReasonForLeaving,
                Feedback = dto.Feedback,
                Suggestions = dto.Suggestions,
                InterviewDate = dto.InterviewDate
            };

            _context.ExitInterviews.Add(interview);

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<ExitInterviewResponseDto?> GetByResignation(int resignationId)
        {
            return await _context.ExitInterviews
                .Where(x => x.ResignationId == resignationId)
                .Select(x => new ExitInterviewResponseDto
                {
                    ExitInterviewId = x.ExitInterviewId,
                    ResignationId = x.ResignationId,
                    ConductedBy = x.ConductedBy,
                    ReasonForLeaving = x.ReasonForLeaving,
                    Feedback = x.Feedback,
                    Suggestions = x.Suggestions,
                    InterviewDate = x.InterviewDate
                })
                .FirstOrDefaultAsync();
        }

        public async Task<List<ExitInterviewResponseDto>> GetAll()
        {
            return await _context.ExitInterviews
                .OrderByDescending(x => x.InterviewDate)
                .Select(x => new ExitInterviewResponseDto
                {
                    ExitInterviewId = x.ExitInterviewId,
                    ResignationId = x.ResignationId,
                    ConductedBy = x.ConductedBy,
                    ReasonForLeaving = x.ReasonForLeaving,
                    Feedback = x.Feedback,
                    Suggestions = x.Suggestions,
                    InterviewDate = x.InterviewDate
                })
                .ToListAsync();
        }

        public async Task<bool> Delete(int exitInterviewId)
        {
            var interview = await _context.ExitInterviews
                .FirstOrDefaultAsync(x => x.ExitInterviewId == exitInterviewId);

            if (interview == null)
                return false;

            _context.ExitInterviews.Remove(interview);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}