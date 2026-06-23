# Offer Letter Salary Structure Backend Contract

This frontend now sends a full `salaryStructure` object with manual override metadata.
The backend project is not present in this workspace, so this file captures the exact
DTO/controller/PDF integration expected by the updated UI.

## Request Payload

```json
{
  "candidate_Name": "Asha Sharma",
  "email": "asha@example.com",
  "address": "Flat 12, MG Road, Bengaluru",
  "position": "Frontend Developer",
  "joining_Date": "2026-05-20",
  "ctc_Annual": 420000,
  "basic": 168000,
  "hra": 84000,
  "conveyance": 19200,
  "medicalAllowance": 15000,
  "otherAllowance": 133800,
  "totalCtc": 420000,
  "manualOverrideFields": ["otherAllowance"],
  "salaryStructure": {
    "annualCtc": 420000,
    "basic": 168000,
    "hra": 84000,
    "conveyance": 19200,
    "medicalAllowance": 15000,
    "otherAllowance": 133800,
    "totalCtc": 420000,
    "manualOverrideFields": ["otherAllowance"]
  }
}
```

## DTOs

```csharp
public class SalaryStructureDto
{
    public decimal AnnualCtc { get; set; }
    public decimal Basic { get; set; }
    public decimal Hra { get; set; }
    public decimal Conveyance { get; set; }
    public decimal MedicalAllowance { get; set; }
    public decimal OtherAllowance { get; set; }
    public decimal TotalCtc { get; set; }
    public List<string> ManualOverrideFields { get; set; } = new();
}

public class GenerateOfferLetterRequestDto
{
    public string Candidate_Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public DateOnly Joining_Date { get; set; }
    public decimal Ctc_Annual { get; set; }
    public decimal Basic { get; set; }
    public decimal Hra { get; set; }
    public decimal Conveyance { get; set; }
    public decimal MedicalAllowance { get; set; }
    public decimal OtherAllowance { get; set; }
    public decimal TotalCtc { get; set; }
    public List<string> ManualOverrideFields { get; set; } = new();
    public SalaryStructureDto SalaryStructure { get; set; } = new();
}

public class SalaryStructureCalculationRequestDto
{
    public decimal AnnualCtc { get; set; }
    public decimal Basic { get; set; }
    public decimal Hra { get; set; }
    public decimal Conveyance { get; set; }
    public decimal MedicalAllowance { get; set; }
    public decimal OtherAllowance { get; set; }
    public List<string> ManualOverrideFields { get; set; } = new();
}
```

## Calculation Endpoint

Route expected by the frontend:

```csharp
[HttpPost("calculate-salary-breakup")]
public ActionResult<SalaryStructureDto> CalculateSalaryBreakup(
    [FromBody] SalaryStructureCalculationRequestDto request)
{
    var annualCtc = request.AnnualCtc;

    var basic = request.ManualOverrideFields.Contains("basic")
        ? request.Basic
        : Math.Round(annualCtc * 0.40m, 0);

    var hra = request.ManualOverrideFields.Contains("hra")
        ? request.Hra
        : Math.Round(annualCtc * 0.20m, 0);

    var conveyance = request.ManualOverrideFields.Contains("conveyance")
        ? request.Conveyance
        : 19200m;

    var medicalAllowance = request.ManualOverrideFields.Contains("medicalAllowance")
        ? request.MedicalAllowance
        : 15000m;

    var otherAllowance = request.ManualOverrideFields.Contains("otherAllowance")
        ? request.OtherAllowance
        : annualCtc - (basic + hra + conveyance + medicalAllowance);

    otherAllowance = Math.Max(otherAllowance, 0);

    var total = basic + hra + conveyance + medicalAllowance + otherAllowance;

    if (total > annualCtc)
    {
        return BadRequest("Salary breakup total cannot exceed Annual CTC.");
    }

    return Ok(new SalaryStructureDto
    {
        AnnualCtc = annualCtc,
        Basic = basic,
        Hra = hra,
        Conveyance = conveyance,
        MedicalAllowance = medicalAllowance,
        OtherAllowance = otherAllowance,
        TotalCtc = total,
        ManualOverrideFields = request.ManualOverrideFields
    });
}
```

## Generate Offer Letter Endpoint

```csharp
[HttpPost("Generate")]
public async Task<IActionResult> GenerateOfferLetter(
    [FromBody] GenerateOfferLetterRequestDto request)
{
    if (request.SalaryStructure.TotalCtc > request.Ctc_Annual)
    {
        return BadRequest("Salary breakup total cannot exceed Annual CTC.");
    }

    var offerLetter = new OfferLetter
    {
        Candidate_Name = request.Candidate_Name,
        Email = request.Email,
        Address = request.Address,
        Position = request.Position,
        Joining_Date = request.Joining_Date.ToDateTime(TimeOnly.MinValue),
        Ctc_Annual = request.Ctc_Annual,
        Basic = request.SalaryStructure.Basic,
        Hra = request.SalaryStructure.Hra,
        Conveyance = request.SalaryStructure.Conveyance,
        MedicalAllowance = request.SalaryStructure.MedicalAllowance,
        OtherAllowance = request.SalaryStructure.OtherAllowance,
        TotalCtc = request.SalaryStructure.TotalCtc,
        ManualOverrideFields = JsonSerializer.Serialize(
            request.SalaryStructure.ManualOverrideFields)
    };

    _dbContext.OfferLetters.Add(offerLetter);
    await _dbContext.SaveChangesAsync();

    return Ok(offerLetter);
}
```

## Employee Save Extension

When saving employees, accept the same optional salary structure fields:

```csharp
public decimal? Basic { get; set; }
public decimal? Hra { get; set; }
public decimal? Conveyance { get; set; }
public decimal? MedicalAllowance { get; set; }
public decimal? OtherAllowance { get; set; }
public decimal? TotalCtc { get; set; }
public SalaryStructureDto? SalaryStructure { get; set; }
```

## PDF Template Fields

The generated offer letter PDF should render:

- Annual CTC
- Basic
- HRA
- Conveyance
- Medical Allowance
- Other Allowance
- Total CTC

Recommended table rows:

```text
Annual CTC            ₹4,20,000
Basic                 ₹1,68,000
HRA                   ₹84,000
Conveyance            ₹19,200
Medical Allowance     ₹15,000
Other Allowance       ₹1,33,800
Total CTC             ₹4,20,000
```
