using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

    [HttpGet]

    public async Task<IActionResult> GetAll()

    {

        var projects = await _context.Projects

            .Include(p => p.Client)

            .AsNoTracking()

            .ToListAsync();

        var employeeMap = await _context.Employees

            .AsNoTracking()

            .ToDictionaryAsync(

                e => e.Employee_Id,

                e => e.Name

            );

        var result = projects.Select(p =>

        {

            var employeeIds = string.IsNullOrWhiteSpace(p.Team_Members)

                ? new List<string>()

                : p.Team_Members

                    .Split(',', StringSplitOptions.RemoveEmptyEntries)

                    .Select(x => x.Trim())

                    .Distinct()

                    .ToList();

            var projectMembers = employeeIds

                .Select(id => new ProjectMemberDto

                {

                    Employee_Id = id,

                    Name = employeeMap.ContainsKey(id)

                        ? employeeMap[id]

                        : id

                })

                .ToList();

            return new ProjectDto

            {

                Project_Name = p.Project_Name,

                Project_Id = p.Project_Id,

                ClientId = p.ClientId,

                Client = p.Client != null

                    ? p.Client.Client_Name

                    : null,

                Start_Date = p.Start_Date,

                End_Date = p.End_Date,

                // IMPORTANT

                Team_Members = p.Team_Members,

                ProjectMembers = projectMembers,

                Status = p.Status

            };

        });

        return Ok(result);

    }

    // ========================= GET BY ID =========================

    [HttpGet("{projectId}")]

    public async Task<IActionResult> GetByProjectId(string projectId)

    {

        var project = await _context.Projects

            .Include(p => p.Client)

            .AsNoTracking()

            .FirstOrDefaultAsync(p => p.Project_Id == projectId);

        if (project == null)

            return NotFound("Project not found");

        var employeeIds = string.IsNullOrWhiteSpace(project.Team_Members)

            ? new List<string>()

            : project.Team_Members

                .Split(',', StringSplitOptions.RemoveEmptyEntries)

                .Select(x => x.Trim())

                .Distinct()

                .ToList();

        var projectMembers = await _context.Employees

            .Where(e => employeeIds.Contains(e.Employee_Id))

            .Select(e => new ProjectMemberDto
            {

                Employee_Id = e.Employee_Id,

                Name = e.Name

            })

            .ToListAsync();

        var result = new ProjectDto

        {

            Project_Name = project.Project_Name,

            Project_Id = project.Project_Id,

            ClientId = project.ClientId,

            Client = project.Client != null

                ? project.Client.Client_Name

                : null,

            Start_Date = project.Start_Date,

            End_Date = project.End_Date,

            Team_Members = project.Team_Members,

            ProjectMembers = projectMembers,

            Status = project.Status

        };

        return Ok(result);

    }

    // ========================= CREATE =========================

    [HttpPost]

    public async Task<IActionResult> Create(ProjectDto dto)

    {

        var project = new Project

        {

            Project_Name = dto.Project_Name,

            Project_Id = dto.Project_Id,

            ClientId = dto.ClientId,

            Start_Date = dto.Start_Date,

            End_Date = dto.End_Date,

            // IMPORTANT

            Team_Members =
    string.IsNullOrWhiteSpace(dto.Team_Members)
        ? null
        : dto.Team_Members,

            Status = dto.Status

        };

        await _context.Projects.AddAsync(project);

        await _context.SaveChangesAsync();

        return Ok("New Project created successfully");

    }

    // ========================= UPDATE =========================

    [HttpPut("{projectId}")]

    public async Task<IActionResult> Update(string projectId, ProjectDto dto)

    {

        var project = await _context.Projects

            .FirstOrDefaultAsync(p => p.Project_Id == projectId);

        if (project == null)

            return NotFound("Project not found");

        project.Project_Name = dto.Project_Name;

        project.Project_Id = dto.Project_Id;

        project.ClientId = dto.ClientId;

        project.Start_Date = dto.Start_Date;

        project.End_Date = dto.End_Date;

        // IMPORTANT

        project.Team_Members =
     string.IsNullOrWhiteSpace(dto.Team_Members)
         ? null
         : dto.Team_Members;

        project.Status = dto.Status;

        await _context.SaveChangesAsync();

        return Ok("Updated project successfully");

    }

    // ========================= DELETE =========================

    [HttpDelete("{projectId}")]

    public async Task<IActionResult> Delete(string projectId)

    {

        var project = await _context.Projects

            .FirstOrDefaultAsync(p => p.Project_Id == projectId);

        if (project == null)

            return NotFound("Project not found");

        _context.Projects.Remove(project);

        await _context.SaveChangesAsync();

        return Ok("Project deleted successfully");

    }

    // ========================= EXPORT =========================

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


