using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class WorkflowEngineService : IWorkflowEngineService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public WorkflowEngineService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private async Task<int?> GetCurrentOrgIdAsync()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);
            return orgId;
        }

        public async Task<bool> CreateWorkflow(CreateWorkflowDto dto)
        {
            var orgId = await GetCurrentOrgIdAsync();
            var targetOrgIdVal = dto.OrganizationId ?? orgId;
            if (!targetOrgIdVal.HasValue || targetOrgIdVal.Value <= 0)
                return false;
            var targetOrgId = targetOrgIdVal.Value;

            bool exists = await _context.WorkflowMasters
                .AnyAsync(x => x.WorkflowName == dto.WorkflowName && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (exists)
                return false;

            WorkflowMaster workflow = new WorkflowMaster
            {
                OrganizationId = targetOrgId,
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
            var orgId = await GetCurrentOrgIdAsync();
            bool workflowExists = await _context.WorkflowMasters
                .AnyAsync(x => x.WorkflowId == dto.WorkflowId && (!orgId.HasValue || x.OrganizationId == orgId.Value));

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
            var orgId = await GetCurrentOrgIdAsync();
            return await _context.WorkflowMasters
                .Where(x => !orgId.HasValue || x.OrganizationId == orgId.Value)
                .OrderBy(x => x.WorkflowName)
                .ToListAsync();
        }

        public async Task<List<WorkflowSteps>> GetSteps(int workflowId)
        {
            var orgId = await GetCurrentOrgIdAsync();
            var workflow = await _context.WorkflowMasters
                .FirstOrDefaultAsync(x => x.WorkflowId == workflowId && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (workflow == null)
                return new List<WorkflowSteps>();

            return await _context.WorkflowSteps
                .Where(x => x.WorkflowId == workflowId)
                .OrderBy(x => x.StepNumber)
                .ToListAsync();
        }

        public async Task<List<WorkflowHistory>> GetPendingApprovals(string approverId)
        {
            var orgId = await GetCurrentOrgIdAsync();
            return await (from wh in _context.WorkflowHistories
                          join wm in _context.WorkflowMasters on wh.WorkflowId equals wm.WorkflowId
                          where wh.Status == "Pending" && (!orgId.HasValue || wm.OrganizationId == orgId.Value)
                          select wh).ToListAsync();
        }

        public async Task<List<WorkflowHistory>> GetHistory()
        {
            var orgId = await GetCurrentOrgIdAsync();
            return await (from wh in _context.WorkflowHistories
                          join wm in _context.WorkflowMasters on wh.WorkflowId equals wm.WorkflowId
                          where !orgId.HasValue || wm.OrganizationId == orgId.Value
                          orderby wh.CreatedDate descending
                          select wh).ToListAsync();
        }
    }
}