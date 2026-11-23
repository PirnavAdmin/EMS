using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FooterController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FooterController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetFooter()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            var footer = await _context.FooterSettings
                .FirstOrDefaultAsync(f => orgId.HasValue && f.Company_Id == orgId.Value);

            if (footer == null)
            {
                // Fallback to default if not configured for this org
                footer = await _context.FooterSettings.FirstOrDefaultAsync();
            }

            if (footer == null)
                return NotFound("Footer settings not found.");

            return Ok(footer);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateFooter([FromBody] FooterSettings model)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var targetOrgId = orgId ?? (model.Company_Id > 0 ? model.Company_Id : (int?)null);
            if (!targetOrgId.HasValue || targetOrgId.Value <= 0)
                return BadRequest("Organization context is required.");
            var effectiveTargetOrgId = targetOrgId.Value;

            var footer = await _context.FooterSettings
                .FirstOrDefaultAsync(f => f.Company_Id == effectiveTargetOrgId);

            if (footer == null)
            {
                model.Company_Id = effectiveTargetOrgId;
                model.UpdatedDate = DateTime.Now;
                _context.FooterSettings.Add(model);
            }
            else
            {
                footer.FooterText = model.FooterText;
                footer.FooterLink = model.FooterLink;
                footer.CopyrightText = model.CopyrightText;
                footer.ProductVersion = model.ProductVersion;
                footer.SupportEmail = model.SupportEmail;
                footer.SupportPhone = model.SupportPhone;
                footer.UpdatedDate = DateTime.Now;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Footer settings updated successfully."
            });
        }
    }
}