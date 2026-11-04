using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class FileStorageService : IFileStorageService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public FileStorageService(AppDbContext context,
            IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        public async Task<FileStorage> UploadFileAsync(
            IFormFile file,
            int companyId,
            string moduleName,
            string category,
            string uploadedBy)
        {
            var folder = Path.Combine(
                _environment.WebRootPath,
                "uploads",
                moduleName);

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var savedName = Guid.NewGuid() + Path.GetExtension(file.FileName);

            var fullPath = Path.Combine(folder, savedName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var storage = new FileStorage
            {
                Company_Id = companyId,
                ModuleName = moduleName,
                FileCategory = category,
                OriginalFileName = file.FileName,
                SavedFileName = savedName,
                FilePath = $"/uploads/{moduleName}/{savedName}",
                FileExtension = Path.GetExtension(file.FileName),
                FileSize = file.Length,
                MimeType = file.ContentType,
                UploadedBy = uploadedBy,
                UploadedDate = DateTime.Now,
                IsActive = true
            };

            _context.FileStorage.Add(storage);
            await _context.SaveChangesAsync();

            return storage;
        }

        public async Task<FileStorage?> GetFileAsync(int fileId)
        {
            return await _context.FileStorage
                .FirstOrDefaultAsync(x => x.FileId == fileId);
        }

        public async Task<bool> DeleteFileAsync(int fileId)
        {
            var file = await _context.FileStorage
                .FirstOrDefaultAsync(x => x.FileId == fileId);

            if (file == null)
                return false;

            var fullPath = Path.Combine(
                _environment.WebRootPath,
                file.FilePath.TrimStart('/').Replace("/", "\\"));

            if (File.Exists(fullPath))
                File.Delete(fullPath);

            _context.FileStorage.Remove(file);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}