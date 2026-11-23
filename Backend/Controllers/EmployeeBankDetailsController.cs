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


    // ✅ CREATE
    [HttpPost]
    public async Task<IActionResult> Create(EmployeeBankDetailDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Get logged-in user's EmployeeId
        var currentUserId = User.FindFirst("EmployeeId")?.Value
                         ?? User.FindFirst("OnboardingId")?.Value;

        string employeeId;

        // If EmployeeId exists in token, use it.
        // If not, allow the supplied Employee_Id
        // for users such as HR/Admin/Manager.
        if (!string.IsNullOrWhiteSpace(currentUserId))
        {
            employeeId = currentUserId;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(dto.Employee_Id))
                return BadRequest(new
                {
                    message = "Employee Id is required."
                });

            employeeId = dto.Employee_Id;
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
        employeeId = Uri.UnescapeDataString(employeeId).Trim();

        if (string.IsNullOrWhiteSpace(employeeId))
        {
            return BadRequest(new
            {
                message = "Employee Id is required."
            });
        }

        var bankDetail = await _context.EmployeeBankDetails
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (bankDetail == null)
        {
            return NotFound(new
            {
                message = "Bank details not found."
            });
        }

        return Ok(bankDetail);
    }   // ✅ GET ALL
    [HttpGet]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _context.EmployeeBankDetails
            .AsNoTracking()
            .OrderBy(x => x.Employee_Id)
            .ToListAsync();

        return Ok(data);
    }


    [HttpPut("{employeeId}")]
    public async Task<IActionResult> Update(
       string employeeId,
       EmployeeBankDetailDto dto)
    {
        employeeId = Uri.UnescapeDataString(employeeId).Trim();

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(employeeId))
        {
            return BadRequest(new
            {
                message = "Employee Id is required."
            });
        }

        var bankDetail = await _context.EmployeeBankDetails
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (bankDetail == null)
        {
            return NotFound(new
            {
                message = "Bank details not found for this employee."
            });
        }

        // Update bank details
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
    }   // ✅ DELETE using Employee_Id
    [HttpDelete("{employeeId}")]
    public async Task<IActionResult> Delete(string employeeId)
    {
        employeeId = Uri.UnescapeDataString(employeeId).Trim();

        if (string.IsNullOrWhiteSpace(employeeId))
        {
            return BadRequest(new
            {
                message = "Employee Id is required."
            });
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

        _context.EmployeeBankDetails.Remove(bankDetail);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Bank details deleted successfully."
        });
    }
}