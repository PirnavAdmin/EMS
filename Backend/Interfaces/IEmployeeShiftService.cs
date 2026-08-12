using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IEmployeeShiftService

    {

        Task<string> AssignShiftAsync(AssignShiftDto dto);

        Task<string> BulkAssignShiftAsync(List<AssignShiftDto> dto);

        Task<IEnumerable<EmployeeShiftResponseDto>> GetAllAssignmentsAsync();

        Task<EmployeeShiftResponseDto?> GetEmployeeShiftAsync(string employeeId);

        Task<string> RemoveAssignmentAsync(int assignmentId);

    }

}
