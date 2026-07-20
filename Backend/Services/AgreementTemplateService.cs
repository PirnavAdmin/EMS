using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;

using System.Diagnostics;

using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

using iText.IO.Image;
using iText.Kernel.Pdf;

using IOPath = System.IO.Path;
using PdfRectangle = iText.Kernel.Geom.Rectangle;
using PdfImage = iText.Layout.Element.Image;

namespace EmployeeManagementSystem.Services
{
    public class AgreementTemplateService : IAgreementTemplateService
    {
        private readonly IWebHostEnvironment _environment;

        public AgreementTemplateService(
            IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public async Task<string> GenerateAgreementAsync(
            AgreementMaster agreement,
            EmployeeAgreement employeeAgreement,
            Employee employee,
            EmployeePersonalInfo personalInfo)
        {
            var templatePath = IOPath.Combine(
                _environment.WebRootPath,
                agreement.FilePath.TrimStart('/', '\\'));

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException(
                    "Agreement template not found.",
                    templatePath);
            }

            var outputFolder = IOPath.Combine(
                _environment.WebRootPath,
                "SignedAgreements");

            Directory.CreateDirectory(outputFolder);

            var safeAgreementName = string.Concat(
                agreement.AgreementName
                    .Where(c =>
                        !IOPath
                            .GetInvalidFileNameChars()
                            .Contains(c)));

            var uniqueId = Guid.NewGuid()
                .ToString("N");

            var outputFile = IOPath.Combine(
                outputFolder,
                $"{employee.Employee_Id}_" +
                $"{safeAgreementName}_" +
                $"{uniqueId}.docx");

            File.Copy(
                templatePath,
                outputFile,
                true);

            var address =
                $"{personalInfo.HouseNo}, " +
                $"{personalInfo.Street}, " +
                $"{personalInfo.City}, " +
                $"{personalInfo.District}, " +
                $"{personalInfo.State} - " +
                $"{personalInfo.Pincode}, " +
                $"{personalInfo.Country}";

            var now = DateTime.Now;

            var values = new Dictionary<string, string>
            {
                {
                    "{{EmployeeName}}",
                    employee.Name ?? string.Empty
                },
                {
                    "{{EmployeeId}}",
                    employee.Employee_Id ?? string.Empty
                },
                {
                    "{{Address}}",
                    address
                },
                {
                    "{{PanNumber}}",
                    personalInfo.PanNumber ?? string.Empty
                },
                {
                    "{{AadhaarNumber}}",
                    personalInfo.AadhaarNumber ?? string.Empty
                },
                {
                    "{{Designation}}",
                    personalInfo.Designation ?? string.Empty
                },
                {
                    "{{Signature}}",
                    employeeAgreement.SignatureName
                        ?? string.Empty
                },
                {
                    "{{JoiningDate}}",
                    personalInfo.JoiningDate?
                        .ToString("dd-MMM-yyyy")
                        ?? string.Empty
                },
                {
                    "{{Location}}",
                    employeeAgreement.SignedLocation
                        ?? string.Empty
                },
                {
                    "{{SignedDate}}",
                    employeeAgreement.SignedOn?
                        .ToString("dd-MMM-yyyy HH:mm")
                        ?? string.Empty
                },
                {
                    "{{Day}}",
                    now.Day.ToString()
                },
                {
                    "{{Month}}",
                    now.ToString("MMMM")
                },
                {
                    "{{Year}}",
                    now.Year.ToString()
                }
            };

            try
            {
                ReplacePlaceholders(
                    outputFile,
                    values);

                var pdfPath =
                    await ConvertDocxToPdfAsync(
                        outputFile);

                AddSignatureToPdf(
                    pdfPath,
                    employeeAgreement.SignatureImagePath);

                return "/SignedAgreements/" +
                       IOPath.GetFileName(pdfPath);
            }
            finally
            {
                if (File.Exists(outputFile))
                {
                    File.Delete(outputFile);
                }
            }
        }

