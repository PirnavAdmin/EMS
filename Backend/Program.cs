using EmployeeManagementSystem.Controllers;

using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Helpers;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Services;

using Microsoft.AspNetCore.Authentication.JwtBearer;

using Microsoft.EntityFrameworkCore;

using Microsoft.IdentityModel.Tokens;

using Microsoft.OpenApi.Models;

using System.IdentityModel.Tokens.Jwt;

using System.Security.Claims;

using System.Text;
using Microsoft.AspNetCore.HttpOverrides;
using QuestPDF.Infrastructure;

using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ================= SERVICES =================

builder.Services.AddControllers();


builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddScoped<JwtHelper>();

builder.Services.AddDbContext<AppDbContext>(options =>

    options.UseMySql(

        builder.Configuration.GetConnectionString("DefaultConnection"),

        new MySqlServerVersion(new Version(8, 0, 36))

    )

);

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
//builder.Services.AddScoped<ITeamService, TeamService>();

builder.Services.AddScoped<ModuleSearchService>();
builder.Services.AddScoped<
    IEmployeeDocumentService,
    EmployeeDocumentService>();

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
        "http://localhost:5173"
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

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
