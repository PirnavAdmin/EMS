using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using System.IO;

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
            _context.EmployeeLeaveBalances.Add(new EmployeeLeaveBalance
            {
                Employee_Id = employee.Employee_Id,
                Earned_Total = 10,
                Earned_Used = 0,
                Casual_Total = 12,
                Casual_Used = 0,
                Sick_Total = 10,
                Sick_Used = 0
            });

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

            var masterSheet = workbook.Worksheets.Add("Employee Master");
            masterSheet.Cell(1, 1).Value = "Employee Master";

            masterSheet.Cell(1, 1).Style.Font.Bold = true;
            masterSheet.Cell(1, 1).Style.Font.FontSize = 16;

            masterSheet.Cell(2, 1).Value =
                $"Total Employees : {employees.Count}";

            masterSheet.Cell(2, 1).Style.Font.Bold = true;
            masterSheet.Cell(2, 4).Value =
    $"Active Employees : {employees.Count(x => x.Status == "Active")}";

            masterSheet.Cell(2, 4).Style.Font.Bold = true;

            masterSheet.Cell(2, 7).Value =
    $"Inactive Employees : {employees.Count(x => x.Status != "Active")}";

            var employeesWithDocuments = employeeDocuments
    .Select(x => x.Employee_Id)
    .Distinct()
    .Count();

            masterSheet.Cell(2, 9).Value =
                $"Documents Started : {employeesWithDocuments}";

            var pendingVerification = employeeDocuments
    .Count(x => x.Verification_Status == "Pending");

            masterSheet.Cell(2, 10).Value =
                $"Pending Verification : {pendingVerification}";

            masterSheet.Cell(2, 10).Style.Font.Bold = true;
            masterSheet.Cell(2, 10).Style.Font.FontColor = XLColor.DarkGreen;

            masterSheet.Cell(2, 7).Style.Font.Bold = true;

            masterSheet.Cell(3, 1).Value = "Employee ID";
            masterSheet.Cell(3, 2).Value = "Name";
            masterSheet.Cell(3, 3).Value = "Email";
            masterSheet.Cell(3, 4).Value = "Department";
            masterSheet.Cell(3, 5).Value = "Role";
            masterSheet.Cell(3, 6).Value = "Status";
            masterSheet.Cell(3, 7).Value = "Joining Date";
            masterSheet.Cell(3, 8).Value = "CTC";
            masterSheet.Cell(3, 9).Value = "Document Status";
            masterSheet.Cell(3, 10).Value = "Documents Verified";

            var masterHeader =
    masterSheet.Range(3, 1, 3, 10);
            masterHeader.Style.Font.Bold = true;
            masterHeader.Style.Fill.BackgroundColor = XLColor.DarkBlue;
            masterHeader.Style.Font.FontColor = XLColor.White;
            masterSheet.Cell(2, 1).Style.Font.Bold = true;

            masterSheet.Cell(2, 4).Style.Font.Bold = true;
            masterSheet.Cell(2, 4).Style.Font.FontColor = XLColor.Green;

            masterSheet.Cell(2, 7).Style.Font.Bold = true;
            masterSheet.Cell(2, 7).Style.Font.FontColor = XLColor.Red;

            int masterRow = 4;

            foreach (var emp in employees)
            {
                masterSheet.Cell(masterRow, 1).Value = emp.Employee_Id;
                masterSheet.Cell(masterRow, 2).Value = emp.Name;
                masterSheet.Cell(masterRow, 3).Value = emp.Email;
                masterSheet.Cell(masterRow, 4).Value = emp.Department;
                masterSheet.Cell(masterRow, 5).Value = emp.RoleName;
                masterSheet.Cell(masterRow, 6).Value = emp.Status;
                masterSheet.Cell(masterRow, 7).Value = emp.JoiningDate.ToString("dd-MMM-yyyy");
                masterSheet.Cell(masterRow, 8).Value = emp.CTC;

                var uploadedDocs = employeeDocuments
    .Count(x => x.Employee_Id == emp.Employee_Id);

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

                masterSheet.Cell(masterRow, 9).Value =
                    documentStatus;

                var verifiedDocs = employeeDocuments
    .Count(x =>
        x.Employee_Id == emp.Employee_Id &&
        x.Verification_Status == "Approved");

                masterSheet.Cell(masterRow, 10).Value =
                    $"{verifiedDocs}/{uploadedDocs} Verified";

                masterSheet.Cell(masterRow, 10).Value =
    $"{verifiedDocs}/{uploadedDocs} Verified";

                if (uploadedDocs > 0 &&
    verifiedDocs == uploadedDocs)
                {
                    masterSheet.Cell(masterRow, 10)
                        .Style.Font.FontColor = XLColor.Green;
                }
                else if (verifiedDocs == 0)
                {
                    masterSheet.Cell(masterRow, 10)
                        .Style.Font.FontColor = XLColor.Red;
                }
                else
                {
                    masterSheet.Cell(masterRow, 10)
                        .Style.Font.FontColor = XLColor.DarkOrange;
                }

                if (documentStatus == "Complete")
                {
                    masterSheet.Cell(masterRow, 9)
                        .Style.Font.FontColor = XLColor.Green;
                }
                else if (documentStatus == "Not Started")
                {
                    masterSheet.Cell(masterRow, 9)
                        .Style.Font.FontColor = XLColor.Red;
                }
                else
                {
                    masterSheet.Cell(masterRow, 9)
                        .Style.Font.FontColor = XLColor.DarkOrange;
                }

                masterRow++;
            }

            // =========================
            // Sheet 2 - Personal Info
            // =========================

            var personalSheet = workbook.Worksheets.Add("Personal Information");
            var totalEmployees = employees.Count;

            var filledPersonal = personalInfos
                .Select(x => x.Employee_Id)
                .Distinct()
                .Count();

            var pendingPersonal = totalEmployees - filledPersonal;

            personalSheet.Cell(1, 1).Value = "Personal Information";
            personalSheet.Cell(1, 1).Style.Font.Bold = true;
            personalSheet.Cell(1, 1).Style.Font.FontSize = 16;

            personalSheet.Cell(2, 1).Value =
                $"Total Employees : {totalEmployees}";

            personalSheet.Cell(2, 4).Value =
                $"Filled : {filledPersonal}";

            personalSheet.Cell(2, 7).Value =
                $"Pending : {pendingPersonal}";

            personalSheet.Cell(2, 1).Style.Font.Bold = true;
            personalSheet.Cell(2, 4).Style.Font.Bold = true;
            personalSheet.Cell(2, 7).Style.Font.Bold = true;

            personalSheet.Cell(4, 1).Value = "Employee ID";
            personalSheet.Cell(4, 2).Value = "Employee Name";
            personalSheet.Cell(4, 3).Value = "First Name";
            personalSheet.Cell(4, 4).Value = "Last Name";
            personalSheet.Cell(4, 5).Value = "Phone Number";
            personalSheet.Cell(4, 6).Value = "Email";
            personalSheet.Cell(4, 7).Value = "Gender";
            personalSheet.Cell(4, 8).Value = "DOB";
            personalSheet.Cell(4, 9).Value = "Aadhaar";
            personalSheet.Cell(4, 10).Value = "PAN";
            personalSheet.Cell(4, 11).Value = "Address";

            var personalHeader = personalSheet.Range(4, 1, 4, 11);
            personalHeader.Style.Font.Bold = true;
            personalHeader.Style.Fill.BackgroundColor = XLColor.DarkGreen;
            personalHeader.Style.Font.FontColor = XLColor.White;

            int personalRow = 5;

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
                personalSheet.Cell(personalRow, 8).Value = p.DateOfBirth.ToString("dd-MMM-yyyy");
                personalSheet.Cell(personalRow, 9).Value = p.AadhaarNumber;
                personalSheet.Cell(personalRow, 10).Value = p.PanNumber;
                var address =
    $"{p.HouseNo}, {p.Street}, {p.City}, {p.District}, {p.State}, {p.Country} - {p.Pincode}";

                personalSheet.Cell(personalRow, 11).Value =
                    address;

                personalRow++;
            }

            var employeesWithoutPersonalInfo = employees
    .Where(e => !personalInfos
        .Any(p => p.Employee_Id == e.Employee_Id))
    .ToList();

            personalRow += 2;

            personalSheet.Cell(personalRow, 1).Value =
                "PENDING EMPLOYEES";

            personalSheet.Range(personalRow, 1, personalRow, 3)
                .Merge();

            personalSheet.Cell(personalRow, 1)
                .Style.Font.Bold = true;

            personalSheet.Cell(personalRow, 1)
                .Style.Fill.BackgroundColor =
                    XLColor.Red;

            personalSheet.Cell(personalRow, 1)
                .Style.Font.FontColor =
                    XLColor.White;

            personalRow++;

            personalSheet.Cell(personalRow, 1).Value =
    "Employee ID";

            personalSheet.Cell(personalRow, 2).Value =
                "Employee Name";

            personalRow++;

            foreach (var emp in employeesWithoutPersonalInfo)
            {
                personalSheet.Cell(personalRow, 1).Value =
                    emp.Employee_Id;

                personalSheet.Cell(personalRow, 2).Value =
                    emp.Name;

                personalRow++;
            }

            // =========================
            // Sheet 3 - Bank Details
            // =========================

            var bankSheet = workbook.Worksheets.Add("Bank Details");
            var filledBank = bankDetails
    .Select(x => x.Employee_Id)
    .Distinct()
    .Count();

            var pendingBank =
                totalEmployees - filledBank;
            bankSheet.Cell(1, 1).Value = "Bank Details";
            bankSheet.Cell(1, 1).Style.Font.Bold = true;
            bankSheet.Cell(1, 1).Style.Font.FontSize = 16;

            bankSheet.Cell(2, 1).Value =
                $"Total Employees : {totalEmployees}";

            bankSheet.Cell(2, 4).Value =
                $"Filled : {filledBank}";

            bankSheet.Cell(2, 7).Value =
                $"Pending : {pendingBank}";

            bankSheet.Cell(2, 1).Style.Font.Bold = true;
            bankSheet.Cell(2, 4).Style.Font.Bold = true;
            bankSheet.Cell(2, 7).Style.Font.Bold = true;

            bankSheet.Cell(4, 1).Value = "Employee ID";
            bankSheet.Cell(4, 2).Value = "Employee Name";
            bankSheet.Cell(4, 3).Value = "Bank Name";
            bankSheet.Cell(4, 4).Value = "Account Holder";
            bankSheet.Cell(4, 5).Value = "Account Number";
            bankSheet.Cell(4, 6).Value = "IFSC";
            bankSheet.Cell(4, 7).Value = "Branch";
            bankSheet.Cell(4, 8).Value = "UAN";
            bankSheet.Cell(4, 9).Value = "PF Account";

            var bankHeader = bankSheet.Range(4, 1, 4, 9);
            bankHeader.Style.Font.Bold = true;
            bankHeader.Style.Fill.BackgroundColor = XLColor.DarkRed;
            bankHeader.Style.Font.FontColor = XLColor.White;

            int bankRow = 5;

            foreach (var bank in bankDetails)
            {
                bankSheet.Cell(bankRow, 1).Value = bank.Employee_Id;
                bankSheet.Cell(bankRow, 2).Value =
                    employeeLookup.ContainsKey(bank.Employee_Id)
                        ? employeeLookup[bank.Employee_Id]
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

            var employeesWithoutBank = employees
    .Where(e => !bankDetails
        .Any(b => b.Employee_Id == e.Employee_Id))
    .ToList();

            bankRow += 2;

            bankSheet.Cell(bankRow, 1).Value =
                "PENDING EMPLOYEES";

            bankSheet.Range(bankRow, 1, bankRow, 3)
                .Merge();

            bankSheet.Cell(bankRow, 1)
                .Style.Font.Bold = true;

            bankSheet.Cell(bankRow, 1)
                .Style.Fill.BackgroundColor =
                    XLColor.Red;

            bankSheet.Cell(bankRow, 1)
                .Style.Font.FontColor =
                    XLColor.White;

            bankRow++;

            bankSheet.Cell(bankRow, 1).Value =
    "Employee ID";

            bankSheet.Cell(bankRow, 2).Value =
                "Employee Name";

            bankRow++;

            foreach (var emp in employeesWithoutBank)
            {
                bankSheet.Cell(bankRow, 1).Value =
                    emp.Employee_Id;

                bankSheet.Cell(bankRow, 2).Value =
                    emp.Name;

                bankRow++;
            }

            // =========================
            // Sheet 4 - Education
            // =========================

            var educationSheet = workbook.Worksheets.Add("Education");

            var filledEducation = educations
    .Select(x => x.Employee_Id)
    .Distinct()
    .Count();

            var pendingEducation =
                totalEmployees - filledEducation;
            educationSheet.Cell(1, 1).Value = "Education";
            educationSheet.Cell(1, 1).Style.Font.Bold = true;
            educationSheet.Cell(1, 1).Style.Font.FontSize = 16;

            educationSheet.Cell(2, 1).Value =
                $"Total Employees : {totalEmployees}";

            educationSheet.Cell(2, 4).Value =
                $"Filled : {filledEducation}";

            educationSheet.Cell(2, 7).Value =
                $"Pending : {pendingEducation}";

            educationSheet.Cell(2, 1).Style.Font.Bold = true;
            educationSheet.Cell(2, 4).Style.Font.Bold = true;
            educationSheet.Cell(2, 7).Style.Font.Bold = true;

            educationSheet.Cell(4, 1).Value = "Employee ID";
            educationSheet.Cell(4, 2).Value = "Employee Name";
            educationSheet.Cell(4, 3).Value = "Degree";
            educationSheet.Cell(4, 4).Value = "University";
            educationSheet.Cell(4, 5).Value = "Year Of Passing";
            educationSheet.Cell(4, 6).Value = "Percentage/CGPA";
            educationSheet.Cell(4, 7).Value = "Specialization";

            var educationHeader = educationSheet.Range(4, 1, 4, 7);
            educationHeader.Style.Font.Bold = true;
            educationHeader.Style.Fill.BackgroundColor = XLColor.DarkOrange;
            educationHeader.Style.Font.FontColor = XLColor.White;

            int educationRow = 5;

            foreach (var edu in educations)
            {
                educationSheet.Cell(educationRow, 1).Value = edu.Employee_Id;
                educationSheet.Cell(educationRow, 2).Value =
                    employeeLookup.ContainsKey(edu.Employee_Id)
                        ? employeeLookup[edu.Employee_Id]
                        : "";

                educationSheet.Cell(educationRow, 3).Value = edu.Degree;
                educationSheet.Cell(educationRow, 4).Value = edu.UniversityBoard;
                educationSheet.Cell(educationRow, 5).Value = edu.YearOfPassing;
                educationSheet.Cell(educationRow, 6).Value = edu.PercentageCGPA;
                educationSheet.Cell(educationRow, 7).Value = edu.Specialization;

                educationRow++;
            }

            var employeesWithoutEducation = employees
    .Where(e => !educations
        .Any(ed => ed.Employee_Id == e.Employee_Id))
    .ToList();

            educationRow += 2;

            educationSheet.Cell(educationRow, 1).Value =
                "PENDING EMPLOYEES";

            educationSheet.Range(
                educationRow, 1,
                educationRow, 3)
                .Merge();

            educationSheet.Cell(educationRow, 1)
                .Style.Font.Bold = true;

            educationSheet.Cell(educationRow, 1)
                .Style.Fill.BackgroundColor =
                    XLColor.Red;

            educationSheet.Cell(educationRow, 1)
                .Style.Font.FontColor =
                    XLColor.White;

            educationRow++;

            foreach (var emp in employeesWithoutEducation)
            {
                educationSheet.Cell(educationRow, 1).Value =
                    emp.Employee_Id;

                educationSheet.Cell(educationRow, 2).Value =
                    emp.Name;

                educationRow++;
            }

            // =========================
            // Sheet 5 - Experience
            // =========================

            var experienceSheet = workbook.Worksheets.Add("Experience");

            var filledExperience = experiences
    .Select(x => x.Employee_Id)
    .Distinct()
    .Count();

            var pendingExperience =
                totalEmployees - filledExperience;

            experienceSheet.Cell(1, 1).Value = "Experience";
            experienceSheet.Cell(1, 1).Style.Font.Bold = true;
            experienceSheet.Cell(1, 1).Style.Font.FontSize = 16;

            experienceSheet.Cell(2, 1).Value =
                $"Total Employees : {totalEmployees}";

            experienceSheet.Cell(2, 4).Value =
                $"Filled : {filledExperience}";

            experienceSheet.Cell(2, 7).Value =
                $"Pending : {pendingExperience}";

            experienceSheet.Cell(2, 1).Style.Font.Bold = true;
            experienceSheet.Cell(2, 4).Style.Font.Bold = true;
            experienceSheet.Cell(2, 7).Style.Font.Bold = true;

            experienceSheet.Cell(4, 1).Value = "Employee ID";
            experienceSheet.Cell(4, 2).Value = "Employee Name";
            experienceSheet.Cell(4, 3).Value = "Company Name";
            experienceSheet.Cell(4, 4).Value = "Designation";
            experienceSheet.Cell(4, 5).Value = "From Date";
            experienceSheet.Cell(4, 6).Value = "To Date";
            experienceSheet.Cell(4, 7).Value = "Reason For Leaving";

            var experienceHeader = experienceSheet.Range(4, 1, 4, 7);
            experienceHeader.Style.Font.Bold = true;
            experienceHeader.Style.Fill.BackgroundColor = XLColor.Purple;
            experienceHeader.Style.Font.FontColor = XLColor.White;

            int experienceRow = 5;

            foreach (var exp in experiences)
            {
                experienceSheet.Cell(experienceRow, 1).Value = exp.Employee_Id;
                experienceSheet.Cell(experienceRow, 2).Value =
                    employeeLookup.ContainsKey(exp.Employee_Id)
                        ? employeeLookup[exp.Employee_Id]
                        : "";

                experienceSheet.Cell(experienceRow, 3).Value = exp.CompanyName;
                experienceSheet.Cell(experienceRow, 4).Value = exp.Designation;
                experienceSheet.Cell(experienceRow, 5).Value = exp.FromDate?.ToString("dd-MMM-yyyy");
                experienceSheet.Cell(experienceRow, 6).Value = exp.ToDate?.ToString("dd-MMM-yyyy");
                experienceSheet.Cell(experienceRow, 7).Value = exp.ReasonForLeaving;

                experienceRow++;
            }

            var employeesWithoutExperience = employees
    .Where(e => !experiences
        .Any(ex => ex.Employee_Id == e.Employee_Id))
    .ToList();

            experienceRow += 2;

            experienceSheet.Cell(experienceRow, 1).Value =
                "PENDING EMPLOYEES";

            experienceSheet.Range(
                experienceRow, 1,
                experienceRow, 3)
                .Merge();

            experienceSheet.Cell(experienceRow, 1)
                .Style.Font.Bold = true;

            experienceSheet.Cell(experienceRow, 1)
                .Style.Fill.BackgroundColor =
                    XLColor.Red;

            experienceSheet.Cell(experienceRow, 1)
                .Style.Font.FontColor =
                    XLColor.White;

            experienceRow++;

            experienceSheet.Cell(experienceRow, 1).Value =
    "Employee ID";

            experienceSheet.Cell(experienceRow, 2).Value =
                "Employee Name";

            experienceRow++;

            foreach (var emp in employeesWithoutExperience)
            {
                experienceSheet.Cell(experienceRow, 1).Value =
                    emp.Employee_Id;

                experienceSheet.Cell(experienceRow, 2).Value =
                    emp.Name;

                experienceRow++;
            }

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

    }
}