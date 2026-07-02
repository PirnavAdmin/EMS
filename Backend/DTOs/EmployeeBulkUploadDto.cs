namespace EmployeeManagementSystem.DTOs
{
    namespace EmployeeManagementSystem.DTOs

    {

        public class EmployeeBulkUploadDto

        {

            public int Inserted { get; set; }

            public int Updated { get; set; }

            public int Failed { get; set; }

            public List<string> Errors { get; set; } = new List<string>();

        }

    }

}
