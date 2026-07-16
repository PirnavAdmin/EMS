using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IAgreementService

    {

        Task<object> UploadAgreement(UploadAgreementDto dto);
        Task<object> GetAllAgreements();
        Task<List<EmployeeAgreementDto>> GetMyAgreements(string employeeId);

        Task<List<AgreementStatusDto>> GetAgreementStatus();

        Task<AgreementMaster?> GetAgreementById(int agreementId);

        Task<string?> GetAgreementFilePath(int agreementId);

        Task<object> SignAgreement(SignAgreementDto dto);

        Task<FileStreamResult?> DownloadAgreement(string employeeId, string agreementCode);
        Task<(byte[] FileBytes, string ContentType, string FileName)?>
     ViewAgreement(int employeeAgreementId);

        Task<string?> DownloadSignedAgreement(int employeeAgreementId);

        Task<string?> ViewSignedAgreement(int employeeAgreementId);

        Task<object> GetPendingAgreements(string employeeId);

        Task<object> GetSignedAgreements(string employeeId);

        Task<object> GetAgreementReport();


    }

}
