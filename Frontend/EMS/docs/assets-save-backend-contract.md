# Asset Save Backend Contract

The backend API project is not present in this workspace, so the exact controller
line throwing the `500 Internal Server Error` cannot be patched here directly.
This file captures the request contract used by the EMS frontend and the backend
validation/error-handling needed to stop generic 500s during asset create/update.

## Frontend Findings

The asset save flow posts `multipart/form-data` to:

- `POST /api/Assets`
- `PUT /api/Assets/{id}`

The frontend now sends:

- `AssetId` and `Id` on update
- `AssetName`
- `SerialNo`
- `Status`
- `AssignedTo` only when status is `Assigned`
- `EmployeeCode` only when status is `Assigned`
- `EmployeeName` when a matching employee code is found
- repeated `ExistingImagePaths` values for previously saved images
- `ExistingImagePathsJson` when previous images exist
- repeated `Images` file parts for newly uploaded files

The most likely server crash paths, based on the old frontend behavior, are:

1. `AssignedTo` received as an empty string when status is not `Assigned`.
2. `AssignedTo` containing an unknown employee code, causing a null lookup or FK failure.
3. `Images` being null and the backend iterating it without a null check.
4. Serial number uniqueness enforced only at DB level, causing an unhandled `DbUpdateException`.
5. Backend returning raw exceptions instead of validation/conflict responses.

## Recommended DTO

```csharp
public class AssetUpsertRequestDto
{
    public int? AssetId { get; set; }

    [Required]
    public string AssetName { get; set; } = string.Empty;

    [Required]
    public string SerialNo { get; set; } = string.Empty;

    public string? AssignedTo { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }

    [Required]
    public string Status { get; set; } = "Assigned";

    public List<string>? ExistingImagePaths { get; set; } = new();
    public string? ExistingImagePathsJson { get; set; }
    public List<IFormFile>? Images { get; set; } = new();
}
```

## Required Controller Behavior

```csharp
[ApiController]
[Route("api/[controller]")]
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AssetsController> _logger;

    public AssetsController(AppDbContext db, ILogger<AssetsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromForm] AssetUpsertRequestDto request)
    {
        return await SaveInternal(null, request);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromForm] AssetUpsertRequestDto request)
    {
        return await SaveInternal(id, request);
    }

    private async Task<IActionResult> SaveInternal(int? routeId, AssetUpsertRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            request.AssetName = request.AssetName?.Trim() ?? string.Empty;
            request.SerialNo = request.SerialNo?.Trim() ?? string.Empty;
            request.AssignedTo = string.IsNullOrWhiteSpace(request.AssignedTo)
                ? null
                : request.AssignedTo.Trim().ToUpperInvariant();

            var validStatuses = new[] { "Assigned", "Available", "Under Repair" };
            if (!validStatuses.Contains(request.Status))
            {
                return BadRequest(new { message = "Invalid asset status." });
            }

            if (request.Status == "Assigned" && string.IsNullOrWhiteSpace(request.AssignedTo))
            {
                return BadRequest(new { message = "Employee code is required when status is Assigned." });
            }

            if (request.Status != "Assigned")
            {
                request.AssignedTo = null;
            }

            var duplicateSerial = await _db.Assets
                .AnyAsync(asset => asset.SerialNo == request.SerialNo &&
                    (!routeId.HasValue || asset.AssetId != routeId.Value));

            if (duplicateSerial)
            {
                return Conflict(new { message = "Serial number already exists." });
            }

            Employee? employee = null;
            if (!string.IsNullOrWhiteSpace(request.AssignedTo))
            {
                employee = await _db.Employees
                    .SingleOrDefaultAsync(e => e.Employee_Id == request.AssignedTo);

                if (employee == null)
                {
                    return BadRequest(new { message = "Assigned employee code was not found." });
                }
            }

            Asset entity;
            if (routeId.HasValue)
            {
                entity = await _db.Assets.SingleOrDefaultAsync(a => a.AssetId == routeId.Value);
                if (entity == null)
                {
                    return NotFound(new { message = "Asset not found." });
                }
            }
            else
            {
                entity = new Asset();
                _db.Assets.Add(entity);
            }

            entity.AssetName = request.AssetName;
            entity.SerialNo = request.SerialNo;
            entity.Status = request.Status;
            entity.AssignedTo = request.AssignedTo;

            var existingImagePaths = request.ExistingImagePaths ?? new List<string>();
            if (existingImagePaths.Count == 0 && !string.IsNullOrWhiteSpace(request.ExistingImagePathsJson))
            {
                existingImagePaths = JsonSerializer.Deserialize<List<string>>(request.ExistingImagePathsJson) ?? new();
            }

            var uploadedImagePaths = new List<string>();
            foreach (var file in request.Images ?? Enumerable.Empty<IFormFile>())
            {
                if (file == null || file.Length == 0)
                {
                    continue;
                }

                // Save the file and push the resulting relative path into uploadedImagePaths.
            }

            var mergedImagePaths = existingImagePaths
                .Concat(uploadedImagePaths)
                .Where(path => !string.IsNullOrWhiteSpace(path))
                .Distinct()
                .ToList();

            entity.ImagePaths = JsonSerializer.Serialize(mergedImagePaths);

            await _db.SaveChangesAsync();

            return Ok(entity);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Asset save failed during database update.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Asset save failed during database update."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected asset save failure.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Unexpected asset save failure."
            });
        }
    }
}
```

## Response Expectations

The API should return:

- `400 Bad Request` for validation/model binding errors
- `404 Not Found` for updates to a missing asset
- `409 Conflict` for duplicate serial numbers
- `500 Internal Server Error` only for truly unexpected failures

## Debug Checklist

Use this against the backend project/logs:

1. Confirm the create/update action uses `[FromForm]`, not `[FromBody]`.
2. Log `request.AssetName`, `request.SerialNo`, `request.AssignedTo`, `request.Status`.
3. Guard `request.Images` with `?? Enumerable.Empty<IFormFile>()`.
4. If `Status == "Assigned"`, verify the employee exists before saving.
5. If `Status != "Assigned"`, coerce `AssignedTo` to `null`.
6. Catch `DbUpdateException` and inspect inner exception for FK or unique-key failures.
7. Return structured JSON errors so the frontend can show them directly.
