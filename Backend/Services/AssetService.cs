using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

using ClosedXML.Excel;

namespace EmployeeManagementSystem.Services

{

    public class AssetService : IAssetService

    {

        private readonly IUserNotificationService _notificationService;

        private readonly AppDbContext _context;

        public AssetService(

            AppDbContext context,

            IUserNotificationService notificationService)

        {

            _context = context;

            _notificationService = notificationService;

        }

        // ================= CREATE ASSET =================

        public async Task<string> CreateAsset(AssetDto dto)

        {

            var imagePaths = new List<string>();

            if (dto.Images != null && dto.Images.Count > 0)

            {

                foreach (var image in dto.Images)

                {

                    var fileName = Guid.NewGuid().ToString() + Path.GetExtension(image.FileName);

                    var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/assets");

                    if (!Directory.Exists(folder))

                        Directory.CreateDirectory(folder);

                    var filePath = Path.Combine(folder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))

                    {

                        await image.CopyToAsync(stream);

                    }

                    imagePaths.Add("/uploads/assets/" + fileName);

                }

            }

            var asset = new Asset

            {

                AssetName = dto.AssetName,

                SerialNo = dto.SerialNo,

                Status = dto.Status ?? "Available",

                AssignedTo = dto.AssignedTo,

                CreatedAt = DateTime.UtcNow,

                ImagePaths = string.Join(",", imagePaths),

                Description = dto.Description

            };

            _context.Assets.Add(asset);

            await _context.SaveChangesAsync();

            return "Asset created successfully";

        }

        // ================= GET ALL =================

        public async Task<List<Asset>> GetAllAssets()

        {

            return await _context.Assets.ToListAsync();

        }

        // ================= GET BY ID =================

        public async Task<Asset?> GetAssetById(int id)

        {

            return await _context.Assets.FindAsync(id);

        }

        // ================= UPDATE =================

        public async Task<string> UpdateAsset(int id, AssetDto dto)

        {

            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)

                return "Asset not found";

            var imagePaths = new List<string>();

            // Keep old images

            if (!string.IsNullOrWhiteSpace(dto.ExistingImages))

            {

                imagePaths = dto.ExistingImages

                    .Split(",", StringSplitOptions.RemoveEmptyEntries)

                    .Select(x => x.Trim())

                    .Where(x => !string.IsNullOrWhiteSpace(x))

                    .ToList();

            }

            // Add newly uploaded images

            if (dto.Images != null && dto.Images.Count > 0)

