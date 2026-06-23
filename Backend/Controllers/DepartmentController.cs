using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EmployeeManagementSystem.Data;
using ClosedXML.Excel;
using System.IO;

[ApiController]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DepartmentsController(AppDbContext context)
    {
        _context = context;
    }

    // ✅ Create Department
    [HttpPost]
    public async Task<IActionResult> Create(DepartmentDto dto)
    {
        var department = new Department
        {
            DepartmentName = dto.DepartmentName,
            DepartmentHead = dto.DepartmentHead,
            Building = dto.Building,
            Status = dto.Status,
            MembersCount = dto.MembersCount,
            Department_Id= dto.Department_Id,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Departments.AddAsync(department);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Department created successfully"});
    }

    // ✅ Get All
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var departments = await _context.Departments.ToListAsync();
        return Ok(departments);
    }

    // ✅ Get By Id
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var department = await _context.Departments.FindAsync(id);

        if (department == null)
            return NotFound("Department not found");

        return Ok(department);
    }

    // ✅ Update Department
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, DepartmentDto dto)
    {
        var department = await _context.Departments.FindAsync(id);

        if (department == null)
            return NotFound("Department not found");

        department.DepartmentName = dto.DepartmentName;
        department.DepartmentHead = dto.DepartmentHead;
        department.Building = dto.Building;
        department.Status = dto.Status;
        department.Department_Id = dto.Department_Id;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Department updated successfully"});
    }

    // ✅ Delete Department
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var department = await _context.Departments.FindAsync(id);

        if (department == null)
            return NotFound("Department not found");

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();

        return Ok("Department deleted successfully");
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportDepartments()
    {
        var departments = await _context.Departments
            .AsNoTracking()
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Departments");

        worksheet.Cell(1, 1).Value = "Department ID";
        worksheet.Cell(1, 2).Value = "Department Name";
        worksheet.Cell(1, 3).Value = "Department Head";
        worksheet.Cell(1, 4).Value = "Building";
        worksheet.Cell(1, 5).Value = "Status";
        worksheet.Cell(1, 6).Value = "Members Count";
        worksheet.Cell(1, 7).Value = "Created At";

        var header = worksheet.Range(1, 1, 1, 7);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1F2937");
        header.Style.Font.FontColor = XLColor.White;

        int row = 2;

        foreach (var dept in departments)
        {
            worksheet.Cell(row, 1).Value = dept.Department_Id;
            worksheet.Cell(row, 2).Value = dept.DepartmentName;
            worksheet.Cell(row, 3).Value = dept.DepartmentHead;
            worksheet.Cell(row, 4).Value = dept.Building;
            worksheet.Cell(row, 5).Value = dept.Status;
            worksheet.Cell(row, 6).Value = dept.MembersCount;
            worksheet.Cell(row, 7).Value =
    dept.CreatedAt?.ToString("dd-MMM-yyyy") ?? "";

            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Departments_{DateTime.Now:yyyyMMdd}.xlsx"
        );
    }
}
