using EmployeeManagementSystem.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class JobOpeningsController : ControllerBase
{
    private readonly AppDbContext _context;

    public JobOpeningsController(AppDbContext context)
    {
        _context = context;
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

        job.Department = dto.Department;
        job.Experience = dto.Experience;
        job.Positions = dto.Positions;
        job.Skills = dto.Skills;
        job.Status = dto.Status;

        await _context.SaveChangesAsync();

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

        _context.JobOpenings.Remove(job);
        await _context.SaveChangesAsync();

        return Ok("Job opening deleted successfully");
    }
}