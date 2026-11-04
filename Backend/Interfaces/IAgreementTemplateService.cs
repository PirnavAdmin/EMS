using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IAgreementTemplateService

    {

        Task<string> GenerateAgreementAsync(

            AgreementMaster agreement,

            EmployeeAgreement employeeAgreement,

            Employee employee,

            EmployeePersonalInfo personalInfo);

        Task<string> ConvertAgreementToPdfAsync(string docxPath);

    }

}
