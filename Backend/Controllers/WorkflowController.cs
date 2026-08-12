using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WorkflowController : ControllerBase
    {
        private readonly IWorkflowEngineService _workflowService;

        public WorkflowController(IWorkflowEngineService workflowService)
        {
            _workflowService = workflowService;
        }

        // Create Workflow
        [HttpPost("create")]
        public async Task<IActionResult> CreateWorkflow(CreateWorkflowDto dto)
        {
            var result = await _workflowService.CreateWorkflow(dto);

            if (!result)
                return BadRequest("Workflow already exists.");

            return Ok("Workflow created successfully.");
        }

        // Add Workflow Step
        [HttpPost("add-step")]
        public async Task<IActionResult> AddStep(AddWorkflowStepDto dto)
        {
            var result = await _workflowService.AddStep(dto);

            if (!result)
                return BadRequest("Workflow not found.");

            return Ok("Workflow step added successfully.");
        }

        // Get All Workflows
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _workflowService.GetAllWorkflows();
            return Ok(data);
        }

        // Get Steps
        [HttpGet("{workflowId}/steps")]
        public async Task<IActionResult> GetSteps(int workflowId)
        {
            var data = await _workflowService.GetSteps(workflowId);
            return Ok(data);
        }

        // Pending Approvals
        [HttpGet("pending/{approverId}")]
        public async Task<IActionResult> Pending(string approverId)
        {
            var data = await _workflowService.GetPendingApprovals(approverId);
            return Ok(data);
        }

        // Workflow History
        [HttpGet("history")]
        public async Task<IActionResult> History()
        {
            var data = await _workflowService.GetHistory();
            return Ok(data);
        }

        // Approve / Reject
        [HttpPost("approve")]
        public async Task<IActionResult> Approve(WorkflowApprovalDto dto)
        {
            var result = await _workflowService.Approve(dto);

            if (!result)
                return BadRequest("Approval failed.");

            return Ok("Workflow updated successfully.");
        }
    }
}