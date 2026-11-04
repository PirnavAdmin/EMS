using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class WorkflowEngineService : IWorkflowEngineService
    {
        private readonly AppDbContext _context;

        public WorkflowEngineService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateWorkflow(CreateWorkflowDto dto)
        {
            bool exists = await _context.WorkflowMasters
                .AnyAsync(x => x.WorkflowName == dto.WorkflowName);

            if (exists)
                return false;

            WorkflowMaster workflow = new WorkflowMaster
            {
                WorkflowName = dto.WorkflowName,
                ModuleName = dto.ModuleName,
                IsActive = dto.IsActive
            };

            _context.WorkflowMasters.Add(workflow);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> AddStep(AddWorkflowStepDto dto)
        {
            bool workflowExists = await _context.WorkflowMasters
                .AnyAsync(x => x.WorkflowId == dto.WorkflowId);

            if (!workflowExists)
                return false;

            WorkflowSteps step = new WorkflowSteps
            {
                WorkflowId = dto.WorkflowId,
                StepNumber = dto.StepNumber,
                RoleName = dto.RoleName,
                IsFinalStep = dto.IsFinalStep
            };

            _context.WorkflowSteps.Add(step);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> Approve(WorkflowApprovalDto dto)
        {
            var history = await _context.WorkflowHistories
                .FirstOrDefaultAsync(x => x.HistoryId == dto.HistoryId);

            if (history == null)
                return false;

            history.Status = dto.IsApproved ? "Approved" : "Rejected";
            history.ApprovedBy = dto.ApprovedBy;
            history.Remarks = dto.Remarks;
            history.ActionDate = DateTime.Now;

            if (dto.IsApproved)
            {
                var nextStep = await _context.WorkflowSteps
                    .Where(x => x.WorkflowId == history.WorkflowId &&
                                x.StepNumber > history.StepNumber)
                    .OrderBy(x => x.StepNumber)
                    .FirstOrDefaultAsync();

                if (nextStep != null)
                {
                    WorkflowHistory nextHistory = new WorkflowHistory
                    {
                        WorkflowId = history.WorkflowId,
                        StepNumber = nextStep.StepNumber,
                        RoleName = nextStep.RoleName,
                        Status = "Pending",
                        CreatedDate = DateTime.Now
                    };

                    _context.WorkflowHistories.Add(nextHistory);
                }
            }

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<List<WorkflowMaster>> GetAllWorkflows()
        {
            return await _context.WorkflowMasters
                .OrderBy(x => x.WorkflowName)
                .ToListAsync();
        }

        public async Task<List<WorkflowSteps>> GetSteps(int workflowId)
        {
            return await _context.WorkflowSteps
                .Where(x => x.WorkflowId == workflowId)
                .OrderBy(x => x.StepNumber)
                .ToListAsync();
        }

        public async Task<List<WorkflowHistory>> GetPendingApprovals(string approverId)
        {
            return await _context.WorkflowHistories
                .Where(x => x.Status == "Pending")
                .ToListAsync();
        }

        public async Task<List<WorkflowHistory>> GetHistory()
        {
            return await _context.WorkflowHistories
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();
        }
    }
}