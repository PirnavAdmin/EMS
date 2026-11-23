using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - JobOpenings controller with complete Audit Logging
    [ApiController]
    [Route("api/[controller]")]
    public class JobOpeningsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service

        public JobOpeningsController(
            AppDbContext context,
            IAuditLogService auditLogService) // varsha
        {
            _context = context;
            _auditLogService = auditLogService; // varsha
        }

        // ✅ GET All
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var jobs = await _context.JobOpenings
                .Select(j => new JobOpeningDto
                {
                    Job_Title = j.Job_Title,
                    Department = j.Department,
                    Experience = j.Experience,
                    Positions = j.Positions,
                    Skills = j.Skills,
                    Status = j.Status
                })
                .ToListAsync();

            return Ok(jobs);
        }

        // ✅ POST
        [HttpPost]
        public async Task<IActionResult> Create(JobOpeningDto dto)
        {
            var job = new JobOpening
            {
                Job_Title = dto.Job_Title,
                Department = dto.Department,
                Experience = dto.Experience,
                Positions = dto.Positions,
                Skills = dto.Skills,
                Status = dto.Status
            };

            await _context.JobOpenings.AddAsync(job);
            await _context.SaveChangesAsync();

            // varsha - Audit job opening creation
            await _auditLogService.LogCreateAsync(
                module: "JobOpenings",
                entityName: "JobOpening",
                entityId: job.Job_Title,
                description: $"Created job opening '{job.Job_Title}' in {job.Department}",
                newValues: dto,
                user: User);

            return Ok("The new job post is added succesfully");
        }

        // ✅ PUT (Using Job Title for update)
        [HttpPut("{jobTitle}")]
        public async Task<IActionResult> Update(string jobTitle, JobOpeningDto dto)
        {
            var job = await _context.JobOpenings
                .FirstOrDefaultAsync(j => j.Job_Title == jobTitle);

            if (job == null)
                return NotFound("Job opening not found");

            // varsha - Capture existing job opening state before update
            var oldValues = new
            {
                job.Job_Title,
                job.Department,
                job.Experience,
                job.Positions,
                job.Skills,
                job.Status
            };

            job.Department = dto.Department;
            job.Experience = dto.Experience;
            job.Positions = dto.Positions;
            job.Skills = dto.Skills;
            job.Status = dto.Status;

            await _context.SaveChangesAsync();

            // varsha - Audit job opening update with delta
            await _auditLogService.LogUpdateAsync(
                module: "JobOpenings",
                entityName: "JobOpening",
                entityId: job.Job_Title,
                description: $"Updated job opening '{job.Job_Title}'",
                oldValues: oldValues,
                newValues: dto,
                user: User);

            return Ok("The Job Post is updated");
        }

        // ✅ DELETE (Using Job Title)
        [HttpDelete("{jobTitle}")]
        public async Task<IActionResult> Delete(string jobTitle)
        {
            var job = await _context.JobOpenings
                .FirstOrDefaultAsync(j => j.Job_Title == jobTitle);

            if (job == null)
                return NotFound("Job opening not found");

            // varsha - Capture existing job opening state before deletion
            var oldValues = new
            {
                job.Job_Title,
                job.Department,
                job.Experience,
                job.Positions,
                job.Skills,
                job.Status
            };

            _context.JobOpenings.Remove(job);
            await _context.SaveChangesAsync();

            // varsha - Audit job opening deletion
            await _auditLogService.LogDeleteAsync(
                module: "JobOpenings",
                entityName: "JobOpening",
                entityId: job.Job_Title,
                description: $"Deleted job opening '{job.Job_Title}'",
                oldValues: oldValues,
                user: User);

            return Ok("Job opening deleted successfully");
        }
    }
}