using EmployeeManagementSystem.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
        var bankDetail = new EmployeeBankDetail
        {
            Employee_Id = dto.Employee_Id,
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

        await _context.EmployeeBankDetails.AddAsync(bankDetail);
        await _context.SaveChangesAsync();

        return Ok(bankDetail);
    }

    // ✅ GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _context.EmployeeBankDetails.ToListAsync();
        return Ok(data);
    }

    // ✅ UPDATE using Employee_Id
    [HttpPut("{employeeId}")]
    public async Task<IActionResult> Update(string employeeId, EmployeeBankDetailDto dto)
    {
        var bankDetail = await _context.EmployeeBankDetails
            .FirstOrDefaultAsync(b => b.Employee_Id == employeeId);

        if (bankDetail == null)
            return NotFound("Bank detail not found");

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
            message = "Bank details updated successfully",
            data = bankDetail
        });
    }

    // ✅ DELETE using Employee_Id
    [HttpDelete("{employeeId}")]
    public async Task<IActionResult> Delete(string employeeId)
    {
        var bankDetail = await _context.EmployeeBankDetails
            .FirstOrDefaultAsync(b => b.Employee_Id == employeeId);

        if (bankDetail == null)
            return NotFound("Bank detail not found");

        _context.EmployeeBankDetails.Remove(bankDetail);
        await _context.SaveChangesAsync();

        return Ok("Deleted successfully");
    }
}