        private void ReplacePlaceholders(
            string filePath,
            Dictionary<string, string> values)
        {
            using var wordDoc =
                WordprocessingDocument.Open(
                    filePath,
                    true);

            var mainPart = wordDoc.MainDocumentPart
                ?? throw new InvalidOperationException(
                    "Main document part not found.");

            if (mainPart.Document.Body != null)
            {
                ReplaceInContainer(
                    mainPart.Document.Body,
                    values);
            }

            foreach (var headerPart in mainPart.HeaderParts)
            {
                ReplaceInContainer(
                    headerPart.Header,
                    values);

                headerPart.Header.Save();
            }

            foreach (var footerPart in mainPart.FooterParts)
            {
                ReplaceInContainer(
                    footerPart.Footer,
                    values);

                footerPart.Footer.Save();
            }

            mainPart.Document.Save();
        }

        private void ReplaceInContainer(
            OpenXmlElement container,
            Dictionary<string, string> values)
        {
            var paragraphs = container
                .Descendants<Paragraph>()
                .ToList();

            foreach (var paragraph in paragraphs)
            {
                foreach (var item in values)
                {
                    ReplacePlaceholderInParagraph(
                        paragraph,
                        item.Key,
                        item.Value ?? string.Empty);
                }
            }
        }

        private void ReplacePlaceholderInParagraph(
            Paragraph paragraph,
            string placeholder,
            string replacement)
        {
            while (true)
            {
                var textNodes = paragraph
                    .Descendants<Text>()
                    .ToList();

                if (textNodes.Count == 0)
                    return;

                var fullText = string.Concat(
                    textNodes.Select(
                        x => x.Text ?? string.Empty));

                var placeholderStart =
                    fullText.IndexOf(
                        placeholder,
                        StringComparison.Ordinal);

                if (placeholderStart < 0)
                    return;

                var placeholderEnd =
                    placeholderStart +
                    placeholder.Length;

                var currentPosition = 0;

                Text? startTextNode = null;
                Text? endTextNode = null;

                var startOffset = 0;
                var endOffset = 0;

                foreach (var textNode in textNodes)
                {
                    var nodeText =
                        textNode.Text ??
                        string.Empty;

                    var nodeStart =
                        currentPosition;

                    var nodeEnd =
                        nodeStart +
                        nodeText.Length;

                    if (startTextNode == null &&
                        placeholderStart >= nodeStart &&
                        placeholderStart < nodeEnd)
                    {
                        startTextNode =
                            textNode;

                        startOffset =
                            placeholderStart -
                            nodeStart;
                    }

                    if (placeholderEnd > nodeStart &&
                        placeholderEnd <= nodeEnd)
                    {
                        endTextNode =
                            textNode;

                        endOffset =
                            placeholderEnd -
                            nodeStart;

                        break;
                    }

                    currentPosition =
                        nodeEnd;
                }

                if (startTextNode == null ||
                    endTextNode == null)
                {
                    return;
                }

                if (ReferenceEquals(
                    startTextNode,
                    endTextNode))
                {
                    var originalText =
                        startTextNode.Text ??
                        string.Empty;

                    var before =
                        originalText.Substring(
                            0,
                            startOffset);

                    var after =
                        originalText.Substring(
                            endOffset);

                    startTextNode.Text =
                        before +
                        replacement +
                        after;

                    startTextNode.Space =
                        SpaceProcessingModeValues.Preserve;
                }
                else
                {
                    var startOriginal =
                        startTextNode.Text ??
                        string.Empty;

                    var endOriginal =
                        endTextNode.Text ??
                        string.Empty;

                    var before =
                        startOriginal.Substring(
                            0,
                            startOffset);

                    var after =
                        endOriginal.Substring(
                            endOffset);

                    startTextNode.Text =
                        before +
                        replacement;

                    startTextNode.Space =
                        SpaceProcessingModeValues.Preserve;

                    var startFound = false;

                    foreach (var textNode in textNodes)
                    {
                        if (ReferenceEquals(
                            textNode,
                            startTextNode))
                        {
                            startFound = true;
                            continue;
                        }

                        if (!startFound)
                            continue;

                        if (ReferenceEquals(
                            textNode,
                            endTextNode))
                        {
                            textNode.Text =
                                after;

                            textNode.Space =
                                SpaceProcessingModeValues
                                    .Preserve;

                            break;
                        }

                        textNode.Text =
                            string.Empty;
                    }
                }
            }
        }

