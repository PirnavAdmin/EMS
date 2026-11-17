using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics; //varsha
using System.Runtime.InteropServices; //varsha

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    public class TemplateController : ControllerBase

    {

        private readonly AppDbContext _context;

        public TemplateController(AppDbContext context)

        {

            _context = context;

        }

        //vishnu change

        [HttpGet]

        public async Task<IActionResult> GetTemplates()

        {

            var templates = await _context.TemplateMaster

                .Include(x => x.Module)

                .OrderByDescending(x => x.TemplateId)

                .Select(x => new

                {

                    x.TemplateId,

                    x.Company_Id,

                    x.TemplateCode,

                    x.TemplateName,

                    x.ModuleId,

                    ModuleName = x.Module != null ? x.Module.ModuleName : "",

                    x.FileName,

                    x.FilePath,

                    x.Version,

                    x.IsActive,

                    x.IsDefault,

                    x.CreatedBy,

                    x.CreatedDate

                })

                .ToListAsync();

            return Ok(templates);

        }

        //

        //vishnu change

        [HttpDelete("{id}")]

        public async Task<IActionResult> DeleteTemplate(int id)

        {

            var template = await _context.TemplateMaster.FindAsync(id);

            if (template == null)

                return NotFound("Template not found.");

            // Delete physical file

            if (!string.IsNullOrEmpty(template.FilePath))

            {

                var physicalPath = Path.Combine(

                    Directory.GetCurrentDirectory(),

                    "wwwroot",

                    template.FilePath.TrimStart('/'));

                if (System.IO.File.Exists(physicalPath))

                {

                    System.IO.File.Delete(physicalPath);

                }

            }

            _context.TemplateMaster.Remove(template);

            await _context.SaveChangesAsync();

            return Ok("Template deleted successfully.");

        }

        //

        //vishnu change

        [HttpPut("set-default/{id}")]

        public async Task<IActionResult> SetDefaultTemplate(int id)

        {

            var template = await _context.TemplateMaster

                .FirstOrDefaultAsync(x => x.TemplateId == id);

            if (template == null)

                return NotFound("Template not found.");

            // Remove default from other templates of same module/company

            var templates = await _context.TemplateMaster

                .Where(x =>

                    x.Company_Id == template.Company_Id &&

                    x.ModuleId == template.ModuleId &&

                    x.IsActive)

                .ToListAsync();

            foreach (var item in templates)

            {

                item.IsDefault = false;

            }

            // Set selected template as default

            template.IsDefault = true;

            await _context.SaveChangesAsync();

            return Ok(new

            {

                Message = "Template set as default successfully.",

                TemplateId = template.TemplateId,

                TemplateName = template.TemplateName,

                Version = template.Version

            });

        }

        [HttpPost]

        public async Task<IActionResult> UploadTemplate(

     IFormFile file,

     [FromForm] string templateName,

     [FromForm] int moduleId,

     [FromForm] string version,

     [FromForm] int companyId = 1)

        //

        {

            if (file == null || file.Length == 0)

                return BadRequest("Please select a template file.");

            //vishnu change

            Console.WriteLine($"ModuleId = {moduleId}");

            Console.WriteLine($"TemplateName = {templateName}");

            Console.WriteLine($"Version = {version}");

            Console.WriteLine($"CompanyId = {companyId}");

            Console.WriteLine($"Received ModuleId = {moduleId}");

            var module = await _context.TemplateModuleMaster

                .FirstOrDefaultAsync(x => x.ModuleId == moduleId);

            if (module == null)

            {

                return BadRequest($"Module not found. ModuleId = {moduleId}");

            }

            if (!module.IsActive)

            {

                return BadRequest($"Module exists but IsActive = false. ModuleId = {moduleId}");

            }

            var extension = Path.GetExtension(file.FileName).ToLower();

            var allowedExtensions = new[] { ".docx", ".doc", ".pdf" };

            if (!allowedExtensions.Contains(extension))

            {

                return BadRequest("Only DOC, DOCX and PDF files are allowed.");

            }

            bool templateExists = await _context.TemplateMaster.AnyAsync(x =>

    x.Company_Id == companyId &&

    x.ModuleId == moduleId &&

    x.Version == version);

            if (templateExists)

            {

                return BadRequest("A template with the same version already exists for this module.");

            }





            //

            var uploadFolder = Path.Combine(

                Directory.GetCurrentDirectory(),

                "wwwroot",

                "uploads",

                "templates");

            if (!Directory.Exists(uploadFolder))

                Directory.CreateDirectory(uploadFolder);

            var cleanVersion = version.ToUpper().Replace("V", "");

            var fileName =

                $"{module.ModuleCode}_V{cleanVersion}_{Guid.NewGuid()}{extension}"; //vishnu change

            var filePath = Path.Combine(uploadFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))

            {

                await file.CopyToAsync(stream);

            }

            var template = new TemplateMaster

            {

                Company_Id = companyId,

                TemplateName = templateName,

                TemplateCode = module.ModuleCode,

                ModuleId = moduleId,

                FileName = file.FileName,

                FilePath = "/uploads/templates/" + fileName,

                Version = version,

                IsActive = true,

                IsDefault = false,

                CreatedBy = "Admin",

                CreatedDate = DateTime.Now

            };

            _context.TemplateMaster.Add(template);

            await _context.SaveChangesAsync();

            return Ok(new

            {

                Message = "Template uploaded successfully.",

                TemplateId = template.TemplateId,

                TemplatePath = template.FilePath

            });

        }

        // Settings -> Templates -> Download as PDF //varsha
        [HttpGet("download/{id}")]
        public async Task<IActionResult> DownloadTemplate(int id)
        {
            var template = await _context.TemplateMaster.FindAsync(id); //varsha
            if (template == null) //varsha
                return NotFound("Template not found."); //varsha

            if (string.IsNullOrWhiteSpace(template.FilePath)) //varsha
                return NotFound("Template file path is missing."); //varsha

            var path = Path.Combine( //varsha
                Directory.GetCurrentDirectory(), //varsha
                "wwwroot", //varsha
                template.FilePath.TrimStart('/', '\\')); //varsha

            if (!System.IO.File.Exists(path)) //varsha
            {
                var directPath = Path.Combine(Directory.GetCurrentDirectory(), template.FilePath.TrimStart('/', '\\')); //varsha
                if (System.IO.File.Exists(directPath)) //varsha
                {
                    path = directPath; //varsha
                }
                else if (!string.IsNullOrWhiteSpace(template.FileName)) //varsha
                {
                    var templatesPath = Path.Combine(Directory.GetCurrentDirectory(), "Templates", template.FileName); //varsha
                    if (System.IO.File.Exists(templatesPath)) //varsha
                    {
                        path = templatesPath; //varsha
                    }
                }
            }

            if (!System.IO.File.Exists(path)) //varsha
                return NotFound("File not found."); //varsha

            var baseFileName = !string.IsNullOrWhiteSpace(template.FileName) //varsha
                ? Path.GetFileNameWithoutExtension(template.FileName) //varsha
                : (!string.IsNullOrWhiteSpace(template.TemplateName) ? template.TemplateName : "Template"); //varsha
            var downloadPdfName = $"{baseFileName}.pdf"; //varsha

            var extension = Path.GetExtension(path).ToLowerInvariant(); //varsha
            if (extension == ".pdf") //varsha
            {
                var pdfBytes = await System.IO.File.ReadAllBytesAsync(path); //varsha
                return File(pdfBytes, "application/pdf", downloadPdfName); //varsha
            }

            // Convert DOCX / DOC to PDF using LibreOffice //varsha
            var runId = Guid.NewGuid().ToString("N"); //varsha
            var tempFolder = Path.Combine(Directory.GetCurrentDirectory(), "Temp", "Templates", runId); //varsha
            if (!Directory.Exists(tempFolder)) //varsha
                Directory.CreateDirectory(tempFolder); //varsha

            var tempDocxPath = Path.Combine(tempFolder, $"{baseFileName}{extension}"); //varsha
            var tempPdfPath = Path.ChangeExtension(tempDocxPath, ".pdf"); //varsha
            var profileFolder = Path.Combine(tempFolder, "LO_Profile"); //varsha
            var profileUri = "file:///" + profileFolder.Replace('\\', '/'); //varsha

            try //varsha
            {
                System.IO.File.Copy(path, tempDocxPath, true); //varsha

                var sofficePath = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) //varsha
                    ? @"C:\Program Files\LibreOffice\program\soffice.exe" //varsha
                    : "/usr/bin/soffice"; //varsha

                using (var process = new Process()) //varsha
                {
                    process.StartInfo.FileName = sofficePath; //varsha
                    process.StartInfo.Arguments = $"-env:UserInstallation=\"{profileUri}\" --headless --nologo --nofirststartwizard --convert-to pdf \"{tempDocxPath}\" --outdir \"{tempFolder}\""; //varsha
                    process.StartInfo.RedirectStandardOutput = true; //varsha
                    process.StartInfo.RedirectStandardError = true; //varsha
                    process.StartInfo.UseShellExecute = false; //varsha
                    process.StartInfo.CreateNoWindow = true; //varsha

                    process.Start(); //varsha
                    await process.WaitForExitAsync(); //varsha
                }

                if (!System.IO.File.Exists(tempPdfPath)) //varsha
                {
                    return StatusCode(500, "PDF generation failed. LibreOffice conversion did not produce output."); //varsha
                }

                var convertedPdfBytes = await System.IO.File.ReadAllBytesAsync(tempPdfPath); //varsha
                return File(convertedPdfBytes, "application/pdf", downloadPdfName); //varsha
            }
            catch (Exception ex) //varsha
            {
                return StatusCode(500, $"PDF conversion error: {ex.Message}"); //varsha
            }
            finally //varsha
            {
                try //varsha
                {
                    if (Directory.Exists(tempFolder)) //varsha
                        Directory.Delete(tempFolder, true); //varsha
                }
                catch { } //varsha
            }
        }

    }

}
