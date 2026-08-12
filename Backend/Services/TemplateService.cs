using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

public class TemplateService : ITemplateService

{

    private readonly AppDbContext _context;

    public TemplateService(AppDbContext context)

    {

        _context = context;

    }

    public async Task<TemplateMaster?> GetActiveTemplateAsync(

    int companyId,

    string moduleCode)

    {

        var module = await _context.TemplateModuleMaster

            .FirstOrDefaultAsync(x =>

                x.ModuleCode == moduleCode &&

                x.IsActive);

        if (module == null)

            return null;

        // First priority: Default template

        var template = await _context.TemplateMaster

            .Where(x =>

                x.Company_Id == companyId &&

                x.ModuleId == module.ModuleId &&

                x.IsActive &&

                x.IsDefault)

            .OrderByDescending(x => x.TemplateId)

            .FirstOrDefaultAsync();

        // Fallback: latest active template

        if (template == null)

        {

            template = await _context.TemplateMaster

                .Where(x =>

                    x.Company_Id == companyId &&

                    x.ModuleId == module.ModuleId &&

                    x.IsActive)

                .OrderByDescending(x => x.TemplateId)

                .FirstOrDefaultAsync();

        }

        return template;

    }

}
