using EmployeeManagementSystem.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
public class EmployeeBankDetailsController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeeBankDetailsController(AppDbContext context)
    {
        _context = context;
    }
    private async Task<bool> IsAdminUser()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        if (string.IsNullOrWhiteSpace(email))
            return false;

        return await _context.Admins
            .AnyAsync(a => a.Email == email);
    }

    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create(EmployeeBankDetailDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        bool isAdmin = await IsAdminUser();

        string employeeId;

        if (isAdmin)
        {
            if (string.IsNullOrWhiteSpace(dto.Employee_Id))
                return BadRequest("Employee Id is required.");

            employeeId = dto.Employee_Id;
        }
        else
        {
            employeeId = User.FindFirst("EmployeeId")?.Value
                        ?? User.FindFirst("OnboardingId")?.Value;

            if (string.IsNullOrWhiteSpace(employeeId))
                return Unauthorized("Invalid user.");

            dto.Employee_Id = employeeId;
        }

        var exists = await _context.EmployeeBankDetails
            .AnyAsync(x => x.Employee_Id == employeeId);

        if (exists)
        {
            return BadRequest(new
            {
                message = $"Bank details already exist for {employeeId}."
            });
        }

        var bankDetail = new EmployeeBankDetail
        {
            Employee_Id = employeeId,
            Customer_Id = dto.Customer_Id,
            Bank_Name = dto.Bank_Name,
            Account_Holder_Name = dto.Account_Holder_Name,
            Account_Number = dto.Account_Number,
            IFSC_Code = dto.IFSC_Code,
            Branch_Name = dto.Branch_Name,
            UAN_Number = dto.UAN_Number,
            PF_Account_Number = dto.PF_Account_Number,
            CreatedAt = DateTime.UtcNow
        };

        _context.EmployeeBankDetails.Add(bankDetail);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Bank details created successfully."
        });
    }
    [HttpGet("{employeeId}")]
    public async Task<IActionResult> GetByEmployeeId(string employeeId)
    {
        bool isAdmin = await IsAdminUser();

        if (!isAdmin)
        {
            var currentId = User.FindFirst("EmployeeId")?.Value
                         ?? User.FindFirst("OnboardingId")?.Value;

            if (currentId != employeeId)
                return Forbid("You can view only your own bank details.");
        }

        var bankDetail = await _context.EmployeeBankDetails
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (bankDetail == null)
        {
            return NotFound(new
            {
                message = "Bank details not found."
            });
        }

        return Ok(bankDetail);
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        bool isAdmin = await IsAdminUser();

        if (!isAdmin)
            return Forbid("Only administrators can view all bank details.");

        var data = await _context.EmployeeBankDetails
            .OrderBy(x => x.Employee_Id)
            .ToListAsync();

        return Ok(data);
    }


    [HttpPut("{employeeId}")]
    public async Task<IActionResult> Update(string employeeId, EmployeeBankDetailDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        bool isAdmin = await IsAdminUser();

        if (!isAdmin)
        {
            var currentId = User.FindFirst("EmployeeId")?.Value
                         ?? User.FindFirst("OnboardingId")?.Value;

            if (string.IsNullOrWhiteSpace(currentId))
                return Unauthorized("Invalid user.");

            if (!string.Equals(currentId, employeeId, StringComparison.OrdinalIgnoreCase))
            {
                return Forbid("You can edit only your own bank details.");
            }
        }

        var bankDetail = await _context.EmployeeBankDetails
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (bankDetail == null)
        {
            return NotFound(new
            {
                message = "Bank details not found."
            });
        }

        bankDetail.Customer_Id = dto.Customer_Id;
        bankDetail.Bank_Name = dto.Bank_Name;
        bankDetail.Account_Holder_Name = dto.Account_Holder_Name;
        bankDetail.Account_Number = dto.Account_Number;
        bankDetail.IFSC_Code = dto.IFSC_Code;
        bankDetail.Branch_Name = dto.Branch_Name;
        bankDetail.UAN_Number = dto.UAN_Number;
        bankDetail.PF_Account_Number = dto.PF_Account_Number;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Bank details updated successfully.",
            data = bankDetail
        });
    }
    // ✅ DELETE using Employee_Id
    [HttpDelete("{employeeId}")]
    public async Task<IActionResult> Delete(string employeeId)
    {
        bool isAdmin = await IsAdminUser();

        if (!isAdmin)
            return Forbid("Only administrators can delete bank details.");

        var bankDetail = await _context.EmployeeBankDetails
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (bankDetail == null)
        {
            return NotFound(new
            {
                message = "Bank details not found."
            });
        }

        _context.EmployeeBankDetails.Remove(bankDetail);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Bank details deleted successfully."
        });
    }
}