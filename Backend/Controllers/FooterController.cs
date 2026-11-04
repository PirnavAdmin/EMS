using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;

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
        public IActionResult GetFooter()
        {
            var footer = _context.FooterSettings.FirstOrDefault();

            if (footer == null)
                return NotFound("Footer settings not found.");

            return Ok(footer);
        }

        [HttpPut]
        public IActionResult UpdateFooter([FromBody] FooterSettings model)
        {
            var footer = _context.FooterSettings.FirstOrDefault();

            if (footer == null)
            {
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

            _context.SaveChanges();

            return Ok(new
            {
                Message = "Footer settings updated successfully."
            });
        }
    }
}