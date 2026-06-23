using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

public interface IEmployeeDocumentService
{
    Task<string> UploadDocument(EmployeeDocumentDto dto);

    Task<List<EmployeeDocumentResponseDto>> GetEmployeeDocuments(string employeeId);

    Task<byte[]> DownloadDocument(int id);

    Task<string> GetDocumentPath(int id);

    Task<string> DeleteDocument(int id);

    Task<string> VerifyDocument(int id, string remarks);

    Task<string> RejectDocument(int id, string remarks);
    Task<EmployeeDocument?> GetDocumentById(int id);

    Task<int> GetPendingDocumentsCount();

    Task<List<EmployeeDocumentChecklistDto>>
    GetChecklist(string employeeId);
}