            {

                foreach (var image in dto.Images)

                {

                    var fileName = Guid.NewGuid().ToString() + Path.GetExtension(image.FileName);

                    var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/assets");

                    if (!Directory.Exists(folder))

                        Directory.CreateDirectory(folder);

                    var filePath = Path.Combine(folder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))

                    {

                        await image.CopyToAsync(stream);

                    }

                    imagePaths.Add("/uploads/assets/" + fileName);

                }

            }

            asset.AssetName = dto.AssetName;

            asset.SerialNo = dto.SerialNo;

            asset.Status = dto.Status ?? "Available";

            asset.Description = dto.Description;

            // Only changed this logic:

            // Previously employee id was saved only for Assigned status.

            // Now it saves for Assigned, Under Repair, and Available also.

            asset.AssignedTo = dto.AssignedTo;

            asset.ImagePaths = string.Join(",", imagePaths);

            await _context.SaveChangesAsync();

            return "Asset updated successfully";

        }

        // ================= ASSIGN ASSET =================

        public async Task<string> AssignAsset(int id, string employeeId)

        {

            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)

                return "Asset not found";

            asset.AssignedTo = employeeId;

            asset.Status = "Assigned";

            await _context.SaveChangesAsync();

            return "Asset assigned successfully";

        }

        // ================= RETURN ASSET =================

        public async Task<string> ReturnAsset(int id)

        {

            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)

                return "Asset not found";

            asset.AssignedTo = null;

            asset.Status = "Available";

            await _context.SaveChangesAsync();

            return "Asset returned successfully";

        }

        // ================= DELETE =================

        public async Task<string> DeleteAsset(int id)

        {

            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)

                return "Asset not found";

            _context.Assets.Remove(asset);

            await _context.SaveChangesAsync();

            return "Asset deleted successfully";

        }

        public async Task<byte[]> ExportAssetsReport()

        {

            var assets = await _context.Assets

                .AsNoTracking()

                .OrderBy(a => a.AssetName)

                .ToListAsync();

            var assignedAssets = assets

    .Where(x => x.Status == "Assigned")

    .ToList();

            var availableAssets = assets

    .Where(x => x.Status == "Available")

    .ToList();

            var repairAssets = assets

    .Where(x => x.Status == "Under Repair")

    .ToList();

            using var workbook = new XLWorkbook();

            var allAssetsSheet =

                workbook.Worksheets.Add("All Assets");

            var assignedSheet =

    workbook.Worksheets.Add("Assigned Assets");

            var availableSheet =

    workbook.Worksheets.Add("Available Assets");

            var repairSheet =

    workbook.Worksheets.Add("Under Repair Assets");

            repairSheet.Cell(1, 1).Value =

    "Under Repair Assets Report";

            repairSheet.Cell(2, 1).Value =

                $"Report Date : {DateTime.Now:dd-MMM-yyyy}";

            repairSheet.Cell(3, 1).Value =

                $"Total Under Repair Assets : {repairAssets.Count}";

            repairSheet.Cell(5, 1).Value = "Asset Id";

            repairSheet.Cell(5, 2).Value = "Asset Name";

            repairSheet.Cell(5, 3).Value = "Serial No";

            repairSheet.Cell(5, 4).Value = "Status";

            repairSheet.Cell(5, 5).Value = "Assigned To";

            repairSheet.Cell(5, 6).Value = "Description";

            var repairHeader =

    repairSheet.Range(5, 1, 5, 6);

            repairHeader.Style.Font.Bold = true;

            repairHeader.Style.Fill.BackgroundColor =

                XLColor.DarkOrange;

            repairHeader.Style.Font.FontColor =

                XLColor.White;

            int repairRow = 6;

            foreach (var asset in repairAssets)

            {

                repairSheet.Cell(repairRow, 1).Value =

                    asset.Id;

                repairSheet.Cell(repairRow, 2).Value =

                    asset.AssetName;

                repairSheet.Cell(repairRow, 3).Value =

                    asset.SerialNo;

                repairSheet.Cell(repairRow, 4).Value =

                    asset.Status;

                repairSheet.Cell(repairRow, 5).Value =

                    asset.AssignedTo ?? "-";

                repairSheet.Cell(repairRow, 6).Value =

                    asset.Description ?? "-";

                repairRow++;

            }

            repairSheet.Columns()

    .AdjustToContents();

            availableSheet.Cell(1, 1).Value =

    "Available Assets Report";

            availableSheet.Cell(2, 1).Value =

                $"Report Date : {DateTime.Now:dd-MMM-yyyy}";

            availableSheet.Cell(3, 1).Value =

                $"Total Available Assets : {availableAssets.Count}";

            availableSheet.Cell(5, 1).Value = "Asset Id";

            availableSheet.Cell(5, 2).Value = "Asset Name";

            availableSheet.Cell(5, 3).Value = "Serial No";

            availableSheet.Cell(5, 4).Value = "Status";

            availableSheet.Cell(5, 5).Value = "Description";

            var availableHeader =

    availableSheet.Range(5, 1, 5, 5);

            availableHeader.Style.Font.Bold = true;

            availableHeader.Style.Fill.BackgroundColor =

                XLColor.DarkBlue;

            availableHeader.Style.Font.FontColor =

                XLColor.White;

            int availableRow = 6;

            foreach (var asset in availableAssets)

            {

                availableSheet.Cell(availableRow, 1).Value =

                    asset.Id;

                availableSheet.Cell(availableRow, 2).Value =

                    asset.AssetName;

                availableSheet.Cell(availableRow, 3).Value =

                    asset.SerialNo;

                availableSheet.Cell(availableRow, 4).Value =

                    asset.Status;

                availableSheet.Cell(availableRow, 5).Value =

                    asset.Description ?? "-";

                availableRow++;

            }

            availableSheet.Columns()

    .AdjustToContents();

            assignedSheet.Cell(1, 1).Value =

    "Assigned Assets Report";

            assignedSheet.Cell(2, 1).Value =

                $"Report Date : {DateTime.Now:dd-MMM-yyyy}";

            assignedSheet.Cell(3, 1).Value =

                $"Total Assigned Assets : {assignedAssets.Count}";

            assignedSheet.Cell(5, 1).Value = "Employee ID";

            assignedSheet.Cell(5, 2).Value = "Asset Name";

            assignedSheet.Cell(5, 3).Value = "Serial No";

            assignedSheet.Cell(5, 4).Value = "Status";

            assignedSheet.Cell(5, 5).Value = "Image Path";

            assignedSheet.Cell(5, 6).Value = "Description";

            var assignedHeader =

    assignedSheet.Range(5, 1, 5, 7);

            assignedHeader.Style.Font.Bold = true;

            assignedHeader.Style.Fill.BackgroundColor =

                XLColor.DarkGreen;

            assignedHeader.Style.Font.FontColor =

                XLColor.White;

            int assignedRow = 6;

            foreach (var asset in assignedAssets)

            {

                assignedSheet.Cell(assignedRow, 1).Value =

                    asset.AssignedTo ?? "-";

                assignedSheet.Cell(assignedRow, 2).Value =

                    asset.AssetName;

                assignedSheet.Cell(assignedRow, 3).Value =

                    asset.SerialNo;

                assignedSheet.Cell(assignedRow, 4).Value =

                    asset.Status;

                if (!string.IsNullOrEmpty(asset.ImagePaths))

                {

                    var firstImage = asset.ImagePaths

                        .Split(',')

                        .FirstOrDefault();

                    if (!string.IsNullOrEmpty(asset.ImagePaths))

                    {

                        var imageUrl =

                            $"https://localhost:7191{asset.ImagePaths}";

                        assignedSheet.Cell(assignedRow, 5).Value =

                            "View Image";

                        assignedSheet.Cell(assignedRow, 5)

                            .SetHyperlink(new XLHyperlink(imageUrl));

                    }

                    else

                    {

                        assignedSheet.Cell(assignedRow, 5).Value = "-";

                    }

                    assignedRow++;

                }

                assignedSheet.Columns()

        .AdjustToContents();

                allAssetsSheet.Cell(1, 1).Value =

                    "Assets Report";

                allAssetsSheet.Cell(2, 1).Value =

                    $"Report Date : {DateTime.Now:dd-MMM-yyyy}";

                allAssetsSheet.Cell(3, 1).Value =

                    $"Total Assets : {assets.Count}";

                allAssetsSheet.Cell(5, 1).Value = "Asset Id";

                allAssetsSheet.Cell(5, 2).Value = "Asset Name";

                allAssetsSheet.Cell(5, 3).Value = "Serial No";

                allAssetsSheet.Cell(5, 4).Value = "Status";

                allAssetsSheet.Cell(5, 5).Value = "Assigned To";

                allAssetsSheet.Cell(5, 6).Value = "Description";

                allAssetsSheet.Cell(5, 7).Value = "Created Date";

                var header =

                    allAssetsSheet.Range(5, 1, 5, 7);

                header.Style.Font.Bold = true;

                header.Style.Fill.BackgroundColor =

                    XLColor.DarkBlue;

                header.Style.Font.FontColor =

                    XLColor.White;

            }

            int row = 6;

            foreach (var asset in assets)

            {

                allAssetsSheet.Cell(row, 1).Value =

                    asset.Id;

                allAssetsSheet.Cell(row, 2).Value =

                    asset.AssetName;

                allAssetsSheet.Cell(row, 3).Value =

                    asset.SerialNo;

                allAssetsSheet.Cell(row, 4).Value =

                    asset.Status;

                allAssetsSheet.Cell(row, 5).Value =

                    asset.AssignedTo ?? "-";

                allAssetsSheet.Cell(row, 6).Value =

                    asset.Description ?? "-";

                allAssetsSheet.Cell(row, 7).Value =

                    asset.CreatedAt.ToString("dd-MMM-yyyy");

                row++;

            }

            allAssetsSheet.Columns()

    .AdjustToContents();

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return stream.ToArray();

        }

    }

}

