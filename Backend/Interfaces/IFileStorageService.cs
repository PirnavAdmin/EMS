using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IFileStorageService
    {
        Task<FileStorage> UploadFileAsync(
            IFormFile file,
            int companyId,
            string moduleName,
            string category,
            string uploadedBy);

        Task<FileStorage?> GetFileAsync(int fileId);

        Task<bool> DeleteFileAsync(int fileId);
    }
}