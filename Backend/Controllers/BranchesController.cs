using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - Branches controller with complete Audit Logging
    //[Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class BranchesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service

        public BranchesController(
            AppDbContext context,
            IAuditLogService auditLogService) // varsha
        {
            _context = context;
            _auditLogService = auditLogService; // varsha
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

            // varsha - Audit branch creation
            await _auditLogService.LogCreateAsync(
                module: "Branches",
                entityName: "Branch",
                entityId: branch.Branch_Id ?? branch.Id.ToString(),
                description: $"Created branch '{branch.BranchName}'",
                newValues: dto,
                user: User);

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

            // varsha - Capture branch state before mutation
            var oldValues = new
            {
                branch.BranchName,
                branch.Established,
                branch.PhoneNumber,
                branch.Email,
                branch.Branch_Id
            };

            branch.BranchName = dto.BranchName;
            branch.Established = dto.Established;
            branch.PhoneNumber = dto.PhoneNumber;
            branch.Email = dto.Email;
            branch.Branch_Id = dto.Branch_Id;

            await _context.SaveChangesAsync();

            // varsha - Audit branch update with full old and new values delta
            await _auditLogService.LogUpdateAsync(
                module: "Branches",
                entityName: "Branch",
                entityId: branch.Branch_Id ?? branch.Id.ToString(),
                description: $"Updated branch '{branch.BranchName}'",
                oldValues: oldValues,
                newValues: dto,
                user: User);

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

            // varsha - Capture branch state before deletion
            var oldValues = new
            {
                branch.Id,
                branch.BranchName,
                branch.Established,
                branch.PhoneNumber,
                branch.Email,
                branch.Branch_Id
            };

            _context.Branches.Remove(branch);
            await _context.SaveChangesAsync();

            // varsha - Audit branch deletion
            await _auditLogService.LogDeleteAsync(
                module: "Branches",
                entityName: "Branch",
                entityId: branch.Branch_Id ?? branch.Id.ToString(),
                description: $"Deleted branch '{branch.BranchName}'",
                oldValues: oldValues,
                user: User);

            return Ok(new
            {
                Message = "Branch deleted successfully."
            });
        }
    }
}