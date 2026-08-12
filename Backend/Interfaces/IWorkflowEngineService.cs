using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IWorkflowEngineService
    {
        Task<bool> CreateWorkflow(CreateWorkflowDto dto);

        Task<bool> AddStep(AddWorkflowStepDto dto);

        Task<bool> Approve(WorkflowApprovalDto dto);

        Task<List<WorkflowMaster>> GetAllWorkflows();

        Task<List<WorkflowSteps>> GetSteps(int workflowId);

        Task<List<WorkflowHistory>> GetPendingApprovals(string approverId);

        Task<List<WorkflowHistory>> GetHistory();
    }
}