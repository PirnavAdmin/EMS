using ClosedXML.Excel;
using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenXmlPowerTools;

//[Authorize]
[ApiController]

[Route("api/[controller]")]

public class ProjectsController : ControllerBase

{

    private readonly AppDbContext _context;

    public ProjectsController(AppDbContext context)

    {

        _context = context;

    }

    // ========================= GET ALL =========================

    private async Task<string> GenerateProjectCode(string projectName)
    {
        if (string.IsNullOrWhiteSpace(projectName))
            throw new Exception("Project Name is required.");

        // Generate initials
        var words = projectName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);

        string prefix;

        if (words.Length == 1)
        {
            prefix = words[0].Length >= 3
                ? words[0].Substring(0, 3).ToUpper()
                : words[0].ToUpper();
        }
        else
        {
            prefix = string.Concat(words.Select(w => char.ToUpper(w[0])));
        }

        // Find existing project codes with the same prefix
        var existingCodes = await _context.Projects
            .Where(p => p.ProjectCode.StartsWith(prefix))
            .Select(p => p.ProjectCode)
            .ToListAsync();

        if (!existingCodes.Any())
            return $"{prefix}";

        int maxNumber = existingCodes
            .Select(code =>
            {
                var numberPart = code.Substring(prefix.Length);
                return int.TryParse(numberPart, out int num) ? num : 0;
            })
            .Max();

