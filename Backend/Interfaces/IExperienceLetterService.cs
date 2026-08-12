using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IExperienceLetterService
    {
        Task<object> GenerateExperienceLetterAsync(
            ExperienceLetterRequestDto dto);

        Task<object> GetAllExperienceLettersAsync();

        Task<ExperienceLetterDownloadDto?>
            DownloadExperienceLetterAsync(int id);

        Task<byte[]>
            PreviewExperienceLetterAsync(int id);

        Task SendExperienceLetterAsync(
            SendExperienceLetterDto dto);

        Task<ExperienceLetterSendStatusDto>
            GetSendStatusAsync(int id);

        Task DeleteExperienceLetterAsync(int id);
    }
}