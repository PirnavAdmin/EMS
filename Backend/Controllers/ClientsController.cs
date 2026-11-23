using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClientsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCurrentOrgId()
    {
        var orgId = CurrentUserHelper.GetOrganizationId(User);
        if (!orgId.HasValue || orgId.Value <= 0)
        {
            throw new UnauthorizedAccessException("OrganizationId not found in token.");
        }
        return orgId.Value;
    }

    // ✅ 1. GET ALL CLIENTS
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        int orgId = GetCurrentOrgId();

        var clients = await _context.Clients
            .AsNoTracking()
            .Where(c => c.OrganizationId == orgId) // 🔥 Isolated
            .Select(c => new ClientDto
            {
                Id = c.Id,
                Client_Name = c.Client_Name,
                Description = c.Description,
                Location = c.Location,
                Phone = c.Phone,
                Email = c.Email,
                Active_Projects = c.Active_Projects,
                OrganizationId = c.OrganizationId
            })
            .ToListAsync();

        return Ok(clients);
    }

    // ✅ 2. GET BY NAME
    [HttpGet("by-name/{clientName}")]
    public async Task<IActionResult> GetByName(string clientName)
    {
        int orgId = GetCurrentOrgId();

        var client = await _context.Clients
            .AsNoTracking()
            .Where(c => c.Client_Name == clientName && c.OrganizationId == orgId) // 🔥 Ownership check
            .Select(c => new ClientDto
            {
                Id = c.Id,
                Client_Name = c.Client_Name,
                Description = c.Description,
                Location = c.Location,
                Phone = c.Phone,
                Email = c.Email,
                Active_Projects = c.Active_Projects,
                OrganizationId = c.OrganizationId
            })
            .FirstOrDefaultAsync();

        if (client == null)
            return NotFound("Client not found");

        return Ok(client);
    }

    // ✅ 3. CREATE CLIENT
    [HttpPost]
    public async Task<IActionResult> Create(ClientDto dto)
    {
        int orgId = GetCurrentOrgId();

        var client = new Client
        {
            OrganizationId = orgId, // 🔥 Scoped to current org
            Client_Name = dto.Client_Name,
            Description = dto.Description,
            Location = dto.Location,
            Phone = dto.Phone,
            Email = dto.Email,
            Active_Projects = dto.Active_Projects,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Clients.AddAsync(client);
        await _context.SaveChangesAsync();

        return Ok(new { message = "The Client details are created", id = client.Id });
    }

    // ✅ 4. GET PROJECTS BY CLIENT
    [HttpGet("{clientId:int}/projects")]
    public async Task<IActionResult> GetProjectsByClient(int clientId)
    {
        int orgId = GetCurrentOrgId();

        // Ensure client belongs to caller's organization
        var clientExists = await _context.Clients
            .AnyAsync(c => c.Id == clientId && c.OrganizationId == orgId); // 🔥 Ownership check

        if (!clientExists)
            return NotFound("Client not found");

        var projects = await _context.Projects
            .AsNoTracking()
            .Where(p => p.ClientId == clientId)
            .Select(p => new
            {
                p.Project_Id,
                p.Project_Name,
                p.Status,
                p.Start_Date,
                p.End_Date
            })
            .ToListAsync();

        return Ok(projects);
    }

    // ✅ 5. UPDATE CLIENT
    [HttpPut("{clientName}")]
    public async Task<IActionResult> Update(string clientName, ClientDto dto)
    {
        int orgId = GetCurrentOrgId();

        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Client_Name == clientName && c.OrganizationId == orgId); // 🔥 Ownership check

        if (client == null)
            return NotFound("Client not found");

        client.Description = dto.Description;
        client.Location = dto.Location;
        client.Phone = dto.Phone;
        client.Email = dto.Email;
        client.Active_Projects = dto.Active_Projects;

        await _context.SaveChangesAsync();

        return Ok(new { message = "The Client details are updated" });
    }

    // ✅ 6. DELETE CLIENT
    [HttpDelete("{clientName}")]
    public async Task<IActionResult> Delete(string clientName)
    {
        int orgId = GetCurrentOrgId();

        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Client_Name == clientName && c.OrganizationId == orgId); // 🔥 Ownership check

        if (client == null)
            return NotFound("Client not found");

        _context.Clients.Remove(client);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Client deleted successfully" });
    }

    // ✅ 7. EXPORT CLIENTS
    [HttpGet("export")]
    public async Task<IActionResult> ExportClients()
    {
        int orgId = GetCurrentOrgId();

        var clients = await _context.Clients
            .AsNoTracking()
            .Where(c => c.OrganizationId == orgId) // 🔥 Isolated
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Clients");

        worksheet.Cell(1, 1).Value = "Client Name";
        worksheet.Cell(1, 2).Value = "Description";
        worksheet.Cell(1, 3).Value = "Location";
        worksheet.Cell(1, 4).Value = "Phone";
        worksheet.Cell(1, 5).Value = "Email";
        worksheet.Cell(1, 6).Value = "Active Projects";

        var headerRange = worksheet.Range(1, 1, 1, 6);
        headerRange.Style.Font.Bold = true;

        int row = 2;
        foreach (var client in clients)
        {
            worksheet.Cell(row, 1).Value = client.Client_Name;
            worksheet.Cell(row, 2).Value = client.Description;
            worksheet.Cell(row, 3).Value = client.Location;
            worksheet.Cell(row, 4).Value = client.Phone;
            worksheet.Cell(row, 5).Value = client.Email;
            worksheet.Cell(row, 6).Value = client.Active_Projects;
            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Clients_{DateTime.Now:yyyyMMddHHmmss}.xlsx"
        );
    }
}
