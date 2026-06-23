using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;

[ApiController]
[Route("api/[controller]")]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClientsController(AppDbContext context)
    {
        _context = context;
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var clients = await _context.Clients
            .Select(c => new ClientDto
            {
                Id= c.Id,   
                Client_Name = c.Client_Name,
                Description = c.Description,
                Location = c.Location,
                Phone = c.Phone,
                Email = c.Email,
                Active_Projects = c.Active_Projects
            })
            .ToListAsync();

        return Ok(clients);
    }

    // ✅ GET BY NAME
    [HttpGet("by-name/{clientName}")]
    public async Task<IActionResult> GetByName(string clientName)
    {
        var client = await _context.Clients
            .Where(c => c.Client_Name == clientName)
            .Select(c => new ClientDto
            {
                Id=c.Id,
                Client_Name = c.Client_Name,
                Description = c.Description,

                Location = c.Location,
                Phone = c.Phone,
                Email = c.Email,
                Active_Projects = c.Active_Projects
            })
            .FirstOrDefaultAsync();

        if (client == null)
            return NotFound("Client not found");

        return Ok(client);
    }

    // ✅ POST
    [HttpPost]
    public async Task<IActionResult> Create(ClientDto dto)
    {
        var client = new Client
        {
            Client_Name = dto.Client_Name,
            Description = dto.Description,

            Location = dto.Location,
            Phone = dto.Phone,
            Email = dto.Email,
            Active_Projects = dto.Active_Projects
        };

        await _context.Clients.AddAsync(client);
        await _context.SaveChangesAsync();

        return Ok("The Client details are created");
    }
    [HttpGet("{clientId:int}/projects")]
    public async Task<IActionResult> GetProjectsByClient(int clientId)
    {
        // Check if client exists
        var clientExists = await _context.Clients
            .AnyAsync(c => c.Id == clientId);

        if (!clientExists)
            return NotFound("Client not found");

        // Fetch projects using ClientId
        var projects = await _context.Projects
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
    // ✅ PUT (Using Client_Name)
    [HttpPut("{clientName}")]
    public async Task<IActionResult> Update(string clientName, ClientDto dto)
    {
        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Client_Name == clientName);

        if (client == null)
            return NotFound("Client not found");
        client.Id = dto.Id;
        client.Description = dto.Description;
        client.Location = dto.Location;
        client.Phone = dto.Phone;
        client.Email = dto.Email;
        client.Active_Projects = dto.Active_Projects;

        await _context.SaveChangesAsync();

        return Ok("The Client details are updated");
    }

    // ✅ DELETE
    [HttpDelete("{clientName}")]
    public async Task<IActionResult> Delete(string clientName)
    {
        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Client_Name == clientName);

        if (client == null)
            return NotFound("Client not found");

        _context.Clients.Remove(client);
        await _context.SaveChangesAsync();

        return Ok("Client deleted successfully");
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportClients()
    {
        var clients = await _context.Clients.ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Clients");

        // Headers
        worksheet.Cell(1, 1).Value = "Client Name";
        worksheet.Cell(1, 2).Value = "Description";
        worksheet.Cell(1, 3).Value = "Location";
        worksheet.Cell(1, 4).Value = "Phone";
        worksheet.Cell(1, 5).Value = "Email";
        worksheet.Cell(1, 6).Value = "Active Projects";

        // Header Style
        var headerRange = worksheet.Range(1, 1, 1, 6);
        headerRange.Style.Font.Bold = true;

        // Data
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