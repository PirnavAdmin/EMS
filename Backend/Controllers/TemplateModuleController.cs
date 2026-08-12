using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    public class TemplateModuleController : ControllerBase

    {

        private readonly AppDbContext _context;

        public TemplateModuleController(AppDbContext context)

        {

            _context = context;

        }

        // Get All Modules

        [HttpGet]

        public async Task<IActionResult> GetModules()

        {

            var modules = await _context.TemplateModuleMaster

                .OrderBy(x => x.DisplayOrder)

                .ToListAsync();

            return Ok(modules);

        }

        // Get Module By Id

        [HttpGet("{id}")]

        public async Task<IActionResult> GetModule(int id)

        {

            var module = await _context.TemplateModuleMaster.FindAsync(id);

            if (module == null)

                return NotFound();

            return Ok(module);

        }

        // Add Module

        [HttpPost]

        public async Task<IActionResult> AddModule(TemplateModuleMaster model)

        {

            if (await _context.TemplateModuleMaster

                .AnyAsync(x => x.ModuleCode == model.ModuleCode))

            {

                return BadRequest("Module Code already exists.");

            }

            if (await _context.TemplateModuleMaster

                .AnyAsync(x => x.ModuleName == model.ModuleName))

            {

                return BadRequest("Module Name already exists.");

            }

            model.CreatedDate = DateTime.Now;

            _context.TemplateModuleMaster.Add(model);

            await _context.SaveChangesAsync();

            return Ok(model);

        }

        // Update Module

        [HttpPut("{id}")]

        public async Task<IActionResult> UpdateModule(int id, TemplateModuleMaster model)

        {

            var module = await _context.TemplateModuleMaster.FindAsync(id);

            if (module == null)

                return NotFound();

            module.ModuleCode = model.ModuleCode;

            module.ModuleName = model.ModuleName;

            module.Description = model.Description;

            module.IsMergeTemplate = model.IsMergeTemplate;

            module.IsActive = model.IsActive;

            module.DisplayOrder = model.DisplayOrder;

            await _context.SaveChangesAsync();

            return Ok("Updated Successfully");

        }

        // Delete Module

        [HttpDelete("{id}")]

        public async Task<IActionResult> DeleteModule(int id)

        {

            var module = await _context.TemplateModuleMaster.FindAsync(id);

            if (module == null)

                return NotFound();

            bool inUse = await _context.TemplateMaster

                .AnyAsync(x => x.ModuleId == id);

            if (inUse)

                return BadRequest("This module is already used by templates and cannot be deleted.");

            _context.TemplateModuleMaster.Remove(module);

            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");

        }

    }

}
