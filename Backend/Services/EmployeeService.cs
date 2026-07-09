using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IAdminNotificationService _adminNotificationService;
        private readonly IUserNotificationService _notificationService;

        public EmployeeService(
      AppDbContext context,
      IUserNotificationService notificationService,
      IAdminNotificationService adminNotificationService,
      IEmailService emailService)
        {
            _context = context;
            _notificationService = notificationService;
            _adminNotificationService = adminNotificationService;
            _emailService = emailService; // 👈 IMPORTANT
        }

        // ✅ ADD EMPLOYEE
        public async Task<object> AddEmployee(EmployeeDto dto)
        {
            // 1. Check duplicate
            var exists = await _context.Employees
                .AnyAsync(e => e.Employee_Id == dto.Employee_Id);

            if (exists)
                throw new Exception("Employee ID already exists");

            // 2. Convert RoleName → RoleId
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

            if (role == null)
                throw new Exception("Invalid Role Name");

            // 3. Create Employee
            var password = Guid.NewGuid().ToString().Substring(0, 8);
            var employee = new Employee
            {
                Employee_Id = dto.Employee_Id,
                Name = dto.Name,
                Department = dto.Department,
                RoleId = role.RoleId,
                RoleName = role.Name,
                CTC = dto.CTC,
                Status = dto.Status,
                Email = dto.Email,
                JoiningDate = dto.JoiningDate,
                Password = password
            };

            // ✅ STEP 1: SAVE EMPLOYEE FIRST
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            _emailService.SendEmployeeCredentials(
                    employee.Email,
                    employee.Name
                        );
            // ✅ STEP 2: NOW ADD LEAVE BALANCE (AFTER EMPLOYEE EXISTS)
            //_context.EmployeeLeaveBalances.Add(new EmployeeLeaveBalance
            //{
            //    Employee_Id = employee.Employee_Id,
            //    Earned_Total = 4,
            //    Earned_Used = 0,
            //    Casual_Total = 4,
            //    Casual_Used = 0,
            //    Sick_Total = 4,
            //    Sick_Used = 0
            //});

            // 5. Department count
            var dept = await _context.Departments
                .FirstOrDefaultAsync(d => d.DepartmentName == dto.Department);

            if (dept != null)
                dept.MembersCount += 1;

            // 6. Activity log
            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"Employee {dto.Name} added",
                CreatedAt = DateTime.UtcNow
            });

            // ✅ SAVE AGAIN (for leave + dept + logs)
            await _context.SaveChangesAsync();

            // 7. Sync Role → User table
            if (!string.IsNullOrEmpty(employee.Email))
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == employee.Email);

                if (user != null)
                {
                    user.RoleId = role.RoleId;
                    await _context.SaveChangesAsync();
                }
            }

            // 8. Notifications
            await _adminNotificationService.CreateNotification(
                "New Employee Added",
                $"{employee.Name} has joined the company"
            );

            await _notificationService.CreateNotification(new UserNotificationDto
            {
                Employee_Id = employee.Employee_Id,
                Title = "Welcome to EMS",
                Message = $"Welcome {employee.Name}, your employee account has been created."
            });

            return employee;
        }
        // ✅ GET ALL
        public async Task<List<Employee>> GetAllEmployees()
        {
            return await _context.Employees
        .AsNoTracking()
        .OrderByDescending(e => e.Id)
        .ToListAsync();
        }

        // ✅ UPDATE EMPLOYEE
        public async Task<Employee?> UpdateEmployee(string employeeId, EmployeeDto dto)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)
                return null;

            // 🔥 STORE OLD DEPARTMENT
            var oldDepartment = employee.Department;

            // 🔥 Convert RoleName → RoleId
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

            if (role == null)
                throw new Exception("Invalid Role Name");

            // ✅ UPDATE FIELDS
            employee.Name = dto.Name;
            employee.Department = dto.Department;
            employee.RoleId = role.RoleId;
            employee.RoleName = role.Name;
            employee.CTC = dto.CTC;
            employee.Status = dto.Status;
            employee.Email = dto.Email;
            employee.JoiningDate = dto.JoiningDate;

            // 🔥 HANDLE DEPARTMENT COUNT CHANGE
            if (oldDepartment != dto.Department)
            {
                // OLD DEPARTMENT -1
                var oldDept = await _context.Departments
                    .FirstOrDefaultAsync(d => d.DepartmentName == oldDepartment);

                if (oldDept != null && oldDept.MembersCount > 0)
                    oldDept.MembersCount -= 1;

                // NEW DEPARTMENT +1
                var newDept = await _context.Departments
                    .FirstOrDefaultAsync(d => d.DepartmentName == dto.Department);

                if (newDept != null)
                    newDept.MembersCount += 1;
            }

            // 🔥 Sync user role
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == employee.Email);

            if (user != null)
                user.RoleId = role.RoleId;

            // 🔥 Activity log
            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"Employee {dto.Name} updated",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return employee;
        }

        // ✅ DELETE EMPLOYEE
        public async Task<string> DeleteEmployee(string employeeId)
        {
            var emp = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (emp == null)
                return "Employee not found";

            // Department count
            var dept = await _context.Departments
                .FirstOrDefaultAsync(d => d.DepartmentName == emp.Department);

            if (dept != null && dept.MembersCount > 0)
                dept.MembersCount -= 1;

            _context.Employees.Remove(emp);

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"Employee {emp.Name} deleted",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return "Employee deleted successfully";
        }
        public async Task<List<UpcomingBirthdayDto>> GetUpcomingBirthdays()
        {
            var today = DateTime.Today;

            var birthdays = await
            (
                from emp in _context.Employees.AsNoTracking()
                join personal in _context.EmployeePersonalInfos.AsNoTracking()
                    on emp.Employee_Id equals personal.Employee_Id
                where personal.DateOfBirth != DateTime.MinValue
                select new
                {
                    emp.Employee_Id,
                    emp.Name,
                    personal.DateOfBirth
                }
            ).ToListAsync();

            var result = birthdays
                .Select(x =>
                {
                    int month = x.DateOfBirth.Month;
                    int day = x.DateOfBirth.Day;
                    int year = today.Year;

                    // Handle 29-Feb birthdays in non-leap years
                    if (month == 2 && day == 29 && !DateTime.IsLeapYear(year))
                    {
                        day = 28;
                    }

                    var nextBirthday = new DateTime(year, month, day);

                    if (nextBirthday < today)
                    {
                        year++;

                        day = x.DateOfBirth.Day;

                        if (month == 2 && day == 29 && !DateTime.IsLeapYear(year))
                        {
                            day = 28;
                        }

                        nextBirthday = new DateTime(year, month, day);
                    }

                    return new UpcomingBirthdayDto
                    {
                        EmployeeId = x.Employee_Id,
                        EmployeeName = x.Name,
                        Birthday = x.DateOfBirth,
                        DaysRemaining = (nextBirthday - today).Days
                    };
                })
                .OrderBy(x => x.DaysRemaining)
                .Take(6)
                .ToList();

            return result;
        }
        public async Task<object> BulkUploadEmployees(IFormFile file)

        {

            if (file == null || file.Length == 0)

                return new { Message = "No file uploaded" };

            int inserted = 0;

            int updated = 0;

            int failed = 0;

            List<string> errors = new();

            using var stream = new MemoryStream();

            await file.CopyToAsync(stream);

            using var workbook = new XLWorkbook(stream);

            var worksheet = workbook.Worksheet(1);

            var totalRows = worksheet.LastRowUsed().RowNumber();

            for (int row = 2; row <= totalRows; row++)

            {

                try

                {

                    var employeeId = worksheet.Cell(row, 1).GetString().Trim();

                    var name = worksheet.Cell(row, 2).GetString().Trim();

                    var email = worksheet.Cell(row, 3).GetString().Trim();

                    var department = worksheet.Cell(row, 4).GetString().Trim();

                    var roleName = worksheet.Cell(row, 5).GetString().Trim();

                    var status = worksheet.Cell(row, 6).GetString().Trim();

                    var joiningDateText = worksheet.Cell(row, 7).GetString().Trim();

                    var ctcText = worksheet.Cell(row, 8).GetString().Trim();

                    if (string.IsNullOrWhiteSpace(employeeId))

                    {

                        failed++;

                        errors.Add($"Row {row}: Employee_Id missing");

                        continue;

                    }

                    var existingEmployee = await _context.Employees

                        .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

                    DateTime joiningDate = DateTime.Parse(joiningDateText);

                    decimal ctc = decimal.Parse(ctcText);

                    if (existingEmployee != null)

                    {

                        existingEmployee.Name = name;

                        existingEmployee.Email = email;

                        existingEmployee.Department = department;

                        existingEmployee.RoleName = roleName;

                        existingEmployee.Status = status;

                        existingEmployee.JoiningDate = joiningDate;

                        existingEmployee.CTC = ctc;

                        updated++;

                    }

                    else

                    {

                        var role = await _context.Roles

                            .FirstOrDefaultAsync(r => r.Name == roleName);

                        if (role == null)

                        {

                            failed++;

                            errors.Add($"Row {row}: Invalid Role Name");

                            continue;

                        }

                        var newEmployee = new Employee

                        {

                            Employee_Id = employeeId,

                            Name = name,

                            Email = email,

                            Department = department,

                            RoleName = roleName,

                            RoleId = role.RoleId,

                            Status = status,

                            JoiningDate = joiningDate,

                            CTC = ctc

                        };

                        await _context.Employees.AddAsync(newEmployee);

                        await _context.SaveChangesAsync();

                        //_context.EmployeeLeaveBalances.Add(new EmployeeLeaveBalance

                        //{

                        //    Employee_Id = newEmployee.Employee_Id,

                        //    Earned_Total = 10,

                        //    Earned_Used = 0,

                        //    Casual_Total = 12,

                        //    Casual_Used = 0,

                        //    Sick_Total = 10,

                        //    Sick_Used = 0

                        //});

                        var dept = await _context.Departments

    .FirstOrDefaultAsync(d => d.DepartmentName == department);

                        if (dept != null)

                        {

                            dept.MembersCount += 1;

                        }

                        await _emailService.SendEmailAsync(

    email,

    "EMS Login Details",

    $@"

    Hello {name},<br><br>
 
    Your account is created in Pirnav Company.<br><br>
 
    Login Link:
<a href='https://hrms.pirnav.com'>
https://hrms.pirnav.com
</a><br><br>
 
    Newly User Verify your account by using Register and Login.

    "

);

                        inserted++;

                    }

                }

                catch (Exception ex)

                {

                    failed++;

                    errors.Add($"Row {row}: {ex.Message}");

                }

            }

            await _context.SaveChangesAsync();

            return new

            {

                Inserted = inserted,

                Updated = updated,

                Failed = failed,

                Errors = errors

            };

        }

        public async Task<byte[]> DownloadEmployeeUploadTemplate()
        {
            using var workbook = new XLWorkbook();

            var worksheet = workbook.Worksheets.Add("Employee Upload");

            // Headers
            worksheet.Cell(1, 1).Value = "Employee_Id";
            worksheet.Cell(1, 2).Value = "Name";
            worksheet.Cell(1, 3).Value = "Email";
            worksheet.Cell(1, 4).Value = "Department";
            worksheet.Cell(1, 5).Value = "RoleName";
            worksheet.Cell(1, 6).Value = "Status";
            worksheet.Cell(1, 7).Value = "JoiningDate";
            worksheet.Cell(1, 8).Value = "CTC";

            // Header Style
            var header = worksheet.Range("A1:H1");
            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.LightBlue;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            header.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            header.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            // Date format for JoiningDate column
            worksheet.Column(7).Style.DateFormat.Format = "yyyy-MM-dd";

            // Auto fit columns
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return await Task.FromResult(stream.ToArray());
        }


        public async Task<Employee?> GetEmployeeByEmployeeId(string employeeId)
        {
            return await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);
        }

        public async Task SaveChanges()
        {
            await _context.SaveChangesAsync();
        }
        public async Task<byte[]> ExportFullEmployeeMaster()
        {
            var employees = await _context.Employees
            .AsNoTracking()
            .OrderBy(e => e.Employee_Id)
            .ToListAsync();

            var personalInfos = await _context.EmployeePersonalInfos
                .AsNoTracking()
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            var bankDetails = await _context.EmployeeBankDetails
    .AsNoTracking()
    .OrderBy(x => x.Employee_Id)
    .ToListAsync();

            var educations = await _context.EmployeeEducations
    .AsNoTracking()
    .OrderBy(x => x.Employee_Id)
    .ToListAsync();

            var experiences = await _context.EmployeeExperiences
     .AsNoTracking()
     .OrderBy(x => x.Employee_Id)
     .ToListAsync();

            var employeeDocuments = await _context.EmployeeDocuments
    .AsNoTracking()
    .ToListAsync();


            var employeeLookup = employees.ToDictionary(
                e => e.Employee_Id,
                e => e.Name);

            using var workbook = new XLWorkbook();

            // =========================
            // Sheet 1 - Employee Master
            // =========================

            // =========================
            // Sheet 1 - Employee Master
            // =========================

            var masterSheet = workbook.Worksheets.Add("Employee Master");

            // Title
            masterSheet.Cell(1, 1).Value = "Employee Master";
            masterSheet.Cell(1, 1).Style.Font.Bold = true;
            masterSheet.Cell(1, 1).Style.Font.FontSize = 16;

            // Headers
            masterSheet.Cell(2, 1).Value = "Employee ID";
            masterSheet.Cell(2, 2).Value = "Employee Name";
            masterSheet.Cell(2, 3).Value = "Email";
            masterSheet.Cell(2, 4).Value = "Department";
            masterSheet.Cell(2, 5).Value = "Role";
            masterSheet.Cell(2, 6).Value = "Status";
            masterSheet.Cell(2, 7).Value = "Joining Date";
            masterSheet.Cell(2, 8).Value = "CTC";
            masterSheet.Cell(2, 9).Value = "Document Status";
            masterSheet.Cell(2, 10).Value = "Documents Verified";

            var masterHeader = masterSheet.Range(2, 1, 2, 10);
            masterHeader.Style.Font.Bold = true;
            masterHeader.Style.Fill.BackgroundColor = XLColor.DarkBlue;
            masterHeader.Style.Font.FontColor = XLColor.White;
            masterHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            masterHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            masterHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            int masterRow = 3;

            foreach (var emp in employees)
            {
                masterSheet.Cell(masterRow, 1).Value = emp.Employee_Id;
                masterSheet.Cell(masterRow, 2).Value = emp.Name;
                masterSheet.Cell(masterRow, 3).Value = emp.Email;
                masterSheet.Cell(masterRow, 4).Value = emp.Department;
                masterSheet.Cell(masterRow, 5).Value = emp.RoleName;
                masterSheet.Cell(masterRow, 6).Value = emp.Status;

                masterSheet.Cell(masterRow, 7).Value = emp.JoiningDate;
                masterSheet.Cell(masterRow, 7).Style.DateFormat.Format = "dd-MMM-yyyy";

                masterSheet.Cell(masterRow, 8).Value = emp.CTC;

                var uploadedDocs = employeeDocuments.Count(x => x.Employee_Id == emp.Employee_Id);

                var verifiedDocs = employeeDocuments.Count(x =>
                    x.Employee_Id == emp.Employee_Id &&
                    x.Verification_Status == "Approved");

                string documentStatus;

                if (uploadedDocs == 0)
                {
                    documentStatus = "Not Started";
                }
                else if (uploadedDocs >= 13)
                {
                    documentStatus = "Complete";
                }
                else
                {
                    documentStatus = $"{uploadedDocs}/13 Uploaded";
                }

                masterSheet.Cell(masterRow, 9).Value = documentStatus;
                masterSheet.Cell(masterRow, 10).Value = $"{verifiedDocs}/{uploadedDocs} Verified";

                // Document Status Color
                if (documentStatus == "Complete")
                {
                    masterSheet.Cell(masterRow, 9).Style.Font.FontColor = XLColor.Green;
                }
                else if (documentStatus == "Not Started")
                {
                    masterSheet.Cell(masterRow, 9).Style.Font.FontColor = XLColor.Red;
                }
                else
                {
                    masterSheet.Cell(masterRow, 9).Style.Font.FontColor = XLColor.DarkOrange;
                }

                // Verification Status Color
                if (uploadedDocs > 0 && uploadedDocs == verifiedDocs)
                {
                    masterSheet.Cell(masterRow, 10).Style.Font.FontColor = XLColor.Green;
                }
                else if (verifiedDocs == 0)
                {
                    masterSheet.Cell(masterRow, 10).Style.Font.FontColor = XLColor.Red;
                }
                else
                {
                    masterSheet.Cell(masterRow, 10).Style.Font.FontColor = XLColor.DarkOrange;
                }

                masterRow++;
            }

            // Freeze Header Row
            masterSheet.SheetView.FreezeRows(2);

            // Auto Fit Columns
            masterSheet.Columns().AdjustToContents();



            // =========================
            // Sheet 2 - Personal Info
            // =========================

            // =========================
            // Sheet 2 - Personal Information
            // =========================

            var personalSheet = workbook.Worksheets.Add("Personal Information");

            // Title
            personalSheet.Cell(1, 1).Value = "Personal Information";
            personalSheet.Cell(1, 1).Style.Font.Bold = true;
            personalSheet.Cell(1, 1).Style.Font.FontSize = 16;

            // Headers
            personalSheet.Cell(2, 1).Value = "Employee ID";
            personalSheet.Cell(2, 2).Value = "Employee Name";
            personalSheet.Cell(2, 3).Value = "First Name";
            personalSheet.Cell(2, 4).Value = "Last Name";
            personalSheet.Cell(2, 5).Value = "Phone Number";
            personalSheet.Cell(2, 6).Value = "Email";
            personalSheet.Cell(2, 7).Value = "Gender";
            personalSheet.Cell(2, 8).Value = "DOB";
            personalSheet.Cell(2, 9).Value = "Aadhaar";
            personalSheet.Cell(2, 10).Value = "PAN";
            personalSheet.Cell(2, 11).Value = "Address";

            var personalHeader = personalSheet.Range(2, 1, 2, 11);
            personalHeader.Style.Font.Bold = true;
            personalHeader.Style.Fill.BackgroundColor = XLColor.DarkGreen;
            personalHeader.Style.Font.FontColor = XLColor.White;
            personalHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            personalHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            personalHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            int personalRow = 3;

            foreach (var p in personalInfos)
            {
                personalSheet.Cell(personalRow, 1).Value = p.Employee_Id;

                personalSheet.Cell(personalRow, 2).Value =
                    employeeLookup.ContainsKey(p.Employee_Id)
                        ? employeeLookup[p.Employee_Id]
                        : "";

                personalSheet.Cell(personalRow, 3).Value = p.FirstName;
                personalSheet.Cell(personalRow, 4).Value = p.LastName;
                personalSheet.Cell(personalRow, 5).Value = p.PhoneNumber;
                personalSheet.Cell(personalRow, 6).Value = p.Email;
                personalSheet.Cell(personalRow, 7).Value = p.Gender;

                if (p.DateOfBirth != DateTime.MinValue)
                {
                    personalSheet.Cell(personalRow, 8).Value = p.DateOfBirth;
                    personalSheet.Cell(personalRow, 8).Style.DateFormat.Format = "dd-MMM-yyyy";
                }

                personalSheet.Cell(personalRow, 9).Value = p.AadhaarNumber;
                personalSheet.Cell(personalRow, 10).Value = p.PanNumber;

                var address =
                    $"{p.HouseNo}, {p.Street}, {p.City}, {p.District}, {p.State}, {p.Country} - {p.Pincode}";

                personalSheet.Cell(personalRow, 11).Value = address;

                personalRow++;
            }

            // =========================
            // Pending Employees
            // =========================

            var employeesWithoutPersonalInfo = employees
                .Where(e => !personalInfos.Any(p => p.Employee_Id == e.Employee_Id))
                .OrderBy(e => e.Employee_Id)
                .ToList();

            if (employeesWithoutPersonalInfo.Any())
            {
                personalRow += 2;

                personalSheet.Cell(personalRow, 1).Value = "PENDING EMPLOYEES";

                personalSheet.Range(personalRow, 1, personalRow, 2).Merge();

                personalSheet.Cell(personalRow, 1).Style.Font.Bold = true;
                personalSheet.Cell(personalRow, 1).Style.Font.FontColor = XLColor.White;
                personalSheet.Cell(personalRow, 1).Style.Fill.BackgroundColor = XLColor.Red;
                personalSheet.Cell(personalRow, 1).Style.Alignment.Horizontal =
                    XLAlignmentHorizontalValues.Center;

                personalRow++;

                personalSheet.Cell(personalRow, 1).Value = "Employee ID";
                personalSheet.Cell(personalRow, 2).Value = "Employee Name";

                var pendingHeader = personalSheet.Range(personalRow, 1, personalRow, 2);

                pendingHeader.Style.Font.Bold = true;
                pendingHeader.Style.Font.FontColor = XLColor.White;
                pendingHeader.Style.Fill.BackgroundColor = XLColor.DarkRed;
                pendingHeader.Style.Alignment.Horizontal =
                    XLAlignmentHorizontalValues.Center;
                pendingHeader.Style.Border.OutsideBorder =
                    XLBorderStyleValues.Thin;
                pendingHeader.Style.Border.InsideBorder =
                    XLBorderStyleValues.Thin;

                personalRow++;

                foreach (var emp in employeesWithoutPersonalInfo)
                {
                    personalSheet.Cell(personalRow, 1).Value = emp.Employee_Id;
                    personalSheet.Cell(personalRow, 2).Value = emp.Name;

                    personalRow++;
                }
            }

            // Freeze Header
            personalSheet.SheetView.FreezeRows(2);

            // Auto Fit
            personalSheet.Columns().AdjustToContents();


            // =========================
            // Sheet 3 - Bank Details
            // =========================

            // =========================
            // Sheet 3 - Bank Details
            // =========================

            var bankSheet = workbook.Worksheets.Add("Bank Details");

            // Title
            bankSheet.Cell(1, 1).Value = "Bank Details";
            bankSheet.Cell(1, 1).Style.Font.Bold = true;
            bankSheet.Cell(1, 1).Style.Font.FontSize = 16;

            // Headers
            bankSheet.Cell(2, 1).Value = "Employee ID";
            bankSheet.Cell(2, 2).Value = "Employee Name";
            bankSheet.Cell(2, 3).Value = "Bank Name";
            bankSheet.Cell(2, 4).Value = "Account Holder";
            bankSheet.Cell(2, 5).Value = "Account Number";
            bankSheet.Cell(2, 6).Value = "IFSC";
            bankSheet.Cell(2, 7).Value = "Branch";
            bankSheet.Cell(2, 8).Value = "UAN";
            bankSheet.Cell(2, 9).Value = "PF Account";

            var bankHeader = bankSheet.Range(2, 1, 2, 9);

            bankHeader.Style.Font.Bold = true;
            bankHeader.Style.Font.FontColor = XLColor.White;
            bankHeader.Style.Fill.BackgroundColor = XLColor.DarkRed;
            bankHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            bankHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            bankHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            int bankRow = 3;

            // Remove duplicate bank records (one record per employee)
            var uniqueBankDetails = bankDetails
                .GroupBy(x => x.Employee_Id)
                .Select(g => g.First())
                .OrderBy(x => x.Employee_Id)
                .ToList();

            foreach (var bank in uniqueBankDetails)
            {
                bankSheet.Cell(bankRow, 1).Value = bank.Employee_Id;

                bankSheet.Cell(bankRow, 2).Value =
                    employeeLookup.TryGetValue(bank.Employee_Id, out var empName)
                        ? empName
                        : "";

                bankSheet.Cell(bankRow, 3).Value = bank.Bank_Name;
                bankSheet.Cell(bankRow, 4).Value = bank.Account_Holder_Name;
                bankSheet.Cell(bankRow, 5).Value = bank.Account_Number;
                bankSheet.Cell(bankRow, 6).Value = bank.IFSC_Code;
                bankSheet.Cell(bankRow, 7).Value = bank.Branch_Name;
                bankSheet.Cell(bankRow, 8).Value = bank.UAN_Number;
                bankSheet.Cell(bankRow, 9).Value = bank.PF_Account_Number;

                bankRow++;
            }

            // =========================
            // Pending Employees
            // =========================

            var employeesWithoutBank = employees
                .Where(e => !uniqueBankDetails.Any(b => b.Employee_Id == e.Employee_Id))
                .OrderBy(e => e.Employee_Id)
                .ToList();

            if (employeesWithoutBank.Any())
            {
                bankRow += 2;

                bankSheet.Cell(bankRow, 1).Value = "PENDING EMPLOYEES";

                bankSheet.Range(bankRow, 1, bankRow, 2).Merge();

                bankSheet.Cell(bankRow, 1).Style.Font.Bold = true;
                bankSheet.Cell(bankRow, 1).Style.Font.FontColor = XLColor.White;
                bankSheet.Cell(bankRow, 1).Style.Fill.BackgroundColor = XLColor.Red;
                bankSheet.Cell(bankRow, 1).Style.Alignment.Horizontal =
                    XLAlignmentHorizontalValues.Center;

                bankRow++;

                bankSheet.Cell(bankRow, 1).Value = "Employee ID";
                bankSheet.Cell(bankRow, 2).Value = "Employee Name";

                var pendingHeader = bankSheet.Range(bankRow, 1, bankRow, 2);

                pendingHeader.Style.Font.Bold = true;
                pendingHeader.Style.Font.FontColor = XLColor.White;
                pendingHeader.Style.Fill.BackgroundColor = XLColor.DarkRed;
                pendingHeader.Style.Alignment.Horizontal =
                    XLAlignmentHorizontalValues.Center;
                pendingHeader.Style.Border.OutsideBorder =
                    XLBorderStyleValues.Thin;
                pendingHeader.Style.Border.InsideBorder =
                    XLBorderStyleValues.Thin;

                bankRow++;

                foreach (var emp in employeesWithoutBank)
                {
                    bankSheet.Cell(bankRow, 1).Value = emp.Employee_Id;
                    bankSheet.Cell(bankRow, 2).Value = emp.Name;

                    bankRow++;
                }
            }

            // Freeze Header
            bankSheet.SheetView.FreezeRows(2);

            // Auto Fit
            bankSheet.Columns().AdjustToContents();

            // =========================
            // Sheet 4 - Education
            // =========================

            // =========================
            // Sheet 4 - Education
            // =========================

            // =========================
            // Sheet 4 - Education
            // =========================

            var educationSheet = workbook.Worksheets.Add("Education");

            // Title
            educationSheet.Cell(1, 1).Value = "Education";
            educationSheet.Cell(1, 1).Style.Font.Bold = true;
            educationSheet.Cell(1, 1).Style.Font.FontSize = 16;

            // Employee Details
            educationSheet.Cell(2, 1).Value = "Employee ID";
            educationSheet.Cell(2, 2).Value = "Employee Name";

            // --------------------
            // Education 1
            // --------------------

            educationSheet.Cell(2, 3).Value = "Degree 1";
            educationSheet.Cell(2, 4).Value = "University 1";
            educationSheet.Cell(2, 5).Value = "Year 1";
            educationSheet.Cell(2, 6).Value = "Percentage/CGPA 1";
            educationSheet.Cell(2, 7).Value = "Specialization 1";

            // Blank Gap
            educationSheet.Column(8).Width = 4;

            // --------------------
            // Education 2
            // --------------------

            educationSheet.Cell(2, 9).Value = "Degree 2";
            educationSheet.Cell(2, 10).Value = "University 2";
            educationSheet.Cell(2, 11).Value = "Year 2";
            educationSheet.Cell(2, 12).Value = "Percentage/CGPA 2";
            educationSheet.Cell(2, 13).Value = "Specialization 2";

            // Blank Gap
            educationSheet.Column(14).Width = 4;

            // --------------------
            // Education 3
            // --------------------

            educationSheet.Cell(2, 15).Value = "Degree 3";
            educationSheet.Cell(2, 16).Value = "University 3";
            educationSheet.Cell(2, 17).Value = "Year 3";
            educationSheet.Cell(2, 18).Value = "Percentage/CGPA 3";
            educationSheet.Cell(2, 19).Value = "Specialization 3";

            // Blank Gap
            educationSheet.Column(20).Width = 4;

            // --------------------
            // Education 4
            // --------------------

            educationSheet.Cell(2, 21).Value = "Degree 4";
            educationSheet.Cell(2, 22).Value = "University 4";
            educationSheet.Cell(2, 23).Value = "Year 4";
            educationSheet.Cell(2, 24).Value = "Percentage/CGPA 4";
            educationSheet.Cell(2, 25).Value = "Specialization 4";

            var educationHeader = educationSheet.Range(2, 1, 2, 25);

            educationHeader.Style.Font.Bold = true;
            educationHeader.Style.Fill.BackgroundColor = XLColor.DarkOrange;
            educationHeader.Style.Font.FontColor = XLColor.White;
            educationHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            educationHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            educationHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            int educationRow = 3;

            var groupedEducation = educations
                .GroupBy(x => x.Employee_Id)
                .OrderBy(x => x.Key);

            foreach (var group in groupedEducation)
            {
                educationSheet.Cell(educationRow, 1).Value = group.Key;

                educationSheet.Cell(educationRow, 2).Value =
                    employeeLookup.ContainsKey(group.Key)
                        ? employeeLookup[group.Key]
                        : "";

                int startColumn = 3;

                foreach (var edu in group.Take(4))
                {
                    educationSheet.Cell(educationRow, startColumn).Value = edu.Degree;
                    educationSheet.Cell(educationRow, startColumn + 1).Value = edu.UniversityBoard;
                    educationSheet.Cell(educationRow, startColumn + 2).Value = edu.YearOfPassing;
                    educationSheet.Cell(educationRow, startColumn + 3).Value = edu.PercentageCGPA;
                    educationSheet.Cell(educationRow, startColumn + 4).Value = edu.Specialization;

                    // Skip one blank column
                    startColumn += 6;
                }

                educationRow++;
            }

            // =========================
            // Pending Employees
            // =========================



            // Freeze Header
            educationSheet.SheetView.FreezeRows(2);

            // Auto Fit Columns
            educationSheet.Columns().AdjustToContents();

            // Keep separator columns blank
            educationSheet.Column(8).Width = 4;
            educationSheet.Column(14).Width = 4;
            educationSheet.Column(20).Width = 4;

            // Borders for Data
            var lastDataRow = educationSheet.LastRowUsed().RowNumber();

            var dataRange = educationSheet.Range(2, 1, lastDataRow, 25);

            dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            // Vertical Alignment
            dataRange.Style.Alignment.Vertical =
                XLAlignmentVerticalValues.Center;

            // Wrap Text
            dataRange.Style.Alignment.WrapText = true;


            // =========================
            // Sheet 5 - Experience
            // =========================

            // =========================
            // Sheet 5 - Experience
            // =========================

            // =========================
            // Sheet 5 - Experience
            // =========================

            var experienceSheet = workbook.Worksheets.Add("Experience");

            // Title
            experienceSheet.Cell(1, 1).Value = "Experience";
            experienceSheet.Cell(1, 1).Style.Font.Bold = true;
            experienceSheet.Cell(1, 1).Style.Font.FontSize = 16;

            // Employee Details

            experienceSheet.Cell(2, 1).Value = "Employee ID";
            experienceSheet.Cell(2, 2).Value = "Employee Name";

            // =====================
            // Experience 1
            // =====================

            experienceSheet.Cell(2, 3).Value = "Company 1";
            experienceSheet.Cell(2, 4).Value = "Designation 1";
            experienceSheet.Cell(2, 5).Value = "From Date 1";
            experienceSheet.Cell(2, 6).Value = "To Date 1";
            experienceSheet.Cell(2, 7).Value = "Reason For Leaving 1";

            // Gap
            experienceSheet.Column(8).Width = 4;

            // =====================
            // Experience 2
            // =====================

            experienceSheet.Cell(2, 9).Value = "Company 2";
            experienceSheet.Cell(2, 10).Value = "Designation 2";
            experienceSheet.Cell(2, 11).Value = "From Date 2";
            experienceSheet.Cell(2, 12).Value = "To Date 2";
            experienceSheet.Cell(2, 13).Value = "Reason For Leaving 2";

            // Gap
            experienceSheet.Column(14).Width = 4;

            // =====================
            // Experience 3
            // =====================

            experienceSheet.Cell(2, 15).Value = "Company 3";
            experienceSheet.Cell(2, 16).Value = "Designation 3";
            experienceSheet.Cell(2, 17).Value = "From Date 3";
            experienceSheet.Cell(2, 18).Value = "To Date 3";
            experienceSheet.Cell(2, 19).Value = "Reason For Leaving 3";

            // Gap
            experienceSheet.Column(20).Width = 4;

            // =====================
            // Experience 4
            // =====================

            experienceSheet.Cell(2, 21).Value = "Company 4";
            experienceSheet.Cell(2, 22).Value = "Designation 4";
            experienceSheet.Cell(2, 23).Value = "From Date 4";
            experienceSheet.Cell(2, 24).Value = "To Date 4";
            experienceSheet.Cell(2, 25).Value = "Reason For Leaving 4";

            var experienceHeader = experienceSheet.Range(2, 1, 2, 25);

            experienceHeader.Style.Font.Bold = true;
            experienceHeader.Style.Fill.BackgroundColor = XLColor.Purple;
            experienceHeader.Style.Font.FontColor = XLColor.White;
            experienceHeader.Style.Alignment.Horizontal =
                XLAlignmentHorizontalValues.Center;

            experienceHeader.Style.Border.OutsideBorder =
                XLBorderStyleValues.Thin;

            experienceHeader.Style.Border.InsideBorder =
                XLBorderStyleValues.Thin;

            int experienceRow = 3;

            var groupedExperience = experiences
                .GroupBy(x => x.Employee_Id)
                .OrderBy(x => x.Key);

            foreach (var group in groupedExperience)
            {
                experienceSheet.Cell(experienceRow, 1).Value = group.Key;

                experienceSheet.Cell(experienceRow, 2).Value =
                    employeeLookup.ContainsKey(group.Key)
                        ? employeeLookup[group.Key]
                        : "";

                int startColumn = 3;

                foreach (var exp in group.Take(4))
                {
                    experienceSheet.Cell(experienceRow, startColumn).Value = exp.CompanyName;

                    experienceSheet.Cell(experienceRow, startColumn + 1).Value = exp.Designation;

                    if (exp.FromDate.HasValue)
                    {
                        experienceSheet.Cell(experienceRow, startColumn + 2).Value = exp.FromDate.Value;
                        experienceSheet.Cell(experienceRow, startColumn + 2)
                            .Style.DateFormat.Format = "dd-MMM-yyyy";
                    }

                    if (exp.ToDate.HasValue)
                    {
                        experienceSheet.Cell(experienceRow, startColumn + 3).Value = exp.ToDate.Value;
                        experienceSheet.Cell(experienceRow, startColumn + 3)
                            .Style.DateFormat.Format = "dd-MMM-yyyy";
                    }

                    experienceSheet.Cell(experienceRow, startColumn + 4).Value = exp.ReasonForLeaving;

                    // Skip one blank column
                    startColumn += 6;
                }

                experienceRow++;
            }

            // =========================
            // Pending Employees
            // =========================

            // =========================
            // Pending Employees
            // =========================

            var employeesWithoutExperience = employees
                .Where(e => !experiences.Any(x => x.Employee_Id == e.Employee_Id))
                .OrderBy(e => e.Employee_Id)
                .ToList();

            if (employeesWithoutExperience.Any())
            {
                experienceRow += 2;

                experienceSheet.Cell(experienceRow, 1).Value =
                    "PENDING EMPLOYEES";

                experienceSheet.Range(experienceRow, 1, experienceRow, 2).Merge();

                experienceSheet.Cell(experienceRow, 1).Style.Font.Bold = true;
                experienceSheet.Cell(experienceRow, 1).Style.Font.FontColor = XLColor.White;
                experienceSheet.Cell(experienceRow, 1).Style.Fill.BackgroundColor = XLColor.Red;
                experienceSheet.Cell(experienceRow, 1).Style.Alignment.Horizontal =
                    XLAlignmentHorizontalValues.Center;

                experienceRow++;

                experienceSheet.Cell(experienceRow, 1).Value = "Employee ID";
                experienceSheet.Cell(experienceRow, 2).Value = "Employee Name";

                var pendingHeader =
                    experienceSheet.Range(experienceRow, 1, experienceRow, 2);

                pendingHeader.Style.Font.Bold = true;
                pendingHeader.Style.Fill.BackgroundColor = XLColor.DarkRed;
                pendingHeader.Style.Font.FontColor = XLColor.White;
                pendingHeader.Style.Alignment.Horizontal =
                    XLAlignmentHorizontalValues.Center;

                pendingHeader.Style.Border.OutsideBorder =
                    XLBorderStyleValues.Thin;

                pendingHeader.Style.Border.InsideBorder =
                    XLBorderStyleValues.Thin;

                experienceRow++;

                foreach (var emp in employeesWithoutExperience)
                {
                    experienceSheet.Cell(experienceRow, 1).Value = emp.Employee_Id;
                    experienceSheet.Cell(experienceRow, 2).Value = emp.Name;

                    experienceRow++;
                }
            }

            // Freeze Header
            experienceSheet.SheetView.FreezeRows(2);

            // Auto Fit
            experienceSheet.Columns().AdjustToContents();

            // Keep Gap Columns
            experienceSheet.Column(8).Width = 4;
            experienceSheet.Column(14).Width = 4;
            experienceSheet.Column(20).Width = 4;

            // Borders
            var lastRow = experienceSheet.LastRowUsed().RowNumber();

            var range = experienceSheet.Range(2, 1, lastRow, 25);

            range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            range.Style.Alignment.Vertical =
                XLAlignmentVerticalValues.Center;

            range.Style.Alignment.WrapText = true;

            //--------------------------------

            //------------------------------------


            var documentSheet =
    workbook.Worksheets.Add("Document Summary");
            documentSheet.Cell(1, 1).Value =
    "Employee Documents Summary";

            var completedEmployees = employees.Count(emp =>
            {
                var uploaded = employeeDocuments
                    .Count(x => x.Employee_Id == emp.Employee_Id);

                var verified = employeeDocuments
                    .Count(x =>
                        x.Employee_Id == emp.Employee_Id &&
                        x.Verification_Status == "Approved");

                return uploaded > 0 &&
                       uploaded == verified;
            });

            documentSheet.Cell(2, 1).Value =
                $"Total Employees : {employees.Count}";

            documentSheet.Cell(2, 4).Value =
                $"Completed : {completedEmployees}";

            documentSheet.Cell(2, 7).Value =
                $"Pending : {employees.Count - completedEmployees}";

            documentSheet.Cell(1, 1)
                .Style.Font.Bold = true;

            documentSheet.Cell(1, 1)
                .Style.Font.FontSize = 16;

            documentSheet.Cell(3, 1).Value = "Employee ID";
            documentSheet.Cell(3, 2).Value = "Employee Name";
            documentSheet.Cell(3, 3).Value = "Uploaded Documents";
            documentSheet.Cell(3, 4).Value = "Verified Documents";
            documentSheet.Cell(3, 5).Value = "Pending Verification";
            documentSheet.Cell(3, 6).Value = "Rejected Documents";
            documentSheet.Cell(3, 7).Value = "Status";

            var documentHeader =
    documentSheet.Range(3, 1, 3, 7);

            documentHeader.Style.Font.Bold = true;

            documentHeader.Style.Fill.BackgroundColor =
                XLColor.DarkBlue;

            documentHeader.Style.Font.FontColor =
                XLColor.White;

            int documentRow = 4;

            foreach (var emp in employees)
            {
                var uploadedDocs = employeeDocuments
                    .Count(x => x.Employee_Id == emp.Employee_Id);

                var verifiedDocs = employeeDocuments
                    .Count(x =>
                        x.Employee_Id == emp.Employee_Id &&
                        x.Verification_Status == "Approved");

                var rejectedDocs = employeeDocuments
                    .Count(x =>
                        x.Employee_Id == emp.Employee_Id &&
                        x.Verification_Status == "Rejected");

                var pendingDocs =
                    uploadedDocs - verifiedDocs - rejectedDocs;

                documentSheet.Cell(documentRow, 1).Value =
                    emp.Employee_Id;

                documentSheet.Cell(documentRow, 2).Value =
                    emp.Name;

                documentSheet.Cell(documentRow, 3).Value =
                    uploadedDocs;

                documentSheet.Cell(documentRow, 4).Value =
                    verifiedDocs;

                documentSheet.Cell(documentRow, 5).Value =
                    pendingDocs;

                documentSheet.Cell(documentRow, 6).Value =
                    rejectedDocs;

                if (uploadedDocs == 0)
                {
                    documentSheet.Cell(documentRow, 7).Value =
                        "Not Started";
                }
                else if (uploadedDocs > 0 &&
          verifiedDocs == uploadedDocs)
                {
                    documentSheet.Cell(documentRow, 7).Value =
                        "Complete";
                }
                else
                {
                    documentSheet.Cell(documentRow, 7).Value =
                        "In Progress";
                }

                documentRow++;
            }




            masterSheet.Columns().AdjustToContents();
            personalSheet.Columns().AdjustToContents();
            bankSheet.Columns().AdjustToContents();
            educationSheet.Columns().AdjustToContents();
            experienceSheet.Columns().AdjustToContents();
            documentSheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return stream.ToArray();
        }

        public async Task<byte[]> ExportEmployeeProfilePdf(string employeeId)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found");

            var personal = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            var bank = await _context.EmployeeBankDetails
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            var educations = await _context.EmployeeEducations
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            var experiences = await _context.EmployeeExperiences
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            var documents = await _context.EmployeeDocuments
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(20);
                    page.Footer()
     .AlignCenter()
     .Text(text =>
     {
         text.Span("Generated On : ");
         text.Span(DateTime.Now.ToString("dd-MMM-yyyy HH:mm"));
         text.Span(" | Page ");
         text.CurrentPageNumber();
         text.Span(" of ");
         text.TotalPages();
     });

                    page.Content().Column(col =>
                    {
                        // HEADER CARD
                        col.Item()
.Border(1)
.BorderColor("#D6D6D6")
.Padding(10)
.Column(header =>
{
    header.Item()
        .Text("PIRNAV SOFTWARE SOLUTIONS")
        .FontSize(22)
        .Bold()
        .FontColor("#1E40AF");

    header.Item()
        .Text("Employee Profile Report")
        .FontSize(14);

    header.Item()
        .Text($"Generated On : {DateTime.Now:dd-MMM-yyyy}");
});

                        col.Item().PaddingVertical(10);

                        // EMPLOYEE INFO CARD
                        col.Item()
                            .Border(1)
                            .BorderColor("#D6D6D6")
                            .Padding(10)
                            .Column(card =>
                            {
                                card.Item()
                                    .Text("EMPLOYEE INFORMATION")
                                    .FontSize(14)
                                    .Bold()
                                    .FontColor("#1E40AF");

                                card.Item().PaddingTop(10);

                                card.Item().Row(row =>
                                {
                                    row.RelativeItem().Text($"Employee ID : {employee.Employee_Id}");
                                    row.RelativeItem().Text($"Employee Name : {employee.Name}");
                                });

                                card.Item().Row(row =>
                                {
                                    row.RelativeItem().Text($"Department : {employee.Department}");
                                    row.RelativeItem().Text($"Role : {employee.RoleName}");
                                });

                                card.Item().Row(row =>
                                {
                                    row.RelativeItem().Text($"Status : {employee.Status}");
                                    row.RelativeItem().Text($"Joining Date : {employee.JoiningDate:dd-MMM-yyyy}");
                                });

                                card.Item().Text($"Email : {employee.Email}");
                            });

                        col.Item().PaddingVertical(8);

                        // PERSONAL INFO CARD
                        if (personal != null)
                        {
                            col.Item()
                                .Border(1)
                                .BorderColor("#D6D6D6")
                                .Padding(10)
                                .Column(card =>
                                {
                                    card.Item()
                                        .Text("PERSONAL INFORMATION")
                                        .FontSize(14)
                                        .Bold()
                                        .FontColor("#16A34A");

                                    card.Item().PaddingTop(5);

                                    card.Item().Row(row =>
                                    {
                                        row.RelativeItem()
                                            .Text($"First Name : {personal.FirstName}");

                                        row.RelativeItem()
                                            .Text($"Last Name : {personal.LastName}");
                                    });

                                    card.Item().Row(row =>
                                    {
                                        row.RelativeItem()
                                            .Text($"Gender : {personal.Gender}");

                                        row.RelativeItem()
                                            .Text($"DOB : {personal.DateOfBirth:dd-MMM-yyyy}");
                                    });

                                    card.Item().Row(row =>
                                    {
                                        row.RelativeItem()
                                            .Text($"Phone : {personal.PhoneNumber}");

                                        row.RelativeItem()
                                            .Text($"Blood Group : {personal.BloodGroup}");
                                    });

                                    card.Item().Row(row =>
                                    {
                                        row.RelativeItem()
                                            .Text($"PAN : {personal.PanNumber}");

                                        row.RelativeItem()
                                            .Text($"Aadhaar : {personal.AadhaarNumber}");
                                    });

                                    card.Item().Text(
                                        $"Marital Status : {personal.Marital_Status}");
                                });
                        }

                        col.Item().PaddingVertical(8);

                        // ADDRESS CARD
                        if (personal != null)
                        {
                            col.Item()
                                .Border(1)
                                .BorderColor("#D6D6D6")
                                .Padding(10)
                                .Column(card =>
                                {
                                    card.Item()
                                        .Text("ADDRESS INFORMATION")
                                        .FontSize(14)
                                        .Bold()
                                        .FontColor("#EA580C");

                                    card.Item().PaddingTop(5);

                                    card.Item().Text(
                                        $"{personal.HouseNo}, {personal.Street}");

                                    card.Item().Text(
                                        $"{personal.City}, {personal.District}");

                                    card.Item().Text(
                                        $"{personal.State}, {personal.Country}");

                                    card.Item().Text(
                                        $"Pincode : {personal.Pincode}");
                                });
                        }

                        col.Item().PaddingVertical(8);

                        // BANK CARD
                        if (bank != null)
                        {
                            col.Item()
                                .Border(1)
                                .BorderColor("#D6D6D6")
                                .Padding(10)
                                .Column(card =>
                                {
                                    card.Item()
                                        .Text("BANK DETAILS")
                                        .FontSize(14)
                                        .Bold()
                                        .FontColor("#7C3AED");

                                    card.Item().PaddingTop(5);

                                    card.Item().Row(row =>
                                    {
                                        row.RelativeItem()
                                            .Text($"Bank : {bank.Bank_Name}");

                                        row.RelativeItem()
                                            .Text($"Branch : {bank.Branch_Name}");
                                    });

                                    card.Item().Row(row =>
                                    {
                                        row.RelativeItem()
                                            .Text($"Account : {bank.Account_Number}");

                                        row.RelativeItem()
                                            .Text($"IFSC : {bank.IFSC_Code}");
                                    });

                                    card.Item().Text(
                                        $"Account Holder : {bank.Account_Holder_Name}");

                                    card.Item().Text(
                                        $"UAN : {bank.UAN_Number}");

                                    card.Item().Text(
                                        $"PF : {bank.PF_Account_Number}");
                                });
                        }

                        col.Item().PaddingVertical(10);

                        // EDUCATION
                        if (educations.Any())
                        {
                            col.Item()
                                .Border(1)
                                .BorderColor("#D6D6D6")
                                .Padding(10)
                                .Column(card =>
                                {
                                    card.Item()
                                        .Text("EDUCATION")
                                        .FontSize(14)
                                        .Bold()
                                        .FontColor("#1E40AF");

                                    card.Item().PaddingTop(5);

                                    foreach (var edu in educations)
                                    {
                                        card.Item().BorderBottom(1)
                                            .BorderColor("#E5E7EB")
                                            .PaddingBottom(5)
                                            .PaddingTop(5)
                                            .Column(x =>
                                            {
                                                x.Item().Text($"Degree : {edu.Degree}");

                                                x.Item().Text($"University : {edu.UniversityBoard}");

                                                x.Item().Row(row =>
                                                {
                                                    row.RelativeItem()
                                                        .Text($"Year : {edu.YearOfPassing}");

                                                    row.RelativeItem()
                                                        .Text($"CGPA : {edu.PercentageCGPA}");
                                                });
                                            });
                                    }
                                });
                        }
                        // WORK EXPERIENCE
                        if (experiences.Any())
                        {
                            col.Item()
                                .Border(1)
                                .BorderColor("#D6D6D6")
                                .Padding(10)
                                .Column(card =>
                                {
                                    card.Item()
                                        .Text("WORK EXPERIENCE")
                                        .FontSize(14)
                                        .Bold()
                                        .FontColor("#1E40AF");

                                    card.Item().PaddingTop(5);

                                    foreach (var exp in experiences)
                                    {
                                        card.Item()
                                            .BorderBottom(1)
                                            .BorderColor("#E5E7EB")
                                            .PaddingBottom(5)
                                            .PaddingTop(5)
                                            .Column(x =>
                                            {
                                                x.Item().Text($"Company : {exp.CompanyName}");

                                                x.Item().Text($"Designation : {exp.Designation}");

                                                x.Item().Row(row =>
                                                {
                                                    row.RelativeItem()
                                                        .Text($"From : {exp.FromDate:dd-MMM-yyyy}");

                                                    row.RelativeItem()
                                                        .Text($"To : {exp.ToDate:dd-MMM-yyyy}");
                                                });

                                                if (!string.IsNullOrWhiteSpace(exp.ReasonForLeaving))
                                                {
                                                    x.Item().Text($"Reason : {exp.ReasonForLeaving}");
                                                }
                                            });
                                    }
                                });
                        }
                        // DOCUMENTS
                        if (documents.Any())
                        {
                            col.Item()
                                .Border(1)
                                .BorderColor("#D6D6D6")
                                .Padding(10)
                                .Column(card =>
                                {
                                    card.Item()
                                        .Text("UPLOADED DOCUMENTS")
                                        .FontSize(14)
                                        .Bold()
                                        .FontColor("#1E40AF");

                                    card.Item().PaddingTop(5);

                                    foreach (var doc in documents)
                                    {
                                        card.Item()
                                            .BorderBottom(1)
                                            .BorderColor("#E5E7EB")
                                            .PaddingBottom(5)
                                            .PaddingTop(5)
                                            .Row(row =>
                                            {
                                                row.RelativeItem()
                                                    .Text($"Document : {doc.Document_Type}");

                                                row.RelativeItem()
                                                    .Text(Path.GetFileName(doc.File_Path));
                                            });
                                    }
                                });
                        }
                    });
                });
            }).GeneratePdf();

            return pdfBytes;
        }

    }
}