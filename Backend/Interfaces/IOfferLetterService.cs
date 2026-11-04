using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IOfferLetterService
    {
        Task<OfferLetterResponseDto> GenerateAsync(OfferLetterRequestDto dto);

        Task SendOfferLetterAsync(SendOfferLetterDto dto);
        Task<byte[]> PreviewOfferLetter(int id);
        Task DeleteOfferLetterAsync(int id);
        Task<OfferLetterSendStatusDto> GetSendStatusAsync(int id);



    }
}