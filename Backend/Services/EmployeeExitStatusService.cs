using EmployeeManagementSystem.Data;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class EmployeeExitStatusService

    {

        private readonly AppDbContext _context;

        public EmployeeExitStatusService(

            AppDbContext context)

        {

            _context = context;

        }

        public async Task ProcessExpiredLastWorkingDates()

        {

            try

            {

                var today = DateTime.Now.Date;

                var resignations =

                    await _context.EmployeeResignations

                        .Where(x =>

                            x.OverallStatus == "Approved" &&

                            x.LastWorkingDate.Date < today)

                        .ToListAsync();

                if (!resignations.Any())

                {

                    return;

                }

                foreach (var resignation in resignations)

                {

                    var employee =

                        await _context.Employees

                            .FirstOrDefaultAsync(x =>

                                x.Employee_Id ==

                                resignation.Employee_Id);

                    if (employee == null)

                    {

                        continue;

                    }

                    if (string.Equals(

                            employee.Status,

                            "Inactive",

                            StringComparison.OrdinalIgnoreCase))

                    {

                        continue;

                    }

                    employee.Status = "Inactive";

                    _context.ActivityLogs.Add(

                        new EmployeeManagementSystem.Models.ActivityLog

                        {

                            Activity =

                                $"Employee {employee.Employee_Id} " +

                                $"automatically marked Inactive " +

                                $"after Last Working Date " +

                                $"{resignation.LastWorkingDate:dd-MM-yyyy}.",

                            CreatedAt =

                                DateTime.UtcNow

                        });

                }

                await _context.SaveChangesAsync();

            }

            catch (Exception ex)

            {

                Console.WriteLine(

                    $"Employee exit status processing failed: {ex}");

            }

        }

    }

}