        return $"{prefix}{(maxNumber + 1):D3}";
    }

    //[Permission(ModuleIds.Projects, PermissionAction.View)]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var today = DateTime.Today;

        // Get today's attendance once
        var todayAttendance = await _context.Attendance
            .Where(a => a.Attendance_Date.Date == today.Date)
            .ToDictionaryAsync(a => a.Employee_Id);

        // Get all projects
        var projects = await _context.Projects
            .Include(p => p.Client)
            .AsNoTracking()
            .ToListAsync();

        var result = new List<ProjectDto>();

        foreach (var p in projects)
        {
            var projectMembers = await _context.ProjectTeamMembers
                .Where(pt => pt.ProjectId == p.Id)
                .Include(pt => pt.Employee)
                .ToListAsync();

            var memberDtos = projectMembers.Select(pt =>
            {
                todayAttendance.TryGetValue(pt.EmployeeId, out var attendance);

                bool isActive = attendance != null &&
                                attendance.Check_In != null &&
                                attendance.Check_Out == null;

                return new ProjectMemberDto
                {
                    Employee_Id = pt.EmployeeId,
                    Name = pt.Employee.Name,
                    Technology = pt.Technology,

                    // Add these properties to ProjectMemberDto
                    IsActive = isActive,
                    AttendanceStatus = isActive ? "Active" : "Inactive"
                };
            }).ToList();

            result.Add(new ProjectDto
            {
                Id = p.Id,
                Project_Name = p.Project_Name,
                Project_Id = p.Project_Id,
                ClientId = p.ClientId,
                Client = p.Client != null
                    ? p.Client.Client_Name
                    : null,

                Start_Date = p.Start_Date,
                End_Date = p.End_Date,

                // Existing property
                Team_Members = p.Team_Members,

                // New member list with attendance status
                ProjectMembers = memberDtos,

                Status = p.Status
            });
        }

        return Ok(result);
    }
    // ========================= GET BY ID =========================
    //[Permission(ModuleIds.Projects, PermissionAction.View)]
    [HttpGet("{projectId}")]
    public async Task<IActionResult> GetByProjectId(string projectId)
    {
        var project = await _context.Projects
            .Include(p => p.Client)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Project_Id == projectId);

        if (project == null)
            return NotFound("Project not found");

        var projectMembers = await _context.ProjectTeamMembers
            .Where(pt => pt.ProjectId == project.Id)
            .Include(pt => pt.Employee)
            .Select(pt => new ProjectMemberDto
            {
                Employee_Id = pt.EmployeeId,
                Name = pt.Employee.Name,
                Technology = pt.Technology
            })
            .ToListAsync();

        var result = new ProjectDto
        {
            Id = project.Id,
            Project_Name = project.Project_Name,
            Project_Id = project.Project_Id,
            ClientId = project.ClientId,
            Client = project.Client?.Client_Name,

            Start_Date = project.Start_Date,
            End_Date = project.End_Date,

            Team_Members = project.Team_Members, // Keep temporarily

            ProjectMembers = projectMembers,

            Status = project.Status
        };

        return Ok(result);
    }
    // ========================= CREATE =========================
    //[Permission(ModuleIds.Projects, PermissionAction.Add)]
    [HttpPost]
    public async Task<IActionResult> Create(ProjectDto dto)
    {
        var projectCode = await GenerateProjectCode(dto.Project_Name);

        var project = new Project
        {
            Project_Name = dto.Project_Name,
            Project_Id = dto.Project_Id,
            ProjectCode = projectCode,   // Auto Generated

            ClientId = dto.ClientId,
            Start_Date = dto.Start_Date,
            End_Date = dto.End_Date,

            Team_Members = string.IsNullOrWhiteSpace(dto.Team_Members)
                ? null
                : dto.Team_Members,

            Status = dto.Status
        };

        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        if (dto.TeamMemberTechnologies != null && dto.TeamMemberTechnologies.Any())
        {
            foreach (var member in dto.TeamMemberTechnologies)
            {
                await _context.ProjectTeamMembers.AddAsync(new ProjectTeamMember
                {
                    ProjectId = project.Id,
                    EmployeeId = member.EmployeeId,
                    Technology = member.Technology
                });
            }

            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            Message = "New Project created successfully",
            ProjectCode = project.ProjectCode
        });
    }  // ========================= UPDATE =========================

    //[Permission(ModuleIds.Projects, PermissionAction.Edit)]
    [HttpPut("{projectId}")]
    public async Task<IActionResult> Update(string projectId, ProjectDto dto)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Project_Id == projectId);

        if (project == null)
            return NotFound("Project not found");

        // Update project details
        project.Project_Name = dto.Project_Name;
        project.Project_Id = dto.Project_Id;
        project.ClientId = dto.ClientId;
        project.Start_Date = dto.Start_Date;
        project.End_Date = dto.End_Date;
        project.Status = dto.Status;

        project.Team_Members = string.IsNullOrWhiteSpace(dto.Team_Members)
            ? null
            : dto.Team_Members;

        // Remove old team members
        var existingMembers = await _context.ProjectTeamMembers
            .Where(x => x.ProjectId == project.Id)
            .ToListAsync();

        _context.ProjectTeamMembers.RemoveRange(existingMembers);

        // Insert new team members
        if (dto.TeamMemberTechnologies != null &&
            dto.TeamMemberTechnologies.Any())
        {
            foreach (var member in dto.TeamMemberTechnologies)
            {
                _context.ProjectTeamMembers.Add(new ProjectTeamMember
                {
                    ProjectId = project.Id,
                    EmployeeId = member.EmployeeId,
                    Technology = member.Technology
                });
            }
        }

        await _context.SaveChangesAsync();

        return Ok("Project updated successfully.");
    }
    // ========================= DELETE =========================
    //[Permission(ModuleIds.Projects, PermissionAction.Delete)]
    [HttpDelete("{projectId}")]
    public async Task<IActionResult> Delete(string projectId)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Project_Id == projectId);

        if (project == null)
            return NotFound("Project not found");

        bool hasTeams = await _context.Teams
            .AnyAsync(t => t.ProjectId == project.Id);

        if (hasTeams)
            return BadRequest("Cannot delete this project because teams are assigned.");

        bool hasTickets = await _context.Tickets
            .AnyAsync(t => t.ProjectId == project.Id);

        if (hasTickets)
            return BadRequest("Cannot delete this project because tickets exist.");

        var members = await _context.ProjectTeamMembers
            .Where(x => x.ProjectId == project.Id)
            .ToListAsync();

        _context.ProjectTeamMembers.RemoveRange(members);

        _context.Projects.Remove(project);

        await _context.SaveChangesAsync();

        return Ok("Project deleted successfully.");
    }   // ========================= EXPORT =========================

    //[Permission(ModuleIds.Projects, PermissionAction.View)]
    [HttpGet("export")]

    public async Task<IActionResult> ExportProjects()

    {

        var projects = await _context.Projects

            .Include(p => p.Client)

            .AsNoTracking()

            .ToListAsync();

        using var workbook = new XLWorkbook();

        var worksheet = workbook.Worksheets.Add("Projects");

        int maxEmployees = projects

            .Select(p => string.IsNullOrWhiteSpace(p.Team_Members)

                ? 0

                : p.Team_Members

                    .Split(',', StringSplitOptions.RemoveEmptyEntries)

                    .Length)

            .DefaultIfEmpty(0)

            .Max();

        worksheet.Cell(1, 1).Value = "Project ID";

        worksheet.Cell(1, 2).Value = "Project Name";

        worksheet.Cell(1, 3).Value = "Client";

        worksheet.Cell(1, 4).Value = "Start Date";

        worksheet.Cell(1, 5).Value = "End Date";

        worksheet.Cell(1, 6).Value = "Status";

        for (int i = 0; i < maxEmployees; i++)

        {

            worksheet.Cell(1, 7 + i).Value =

                $"Employee {i + 1}";

        }

        var header = worksheet.Range(

            1,

            1,

            1,

            6 + maxEmployees

        );

        header.Style.Font.Bold = true;

        header.Style.Fill.BackgroundColor =

            XLColor.FromHtml("#1F2937");

        header.Style.Font.FontColor =

            XLColor.White;

        int row = 2;

        foreach (var project in projects)

        {

            worksheet.Cell(row, 1).Value =

                project.Project_Id;

            worksheet.Cell(row, 2).Value =

                project.Project_Name;

            worksheet.Cell(row, 3).Value =

                project.Client?.Client_Name ?? "";

            worksheet.Cell(row, 4).Value =

                project.Start_Date.HasValue

                    ? project.Start_Date.Value

                        .ToString("dd-MMM-yyyy")

                    : "";

            worksheet.Cell(row, 5).Value =

                project.End_Date.HasValue

                    ? project.End_Date.Value

                        .ToString("dd-MMM-yyyy")

                    : "";

            worksheet.Cell(row, 6).Value =

                project.Status;

            var employeeIds =

                string.IsNullOrWhiteSpace(project.Team_Members)

                    ? new List<string>()

                    : project.Team_Members

                        .Split(',', StringSplitOptions.RemoveEmptyEntries)

                        .Select(x => x.Trim())

                        .ToList();

            var employeeNames =

                await _context.Employees

                    .Where(e => employeeIds.Contains(e.Employee_Id))

                    .Select(e =>

                        $"{e.Employee_Id} - {e.Name}")

                    .ToListAsync();

            for (int i = 0; i < employeeNames.Count; i++)

            {

                worksheet.Cell(row, 7 + i).Value =

                    employeeNames[i];

            }

            row++;

        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();

        workbook.SaveAs(stream);

        return File(

            stream.ToArray(),

            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

            $"Projects_{DateTime.Now:yyyyMMdd}.xlsx"

        );

    }

}



// ========================= EMPLOYEE DTO =========================


