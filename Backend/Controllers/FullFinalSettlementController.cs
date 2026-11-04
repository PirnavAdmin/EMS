using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    [Authorize]

    public class FullFinalSettlementController

        : ControllerBase

    {

        private readonly IFullFinalSettlementService _service;

        public FullFinalSettlementController(

            IFullFinalSettlementService service)

        {

            _service = service;

        }

        // =========================================================

        // GENERATE SETTLEMENT

        // =========================================================

        [HttpPost("generate")]

        public async Task<IActionResult> Generate(

            [FromBody] GenerateSettlementDto dto)

        {

            if (!ModelState.IsValid)

            {

                return BadRequest(ModelState);

            }

            var result =

                await _service.GenerateSettlement(dto);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to generate settlement. " +

                        "Make sure the employee has an approved " +

                        "resignation, completed clearance, and " +

                        "completed exit interview."

                });

            }

            return Ok(new

            {

                success = true,

                message =

                    "Full & Final Settlement generated successfully."

            });

        }

        // =========================================================

        // APPROVE / REJECT

        // =========================================================

        [HttpPut("approve")]

        public async Task<IActionResult> Approve(

            [FromBody] ApproveSettlementDto dto)

        {

            if (!ModelState.IsValid)

            {

                return BadRequest(ModelState);

            }

            var result =

                await _service.ApproveSettlement(dto);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to process settlement. " +

                        "It may already have been processed."

                });

            }

            return Ok(new

            {

                success = true,

                message =

                    dto.IsApproved

                        ? "Settlement approved successfully."

                        : "Settlement rejected successfully."

            });

        }

        // =========================================================

        // GET ALL

        // =========================================================

        [HttpGet]

        public async Task<IActionResult> GetAll()

        {

            var data =

                await _service.GetAll();

            return Ok(data);

        }

        // =========================================================

        // GET EMPLOYEE SETTLEMENT

        // =========================================================

        [HttpGet("{employeeId}")]

        public async Task<IActionResult> Get(

            string employeeId)

        {

            var data =

                await _service.GetEmployeeSettlement(

                    employeeId);

            if (data == null)

            {

                return NotFound(new

                {

                    success = false,

                    message =

                        "Settlement not found."

                });

            }

            return Ok(data);

        }

        // =========================================================

        // DELETE

        // =========================================================

        [HttpDelete("{settlementId}")]

        public async Task<IActionResult> Delete(

            int settlementId)

        {

            var result =

                await _service.DeleteSettlement(

                    settlementId);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to delete settlement. " +

                        "Approved settlements cannot be deleted."

                });

            }

            return Ok(new

            {

                success = true,

                message =

                    "Settlement deleted successfully."

            });

        }

        // =========================================================

        // DOWNLOAD PDF

        // =========================================================

        [HttpGet("{settlementId}/pdf")]

        public async Task<IActionResult> DownloadPdf(

            int settlementId)

        {

            var pdf =

                await _service.GenerateSettlementPdf(

                    settlementId);

            if (pdf == null)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Settlement PDF cannot be generated. " +

                        "Make sure the settlement exists and is approved."

                });

            }

            return File(

                pdf,

                "application/pdf",

                $"FullFinalSettlement_{settlementId}.pdf");

        }

    }

}
