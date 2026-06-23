using Microsoft.AspNetCore.Http;

using System.Collections.Generic;

namespace EmployeeManagementSystem.DTOs

{

    public class AssetDto

    {

        public string AssetName { get; set; } = string.Empty;

        public string SerialNo { get; set; } = string.Empty;

        public string? AssignedTo { get; set; }

        public string? Status { get; set; }

        // new uploaded files

        public List<IFormFile>? Images { get; set; }
        public string? Description { get; set; }

        // old images kept during edit

        public string? ExistingImages { get; set; }

    }

}