        private void AddSignatureToPdf(
     string pdfPath,
     string? signaturePath)
        {
            if (string.IsNullOrWhiteSpace(signaturePath))
            {
                return;
            }

            var fullImagePath = IOPath.Combine(
                _environment.WebRootPath,
                signaturePath.TrimStart('/', '\\'));

            if (!File.Exists(fullImagePath))
            {
                throw new FileNotFoundException(
                    "Signature image not found.",
                    fullImagePath);
            }

            var tempPdf = IOPath.Combine(
                IOPath.GetDirectoryName(pdfPath)!,
                $"{Guid.NewGuid():N}.pdf");

            using (var reader =
                   new PdfReader(pdfPath))
            using (var writer =
                   new PdfWriter(tempPdf))
            using (var pdfDoc =
                   new PdfDocument(reader, writer))
            {
                var lastPage =
                    pdfDoc.GetNumberOfPages();

                var page =
                    pdfDoc.GetPage(lastPage);

                PdfRectangle pageSize =
                    page.GetPageSize();

                using var document =
                    new iText.Layout.Document(pdfDoc);

                var imageData =
                    ImageDataFactory.Create(fullImagePath);

                var image = new PdfImage(imageData);

                image.ScaleToFit(110, 45);

                // Place beside employee details
                image.SetFixedPosition(
                    lastPage,
                    180,   // X
                    265    // Y
                );

                document.Add(image);


            }

            File.Delete(pdfPath);

            File.Move(
                tempPdf,
                pdfPath);
        }

        private async Task<string>
            ConvertDocxToPdfAsync(
                string docxPath)
        {
            var outputFolder =
                IOPath.GetDirectoryName(docxPath)
                ?? throw new InvalidOperationException(
                    "Output folder not found.");

            var libreOfficePath =
     Environment.GetEnvironmentVariable("LIBREOFFICE_PATH")
     ?? (OperatingSystem.IsWindows()
         ? @"C:\Program Files\LibreOffice\program\soffice.exe"
         : "/usr/bin/soffice");

            if (!File.Exists(libreOfficePath))
            {
                throw new FileNotFoundException(
                    "LibreOffice executable not found.",
                    libreOfficePath);
            }

            var pdfPath =
                IOPath.ChangeExtension(
                    docxPath,
                    ".pdf");

            if (File.Exists(pdfPath))
            {
                File.Delete(pdfPath);
            }

            var startInfo =
                new ProcessStartInfo
                {
                    FileName =
                        libreOfficePath,

                    Arguments =
                        $"--headless " +
                        $"--convert-to pdf " +
                        $"--outdir \"{outputFolder}\" " +
                        $"\"{docxPath}\"",

                    UseShellExecute =
                        false,

                    CreateNoWindow =
                        true,

                    RedirectStandardOutput =
                        true,

                    RedirectStandardError =
                        true
                };

            using var process =
                new Process
                {
                    StartInfo = startInfo
                };

            process.Start();

            var outputTask =
                process.StandardOutput
                    .ReadToEndAsync();

            var errorTask =
                process.StandardError
                    .ReadToEndAsync();

            await process.WaitForExitAsync();

            var output =
                await outputTask;

            var error =
                await errorTask;

            if (process.ExitCode != 0)
            {
                throw new InvalidOperationException(
                    $"LibreOffice conversion failed. " +
                    $"Exit Code: {process.ExitCode}. " +
                    $"Error: {error}. " +
                    $"Output: {output}");
            }

            if (!File.Exists(pdfPath))
            {
                var files = Directory.GetFiles(outputFolder);

                throw new Exception(
                    $"LibreOffice finished but PDF was not found.\n" + $"Expected : {pdfPath}\n" + $"Output   : {output}\n" + $"Error    : {error}\n" + $"Files in Output Folder:\n" + string.Join("\n", files));
            }

                return pdfPath;
        }

        public async Task<string> ConvertAgreementToPdfAsync(
    string docxPath)
        {
            if (string.IsNullOrWhiteSpace(docxPath))
            {
                throw new ArgumentException(
                    "Agreement document path is required.",
                    nameof(docxPath));
            }

            if (!File.Exists(docxPath))
            {
                throw new FileNotFoundException(
                    "Agreement document not found.",
                    docxPath);
            }

            var extension = IOPath
                .GetExtension(docxPath)
                .ToLowerInvariant();

            if (extension == ".pdf")
            {
                return docxPath;
            }

            if (extension != ".docx")
            {
                throw new NotSupportedException(
                    $"Agreement file type '{extension}' is not supported.");
            }

            return await ConvertDocxToPdfAsync(docxPath);
        }
    }
}