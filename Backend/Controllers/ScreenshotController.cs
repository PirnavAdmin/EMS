using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScreenshotController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ScreenshotController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // UPLOAD SCREENSHOT
        // =========================================

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(
            [FromBody] ScreenshotUploadDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new
                    {
                        message = "Invalid request"
                    });
                }

                if (string.IsNullOrEmpty(dto.Image))
                {
                    return BadRequest(new
                    {
                        message = "Image is required"
                    });
                }

                // REMOVE BASE64 PREFIX IF EXISTS

                var base64Data = dto.Image;

                if (dto.Image.Contains(","))
                {
                    base64Data = dto.Image.Split(',')[1];
                }

                // CREATE EMPLOYEE FOLDER

                var folderPath = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "NewFolder1",
                    dto.EmployeeId
                );

                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                // GENERATE FILE NAME

                var fileName =
                    $"{DateTime.Now:yyyyMMddHHmmss}.png";

                var filePath = Path.Combine(
                    folderPath,
                    fileName
                );

                // CONVERT BASE64 TO BYTE ARRAY

                var imageBytes =
                    Convert.FromBase64String(base64Data);

                // SAVE FILE

                await System.IO.File.WriteAllBytesAsync(
                    filePath,
                    imageBytes
                );

                // SAVE DB RECORD

                var screenshot = new EmployeeScreenshot
                {
                    EmployeeId = dto.EmployeeId,

                    ScreenshotPath =
                        $"/NewFolder1/{dto.EmployeeId}/{fileName}",

                    DeviceName = dto.DeviceName,

                    MonitoringStatus = "Active",

                    CapturedAt = DateTime.Now,

                    CreatedAt = DateTime.Now
                };

                _context.EmployeeScreenshots.Add(screenshot);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Screenshot uploaded successfully",

                    imageUrl =
                        screenshot.ScreenshotPath
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }

        // =========================================
        // GET SCREENSHOT HISTORY
        // =========================================

        [HttpGet("history/{employeeId}")]
        public async Task<IActionResult> GetHistory(
            string employeeId)
        {
            var screenshots =
                await _context.EmployeeScreenshots
                    .Where(x => x.EmployeeId == employeeId)
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new
                    {
                        x.Id,

                        imageUrl = x.ScreenshotPath,

                        x.DeviceName,

                        x.MonitoringStatus,

                        x.CapturedAt
                    })
                    .ToListAsync();

            return Ok(screenshots);
        }

        // =========================================
        // GET SINGLE SCREENSHOT
        // =========================================

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var screenshot =
                await _context.EmployeeScreenshots
                    .FirstOrDefaultAsync(x => x.Id == id);

            if (screenshot == null)
            {
                return NotFound(new
                {
                    message = "Screenshot not found"
                });
            }

            return Ok(screenshot);
        }
        // =========================================
        // DELETE ALL SCREENSHOTS OF EMPLOYEE
        // =========================================

        [HttpDelete("employee/{employeeId}")]
        public async Task<IActionResult> DeleteEmployeeScreenshots(
            string employeeId)
        {
            try
            {
                var screenshots =
                    await _context.EmployeeScreenshots
                        .Where(x => x.EmployeeId == employeeId)
                        .ToListAsync();

                if (!screenshots.Any())
                {
                    return NotFound(new
                    {
                        message = "No screenshots found"
                    });
                }

                // DELETE FILES

                foreach (var screenshot in screenshots)
                {
                    var physicalPath = Path.Combine(
                        Directory.GetCurrentDirectory(),
                        "wwwroot",
                        screenshot.ScreenshotPath.TrimStart('/')
                    );

                    if (System.IO.File.Exists(physicalPath))
                    {
                        System.IO.File.Delete(physicalPath);
                    }
                }

                // DELETE DB RECORDS

                _context.EmployeeScreenshots.RemoveRange(screenshots);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message =
                        "Employee screenshots deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message =
                        ex.InnerException?.Message
                        ?? ex.Message
                });
            }
        }


        // =========================================
        // DELETE OLD SCREENSHOTS
        // =========================================

        [HttpDelete("cleanup/{days}")]
        public async Task<IActionResult> CleanupOldScreenshots(
            int days)
        {
            try
            {
                var cutoffDate =
                    DateTime.Now.AddDays(-days);

                var screenshots =
                    await _context.EmployeeScreenshots
                        .Where(x => x.CreatedAt < cutoffDate)
                        .ToListAsync();

                // DELETE FILES

                foreach (var screenshot in screenshots)
                {
                    var physicalPath = Path.Combine(
                        Directory.GetCurrentDirectory(),
                        "wwwroot",
                        screenshot.ScreenshotPath.TrimStart('/')
                    );

                    if (System.IO.File.Exists(physicalPath))
                    {
                        System.IO.File.Delete(physicalPath);
                    }
                }

                // DELETE DB RECORDS

                _context.EmployeeScreenshots.RemoveRange(screenshots);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    deletedCount = screenshots.Count,

                    message =
                        "Old screenshots cleaned successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message =
                        ex.InnerException?.Message
                        ?? ex.Message
                });
            }
        }


        // =========================================
        // SCREENSHOT STATISTICS
        // =========================================

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            var today = DateTime.Today;

            var totalScreenshots =
                await _context.EmployeeScreenshots
                    .CountAsync();

            var screenshotsToday =
                await _context.EmployeeScreenshots
                    .Where(x => x.CreatedAt.Date == today)
                    .CountAsync();

            var monitoredEmployees =
                await _context.EmployeeScreenshots
                    .Select(x => x.EmployeeId)
                    .Distinct()
                    .CountAsync();

            return Ok(new
            {
                totalScreenshots,

                screenshotsToday,

                monitoredEmployees
            });
        }
        // =========================================
        // DELETE SCREENSHOT
        // =========================================

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var screenshot =
                await _context.EmployeeScreenshots
                    .FirstOrDefaultAsync(x => x.Id == id);

            if (screenshot == null)
            {
                return NotFound(new
                {
                    message = "Screenshot not found"
                });
            }

            // DELETE FILE FROM SERVER

            var physicalPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                screenshot.ScreenshotPath.TrimStart('/')
            );

            if (System.IO.File.Exists(physicalPath))
            {
                System.IO.File.Delete(physicalPath);
            }

            // DELETE DB RECORD

            _context.EmployeeScreenshots.Remove(screenshot);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Screenshot deleted successfully"
            });
        }
    }
}