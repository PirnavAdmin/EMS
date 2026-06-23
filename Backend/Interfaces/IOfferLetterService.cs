using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IOfferLetterService
    {
        Task<OfferLetterResponseDto> GenerateAsync(OfferLetterRequestDto dto);
    }
}