using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.BackgroundServices;
using EmployeeManagementSystem.Controllers;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.HostedServices;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using QuestPDF.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using QuestPDF.Infrastructure;
using System.Text;
using Hangfire;
using Hangfire.MySql;

var builder = WebApplication.CreateBuilder(args);

// ================= SERVICES =================

builder.Services.AddControllers();





builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options => {
        options.SuppressModelStateInvalidFilter = true;
    });

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddScoped<JwtHelper>();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection")),
        mysqlOptions =>
        {
            mysqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
        });
});
builder.Services.AddHangfire(config =>
{
    config.UseStorage(
        new MySqlStorage(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            new MySqlStorageOptions()
        ));
});

builder.Services.AddHangfireServer();
builder.Services.AddScoped<IOfferLetterService, OfferLetterService>();

builder.Services.AddScoped<IPaySlipService, PaySlipService>();

builder.Services.AddScoped<IDashboardService, DashboardService>();

builder.Services.AddScoped<IAttendanceService, AttendanceService>();

builder.Services.AddScoped<IEmployeeService, EmployeeService>();

builder.Services.AddScoped<IEmployeeLeaveService, EmployeeLeaveService>();

builder.Services.AddScoped<ITaskManagementService, TaskManagementService>();

builder.Services.AddScoped<IAssetService, AssetService>();

builder.Services.AddScoped<IUserNotificationService, UserNotificationService>();

builder.Services.AddScoped<IUserDashboardService, UserDashboardService>();

builder.Services.AddScoped<IAdminNotificationService, AdminNotificationService>();

builder.Services.AddScoped<IRolePermissionService, RolePermissionService>();

builder.Services.AddScoped<IRoleService, RoleService>();

builder.Services.AddScoped<ReportsService>();

builder.Services.AddScoped<IManualPayslipService, ManualPayslipService>();

builder.Services.AddHostedService<AutoCheckoutService>();

builder.Services.AddScoped<ExperienceOfferLetterService>();
builder.Services.AddScoped<ITeamService, TeamService>();

builder.Services.AddScoped<ModuleSearchService>();
builder.Services.AddScoped<
    IEmployeeDocumentService,
    EmployeeDocumentService>();
builder.Services.AddScoped<ILeaveBalanceService, LeaveBalanceService>();
builder.Services.AddScoped<ITicketService, TicketService>();

//builder.Services.AddHostedService<TicketAssignmentHostedService>();
builder.Services.AddScoped<ITicketAssignmentEngine, TicketAssignmentEngine>();
builder.Services.AddScoped<ITicketOverdueService, TicketOverdueService>();
builder.Services.AddHostedService<TicketOverdueBackgroundService>();

builder.Services.AddScoped<IAgreementService, AgreementService>();
builder.Services.AddScoped<IAgreementTemplateService, AgreementTemplateService>();
builder.Services.AddScoped<IAdminAuthorizationService, AdminAuthorizationService>();

builder.Services.AddScoped<IRelievingLetterService, RelievingLetterService>();
builder.Services.AddScoped<IUserPermissionService, UserPermissionService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IBrandingService, BrandingService>();

builder.Services.AddScoped<IFileStorageService, FileStorageService>();

builder.Services.AddScoped<IForm16Service, Form16Service>();

builder.Services.AddScoped<IEmployeeResignationService, EmployeeResignationService>();

builder.Services.AddScoped<IEmployeeClearanceService, EmployeeClearanceService>();

builder.Services.AddScoped<IExitInterviewService, ExitInterviewService>();

builder.Services.AddScoped<IFullFinalSettlementService, FullFinalSettlementService>();

builder.Services.AddScoped<IWorkflowEngineService, WorkflowEngineService>();

builder.Services.AddScoped<IShiftService, ShiftService>();

builder.Services.AddScoped<IEmployeeShiftService, EmployeeShiftService>();

builder.Services.AddScoped<IShiftRosterService, ShiftRosterService>();

builder.Services.AddScoped<IShiftPlannerService, ShiftPlannerService>();

builder.Services.AddScoped<IShiftSwapService, ShiftSwapService>();

builder.Services.AddScoped<IShiftChangeRequestService, ShiftChangeRequestService>();

builder.Services.AddScoped<IEmployeeWeeklyOffService, EmployeeWeeklyOffService>();

builder.Services.AddScoped<IShiftRotationService, ShiftRotationService>();
builder.Services.AddScoped<ISuperAdminService, SuperAdminService>();
builder.Services.AddScoped<IAdminPermissionService, AdminPermissionService>();
builder.Services.AddScoped<
    IAdminSubscriptionService,
    AdminSubscriptionService>();

builder.Services.AddScoped<
    IExperienceLetterService,
    ExperienceLetterService>();
builder.Services.AddScoped<
    IEmployeeSalaryStructureService,
    EmployeeSalaryStructureService>();

builder.Services.AddScoped<ITemplateService, TemplateService>(); //Vishnu change
//builder.Services.AddScoped<PermissionFilter>();
// ================= CORS =================

var configuredCorsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>();

var allowedCorsOrigins = configuredCorsOrigins is { Length: > 0 }
    ? configuredCorsOrigins
    : new[]
    {
        "https://hrms.pirnav.com",
        "http://localhost:3000",
        "http://localhost:4200",
        "http://localhost:5173",
         "http://localhost:5174",
          "http://localhost:8801",
        "https://test.hrms.pirnav.com",
         "https://www.test.hrms.pirnav.com"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        if (allowedCorsOrigins.Contains("*"))
        {
            policy.SetIsOriginAllowed(_ => true);
        }
        else
        {
            policy.WithOrigins(allowedCorsOrigins);
        }

        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ================= JWT =================

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)

    .AddJwtBearer(options =>

    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters

        {

            ValidateIssuer = true,

            ValidateAudience = true,

            ValidateLifetime = true,

            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(

                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)

            ),

            RoleClaimType = ClaimTypes.Role,

            NameClaimType = "EmployeeId"

        };

    });

builder.Services.AddAuthorization();

// ================= SWAGGER =================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>

{

    options.SwaggerDoc("v1", new OpenApiInfo

    {

        Title = "Employee Management System API",

        Version = "v1"

    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme

    {

        Name = "Authorization",

        Type = SecuritySchemeType.Http,

        Scheme = "bearer",

        BearerFormat = "JWT",

        In = ParameterLocation.Header,

        Description = "Enter: Bearer {your JWT token}"

    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement

    {

        {

            new OpenApiSecurityScheme

            {

                Reference = new OpenApiReference

                {

                    Type = ReferenceType.SecurityScheme,

                    Id = "Bearer"

                }

            },

            new string[] {}

        }

    });

});

// ================= BUILD =================
QuestPDF.Settings.License = LicenseType.Community;

Console.WriteLine(builder.Configuration.GetConnectionString("DefaultConnection"));
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        Console.WriteLine("Testing database connection...");

        if (db.Database.CanConnect())
        {
            Console.WriteLine("Database Connected Successfully.");
        }
        else
        {
            Console.WriteLine("Database Connection Failed.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine(ex.ToString());
    }
}
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto
});

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowAll");

app.UseSwagger();

app.UseSwaggerUI();
app.UseHangfireDashboard("/hangfire");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
