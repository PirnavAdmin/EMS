using System.ComponentModel.DataAnnotations;

public class FileStorage
{
    [Key]
    public int FileId { get; set; }

    public int Company_Id { get; set; }

    public string ModuleName { get; set; }

    public string FileCategory { get; set; }

    public string OriginalFileName { get; set; }

    public string SavedFileName { get; set; }

    public string FilePath { get; set; }

    public string FileExtension { get; set; }

    public long FileSize { get; set; }

    public string MimeType { get; set; }

    public string UploadedBy { get; set; }

    public DateTime UploadedDate { get; set; }

    public bool IsActive { get; set; }
}