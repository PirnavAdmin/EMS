using EmployeeManagementSystem.Interfaces;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services

{

    public class LocationMismatchEmailJobService

    {

        private readonly IEmailService _emailService;

        public LocationMismatchEmailJobService(IEmailService emailService)

        {

            _emailService = emailService;

        }

        public async Task SendAsync(

            string adminEmail,

            string employeeId,

            string employeeName,

            string employeeEmail,

            decimal checkInLatitude,

            decimal checkInLongitude,

            decimal checkOutLatitude,

            decimal checkOutLongitude,

            decimal distance,

            string reason)

        {

            await _emailService.SendLocationMismatchEmail(

                adminEmail,

                employeeId,

                employeeName,

                employeeEmail,

                checkInLatitude,

                checkInLongitude,

                checkOutLatitude,

                checkOutLongitude,

                distance,

                reason);

        }

    }

}

