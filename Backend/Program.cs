using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.BackgroundServices;
using EmployeeManagementSystem.Controllers;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.HostedServices;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Hangfire;
using Hangfire.MySql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Builder.Extensions;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using QuestPDF.Infrastructure;
using QuestPDF.Infrastructure;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

//// ================= FIREBASE CONFIGURATION =================

//// Firebase configuration for Mobile Push Notifications
//const string firebaseProjectId = "peoplehrsync";

//var firebaseCredentialsPath =
//    Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_PATH")
//    ?? builder.Configuration["Firebase:CredentialsPath"]
//    ?? (builder.Environment.IsDevelopment() ? null : "/run/secrets/firebase-admin.json");

//if (!string.IsNullOrEmpty(firebaseCredentialsPath) && File.Exists(firebaseCredentialsPath))
//{
//    try
//    {
//        FirebaseApp.Create(new AppOptions
//        {
//            Credential = GoogleCredential.FromFile(firebaseCredentialsPath),
//            ProjectId = firebaseProjectId
//        });

//        Console.WriteLine(
//            $"Firebase initialized for project: {firebaseProjectId}");

//        builder.Services.AddSingleton<FirebaseMessaging>(
//            _ => FirebaseMessaging.DefaultInstance);
//    }

// ================= FIREBASE CONFIGURATION =================

// Firebase configuration for Mobile Push Notifications
const string firebaseProjectId = "peoplehrsync";

var firebaseCredentialsPath =
    Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_PATH")
    ?? builder.Configuration["Firebase:CredentialsPath"]
    ?? (builder.Environment.IsDevelopment()
        ? null
        : "/run/secrets/firebase-admin.json");

if (!string.IsNullOrEmpty(firebaseCredentialsPath)
    && File.Exists(firebaseCredentialsPath))
{
    try
    {
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromFile(firebaseCredentialsPath),
            ProjectId = firebaseProjectId
        });

        Console.WriteLine(
            $"Firebase initialized for project: {firebaseProjectId}");

        builder.Services.AddSingleton<FirebaseMessaging>(
            _ => FirebaseMessaging.DefaultInstance);
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            $"[Firebase Error] Failed to initialize Firebase: {ex.Message}");
    }
}

//    catch (Exception ex)
//    {
//        Console.WriteLine($"[Firebase Error] Failed to initialize Firebase: {ex.Message}");
//    }
//}
//else
//{
//    if (builder.Environment.IsDevelopment())
//    {
//        Console.WriteLine(
//            $"[Firebase Notice] Firebase credentials file not found at '{firebaseCredentialsPath ?? "not configured"}'. Mobile push notifications will be disabled in local development.");
//    }
//    else
//    {
//        throw new FileNotFoundException(
//            "Firebase service-account JSON file not found.",
//            firebaseCredentialsPath ?? "/run/secrets/firebase-admin.json");
//    }
//}


// ================= SERVICES =================

builder.Services.AddControllers();





builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options => {
        options.SuppressModelStateInvalidFilter = true;
    });

builder.Services.AddHttpContextAccessor();

// Protect sender-account SMTP passwords at rest. Configure DataProtection:KeysPath to a persistent, access-restricted volume in production.
var dataProtectionKeysPath = builder.Configuration["DataProtection:KeysPath"];
var dataProtectionBuilder = builder.Services.AddDataProtection()
    .SetApplicationName("EmployeeManagementSystem");
if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    Directory.CreateDirectory(dataProtectionKeysPath);
    dataProtectionBuilder.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
}

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddScoped<JwtHelper>();

builder.Services.AddMemoryCache();
builder.Services.AddScoped<ITenantProvider, TenantProvider>();

var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));

builder.Services.AddDbContext<MasterDbContext>(options =>
{
    var masterConn = builder.Configuration.GetConnectionString("MasterConnection")
        ?? throw new InvalidOperationException("MasterConnection string is not configured in appsettings.json.");
    options.UseMySql(
        masterConn,
        serverVersion,
        mysqlOptions =>
        {
            mysqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
        });
});

builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
{
    var tenantProvider = serviceProvider.GetRequiredService<ITenantProvider>();
    var connStr = tenantProvider.GetTenantConnectionString();
    if (string.IsNullOrWhiteSpace(connStr))
    {
        connStr = builder.Configuration.GetConnectionString("MasterConnection")!;
    }
    options.UseMySql(
        connStr,
        serverVersion,
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
    var masterConn = builder.Configuration.GetConnectionString("MasterConnection")
        ?? throw new InvalidOperationException("MasterConnection string is not configured in appsettings.json.");
    config.UseStorage(
        new MySqlStorage(
            masterConn,
            new MySqlStorageOptions
            {
                PrepareSchemaIfNecessary = true,
                QueuePollInterval = TimeSpan.FromSeconds(15)
            }
        ));
});

builder.Services.AddHangfireServer();
builder.Services.AddScoped<IOfferLetterService, OfferLetterService>();

builder.Services.AddScoped<IPaySlipService, PaySlipService>();

builder.Services.AddScoped<IDashboardService, DashboardService>();

builder.Services.AddScoped<IAttendanceService, AttendanceService>();

builder.Services.AddScoped<LocationMismatchEmailJobService>();

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

//builder.Services.AddHostedService<AutoCheckoutService>();

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
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddHostedService<BirthdayEmailService>();
builder.Services.AddScoped<
    IFcmNotificationService,
    FcmNotificationService>();
builder.Services.AddScoped<ITemplateService, TemplateService>();
builder.Services.AddScoped<
    IAppraisalSalaryService,
    AppraisalSalaryService>();//Vishnu change
                              //builder.Services.AddScoped<PermissionFilter>();
                              // ================= CORS =================

var configuredCorsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>();

var allowedCorsOrigins = configuredCorsOrigins is { Length: > 0 }
    ? configuredCorsOrigins
    : new[]
    {
        "https://peoplehrsync.com",
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

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var masterDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();

    try
    {
        Console.WriteLine("Testing Master Database connection...");

        if (masterDb.Database.CanConnect())
        {
            Console.WriteLine("Master Database Connected Successfully.");
        }
        else
        {
            Console.WriteLine("Master Database Connection Failed.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Master Database connection check error: {ex.Message}");
    }
}
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

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
    