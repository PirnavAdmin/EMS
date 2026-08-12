using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShiftPlannerController : ControllerBase
    {
        private readonly IShiftPlannerService _plannerService;

        public ShiftPlannerController(IShiftPlannerService plannerService)
        {
            _plannerService = plannerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _plannerService.GetAllAsync();
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await _plannerService.GetByIdAsync(id);

            if (data == null)
                return NotFound(new
                {
                    Success = false,
                    Message = "Shift Planner not found."
                });

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateShiftPlannerDto dto)
        {
            var result = await _plannerService.CreateAsync(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Shift Planner already exists for selected period."
                });

            return Ok(new
            {
                Success = true,
                Message = "Shift Planner created successfully."
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateShiftPlannerDto dto)
        {
            var result = await _plannerService.UpdateAsync(id, dto);

            if (!result)
                return NotFound(new
                {
                    Success = false,
                    Message = "Shift Planner not found."
                });

            return Ok(new
            {
                Success = true,
                Message = "Shift Planner updated successfully."
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _plannerService.DeleteAsync(id);

            if (!result)
                return NotFound(new
                {
                    Success = false,
                    Message = "Shift Planner not found."
                });

            return Ok(new
            {
                Success = true,
                Message = "Shift Planner deleted successfully."
            });
        }

        [HttpPost("publish/{id}")]
        public async Task<IActionResult> Publish(int id)
        {
            var result = await _plannerService.PublishAsync(id);

            if (!result)
                return NotFound(new
                {
                    Success = false,
                    Message = "Shift Planner not found."
                });

            return Ok(new
            {
                Success = true,
                Message = "Shift Planner published successfully."
            });
        }

        [HttpPost("copy-week")]
        public async Task<IActionResult> CopyWeek(DateTime fromWeekStart, DateTime toWeekStart)
        {
            var result = await _plannerService.CopyWeekAsync(fromWeekStart, toWeekStart);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "No planners found to copy."
                });

            return Ok(new
            {
                Success = true,
                Message = "Week copied successfully."
            });
        }

        [HttpPost("copy-month")]
        public async Task<IActionResult> CopyMonth(
            int sourceMonth,
            int sourceYear,
            int targetMonth,
            int targetYear)
        {
            var result = await _plannerService.CopyMonthAsync(
                sourceMonth,
                sourceYear,
                targetMonth,
                targetYear);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "No planners found to copy."
                });

            return Ok(new
            {
                Success = true,
                Message = "Month copied successfully."
            });
        }
    }
}