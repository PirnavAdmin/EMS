using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TaxProofController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TaxProofController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<(bool allowed, string? employeeId)> CanAccessTaxDeclarationItemAsync(int itemId)
        {
            var item = await _context.TaxDeclarationItems
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ItemId == itemId);
            if (item == null)
                return (false, null);

            var declaration = await _context.TaxDeclarations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.TaxDeclarationId == item.TaxDeclarationId);
            if (declaration == null)
                return (false, null);

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            bool inTenant = false;
            if (orgId.HasValue && orgId.Value > 0)
            {
                if (declaration.OrganizationId.HasValue && declaration.OrganizationId.Value == orgId.Value)
                    inTenant = true;
                else
                    inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, declaration.Employee_Id);
            }
            else if (adminIds != null && adminIds.Any())
            {
                inTenant = await _context.Employees
                    .AnyAsync(e => e.Employee_Id == declaration.Employee_Id && e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value));
            }

            if (!inTenant)
                return (false, null);

            var currentEmpId = CurrentUserHelper.GetEmployeeId(User);
            bool isAdmin = await CurrentUserHelper.IsAdminUserAsync(_context, User);
            if (!isAdmin && !string.IsNullOrWhiteSpace(currentEmpId) && !string.Equals(declaration.Employee_Id, currentEmpId, StringComparison.OrdinalIgnoreCase))
            {
                return (false, null);
            }

            return (true, declaration.Employee_Id);
        }

        private async Task<(bool allowed, TaxProof? proof)> CanAccessTaxProofAsync(int proofId, bool requireAdmin = false)
        {
            var proof = await _context.TaxProofs.FirstOrDefaultAsync(p => p.ProofId == proofId);
            if (proof == null)
                return (false, null);

            var (allowed, _) = await CanAccessTaxDeclarationItemAsync(proof.ItemId);
            if (!allowed)
                return (false, null);

            if (requireAdmin)
            {
                bool isAdmin = await CurrentUserHelper.IsAdminUserAsync(_context, User);
                if (!isAdmin)
                    return (false, null);
            }

            return (true, proof);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadProof(
            IFormFile file,
            int itemId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Please select a file.");

            var (allowed, _) = await CanAccessTaxDeclarationItemAsync(itemId);
            if (!allowed)
                return NotFound(new { message = "Tax declaration item not found in your organization." });

            var folder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "uploads",
                "taxproofs");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var savedName = Guid.NewGuid() + Path.GetExtension(file.FileName);
            var fullPath = Path.Combine(folder, savedName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var proof = new TaxProof
            {
                ItemId = itemId,
                FileName = file.FileName,
                FilePath = "/uploads/taxproofs/" + savedName,
                UploadedOn = DateTime.UtcNow,
                Status = "Pending"
            };

            _context.TaxProofs.Add(proof);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Proof Uploaded Successfully",
                ProofId = proof.ProofId
            });
        }

        [HttpGet("{itemId}")]
        public async Task<IActionResult> GetProofs(int itemId)
        {
            var (allowed, _) = await CanAccessTaxDeclarationItemAsync(itemId);
            if (!allowed)
                return NotFound(new { message = "Tax declaration item not found in your organization." });

            var proofs = await _context.TaxProofs
                .Where(x => x.ItemId == itemId)
                .ToListAsync();

            return Ok(proofs);
        }

        [HttpPost("approve/{id}")]
        public async Task<IActionResult> ApproveProof(int id)
        {
            var (allowed, proof) = await CanAccessTaxProofAsync(id, requireAdmin: true);
            if (!allowed || proof == null)
                return NotFound(new { message = "Tax proof not found or unauthorized." });

            proof.Status = "Approved";
            await _context.SaveChangesAsync();

            return Ok("Proof Approved");
        }

        [HttpPost("reject/{id}")]
        public async Task<IActionResult> RejectProof(int id)
        {
            var (allowed, proof) = await CanAccessTaxProofAsync(id, requireAdmin: true);
            if (!allowed || proof == null)
                return NotFound(new { message = "Tax proof not found or unauthorized." });

            proof.Status = "Rejected";
            await _context.SaveChangesAsync();

            return Ok("Proof Rejected");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProof(int id)
        {
            var (allowed, proof) = await CanAccessTaxProofAsync(id, requireAdmin: false);
            if (!allowed || proof == null)
                return NotFound(new { message = "Tax proof not found or unauthorized." });

            var fullPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                proof.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

            if (System.IO.File.Exists(fullPath))
            {
                try
                {
                    System.IO.File.Delete(fullPath);
                }
                catch
                {
                    // Ignore file deletion error if missing
                }
            }

            _context.TaxProofs.Remove(proof);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }

        [HttpGet("view/{id}")]
        public async Task<IActionResult> ViewProof(int id)
        {
            var (allowed, proof) = await CanAccessTaxProofAsync(id, requireAdmin: false);
            if (!allowed || proof == null)
                return NotFound(new { message = "Tax proof not found or unauthorized." });

            var fullPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                proof.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

            if (!System.IO.File.Exists(fullPath))
                return NotFound("File not found.");

            var ext = Path.GetExtension(proof.FileName).ToLowerInvariant();
            var contentType = ext switch
            {
                ".pdf" => "application/pdf",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                _ => "application/octet-stream"
            };

            return PhysicalFile(fullPath, contentType);
        }

        [HttpGet("download/{id}")]
        public async Task<IActionResult> DownloadProof(int id)
        {
            var (allowed, proof) = await CanAccessTaxProofAsync(id, requireAdmin: false);
            if (!allowed || proof == null)
                return NotFound(new { message = "Tax proof not found or unauthorized." });

            var fullPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                proof.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

            if (!System.IO.File.Exists(fullPath))
                return NotFound("File not found.");

            var ext = Path.GetExtension(proof.FileName).ToLowerInvariant();
            var contentType = ext switch
            {
                ".pdf" => "application/pdf",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                _ => "application/octet-stream"
            };

            var bytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return File(bytes, contentType, proof.FileName);
        }
    }
}
