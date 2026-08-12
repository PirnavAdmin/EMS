using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaxProofController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TaxProofController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadProof(
    IFormFile file,
    int itemId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Please select a file.");

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
                UploadedOn = DateTime.Now,
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
            return Ok(await _context.TaxProofs
                .Where(x => x.ItemId == itemId)
                .ToListAsync());
        }

        [HttpPost("approve/{id}")]
        public async Task<IActionResult> ApproveProof(int id)
        {
            var proof = await _context.TaxProofs.FindAsync(id);

            if (proof == null)
                return NotFound();

            proof.Status = "Approved";

            await _context.SaveChangesAsync();

            return Ok("Proof Approved");
        }

        [HttpPost("reject/{id}")]
        public async Task<IActionResult> RejectProof(int id)
        {
            var proof = await _context.TaxProofs.FindAsync(id);

            if (proof == null)
                return NotFound();

            proof.Status = "Rejected";

            await _context.SaveChangesAsync();

            return Ok("Proof Rejected");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProof(int id)
        {
            var proof = await _context.TaxProofs.FindAsync(id);

            if (proof == null)
                return NotFound();

            _context.TaxProofs.Remove(proof);

            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}
