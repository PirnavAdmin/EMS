using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    //[Authorize]
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
        //[Permission(ModuleIds.Clients, PermissionAction.Add)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BranchDto dto)
        {
            var branch = new Branch
            {
                BranchName = dto.BranchName,
                Established = dto.Established,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                Branch_Id = dto.Branch_Id
            };

            await _context.Branches.AddAsync(branch);
            await _context.SaveChangesAsync();

            return Ok(branch);
        }

        // ✅ GET ALL BRANCHES
        //[Permission(ModuleIds.Clients, PermissionAction.View)]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var branches = await _context.Branches.ToListAsync();
            return Ok(branches);
        }

        // ✅ UPDATE BRANCH
        //[Permission(ModuleIds.Clients, PermissionAction.Edit)]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] BranchDto dto)
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

        // ✅ DELETE BRANCH
        //[Permission(ModuleIds.Clients, PermissionAction.Delete)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var branch = await _context.Branches.FindAsync(id);

            if (branch == null)
                return NotFound("Branch not found");

            _context.Branches.Remove(branch);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Branch deleted successfully."
            });
        }
    }
}