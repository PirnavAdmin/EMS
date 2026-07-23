using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IRelievingLetterService
    {
        Task<object> GenerateRelievingLetterAsync(RelievingLetterRequestDto dto);

        Task<RelievingLetterDownloadDto?> DownloadRelievingLetterAsync(int id);
        Task<byte[]> PreviewRelievingLetterAsync(int id);
        Task<object> GetAllRelievingLettersAsync();
        Task SendRelievingLetterAsync(SendRelievingLetterDto dto);
        Task<RelievingLetterSendStatusDto> GetSendStatusAsync(int id);
        Task DeleteRelievingLetterAsync(int id);
    }
}