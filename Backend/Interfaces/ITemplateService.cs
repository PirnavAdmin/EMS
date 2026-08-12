using EmployeeManagementSystem.Models;

public interface ITemplateService

{

    Task<TemplateMaster?> GetActiveTemplateAsync(int companyId, string moduleCode);

}
