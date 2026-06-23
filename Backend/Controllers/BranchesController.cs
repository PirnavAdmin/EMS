using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EmployeeManagementSystem.Data;

[ApiController]
[Route("api/[controller]")]
public class BranchesController : ControllerBase
{
    private readonly AppDbContext _context;

    public BranchesController(AppDbContext context)
    {
        _context = context;
    }

    // ✅ CREATE BRANCH
    [HttpPost]
    public async Task<IActionResult> Create(BranchDto dto)
    {
        var branch = new Branch
        {
            BranchName = dto.BranchName,
            Established = dto.Established,
            PhoneNumber = dto.PhoneNumber,
            Email = dto.Email,
            
            Branch_Id = dto.Branch_Id,
        };

        await _context.Branches.AddAsync(branch);
        await _context.SaveChangesAsync();

        return Ok(branch);
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var branches = await _context.Branches.ToListAsync();
        return Ok(branches);
    }

    // ✅ UPDATE
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, BranchDto dto)
    {
        var branch = await _context.Branches.FindAsync(id);

        if (branch == null)
            return NotFound("Branch not found");

        branch.BranchName = dto.BranchName;
        branch.Established = dto.Established;
        branch.PhoneNumber = dto.PhoneNumber;
        branch.Email = dto.Email;
        branch.Branch_Id = dto.Branch_Id;
        await _context.SaveChangesAsync();

        return Ok(branch);
    }

    // ✅ DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var branch = await _context.Branches.FindAsync(id);

        if (branch == null)
            return NotFound("Branch not found");

        _context.Branches.Remove(branch);
        await _context.SaveChangesAsync();

        return Ok("Branch deleted successfully");
    }
}