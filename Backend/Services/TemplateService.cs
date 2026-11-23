using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

public class TemplateService : ITemplateService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public TemplateService(AppDbContext context, IHttpContextAccessor? httpContextAccessor = null)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<TemplateMaster?> GetActiveTemplateAsync(int companyId, string moduleCode)
    {
        var targetCodes = GetModuleCodeAliases(moduleCode);

        var module = await _context.TemplateModuleMaster
            .FirstOrDefaultAsync(x => targetCodes.Contains(x.ModuleCode) && x.IsActive);

        if (module == null)
            return null;

        // First priority: Default template for this organization
        var template = await _context.TemplateMaster
            .Where(x =>
                (x.OrganizationId == companyId || x.Company_Id == companyId) &&
                x.ModuleId == module.ModuleId &&
                x.IsActive &&
                x.IsDefault)
            .OrderByDescending(x => x.TemplateId)
            .FirstOrDefaultAsync();

        // Fallback: latest active template for this organization
        if (template == null)
        {
            template = await _context.TemplateMaster
                .Where(x =>
                    (x.OrganizationId == companyId || x.Company_Id == companyId) &&
                    x.ModuleId == module.ModuleId &&
                    x.IsActive)
                .OrderByDescending(x => x.TemplateId)
                .FirstOrDefaultAsync();
        }

        // Global fallback: any active default template for this module
        if (template == null)
        {
            template = await _context.TemplateMaster
                .Where(x =>
                    x.ModuleId == module.ModuleId &&
                    x.IsActive &&
                    x.IsDefault)
                .OrderByDescending(x => x.TemplateId)
                .FirstOrDefaultAsync();
        }

        return template;
    }

    public async Task<TemplateMaster?> GetActiveTemplateAsync(string moduleCode)
    {
        var targetCodes = GetModuleCodeAliases(moduleCode);

        var user = _httpContextAccessor?.HttpContext?.User;
        var (orgId, _) = user != null
            ? await CurrentUserHelper.GetTenantContextAsync(_context, user)
            : (null, new List<int>());

        if (orgId.HasValue && orgId.Value > 0)
        {
            var orgTemplate = await GetActiveTemplateAsync(orgId.Value, moduleCode);
            if (orgTemplate != null)
                return orgTemplate;
        }

        var module = await _context.TemplateModuleMaster
            .FirstOrDefaultAsync(x => targetCodes.Contains(x.ModuleCode) && x.IsActive);

        if (module == null)
            return null;

        // First priority: Default template
        var template = await _context.TemplateMaster
            .Where(x =>
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
                    x.ModuleId == module.ModuleId &&
                    x.IsActive)
                .OrderByDescending(x => x.TemplateId)
                .FirstOrDefaultAsync();
        }

        return template;
    }

    private static List<string> GetModuleCodeAliases(string moduleCode)
    {
        var list = new List<string> { moduleCode };
        if (string.Equals(moduleCode, "PAYSLIP", StringComparison.OrdinalIgnoreCase))
        {
            list.Add("PS");
        }
        else if (string.Equals(moduleCode, "PS", StringComparison.OrdinalIgnoreCase))
        {
            list.Add("PAYSLIP");
        }
        else if (string.Equals(moduleCode, "OFFER", StringComparison.OrdinalIgnoreCase))
        {
            list.Add("OL101");
        }
        else if (string.Equals(moduleCode, "OL101", StringComparison.OrdinalIgnoreCase))
        {
            list.Add("OFFER");
        }
        return list;
    }
}
