using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    [Authorize]

    public class ExitInterviewController : ControllerBase

    {

        private readonly IExitInterviewService _service;

        public ExitInterviewController(

            IExitInterviewService service)

        {

            _service = service;

        }

        // ============================================================

        // CREATE EXIT INTERVIEW

        // ============================================================

        [HttpPost]

        public async Task<IActionResult> Create(

            [FromBody] CreateExitInterviewDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            var result =

                await _service.Create(dto);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to create exit interview. " +

                        "Resignation must be approved, " +

                        "clearance must be completed, " +

                        "and an exit interview must not already exist."

                });

            }

            return Ok(new

            {

                success = true,

                message =

                    "Exit interview saved successfully."

            });

        }

        // ============================================================

        // GET BY RESIGNATION

        // ============================================================

        [HttpGet("resignation/{resignationId}")]

        public async Task<IActionResult> GetByResignation(

            int resignationId)

        {

            var data =

                await _service.GetByResignation(

                    resignationId);

            if (data == null)

            {

                return NotFound(new

                {

                    success = false,

                    message =

                        "Exit interview not found."

                });

            }

            return Ok(data);

        }

        // ============================================================

        // GET ALL

        // ============================================================

        [HttpGet]

        public async Task<IActionResult> GetAll()

        {

            var data =

                await _service.GetAll();

            return Ok(data);

        }

        // ============================================================

        // DELETE

        // ============================================================

        [HttpDelete("{exitInterviewId}")]

        public async Task<IActionResult> Delete(

            int exitInterviewId)

        {

            var result =

                await _service.Delete(

                    exitInterviewId);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to delete exit interview."

                });

            }

            return Ok(new

            {

                success = true,

                message =

                    "Exit interview deleted successfully."

            });

        }

    }

}
