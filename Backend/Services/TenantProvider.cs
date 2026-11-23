using System;
using System.Linq;
using System.Security.Claims;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace EmployeeManagementSystem.Services
{
    public class TenantProvider : ITenantProvider
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IConfiguration _config;
        private readonly IServiceProvider _serviceProvider;
        private readonly IMemoryCache _cache;
        private string? _explicitOrgCode;

        public TenantProvider(
            IHttpContextAccessor httpContextAccessor,
            IConfiguration config,
            IServiceProvider serviceProvider,
            IMemoryCache cache)
        {
            _httpContextAccessor = httpContextAccessor;
            _config = config;
            _serviceProvider = serviceProvider;
            _cache = cache;
        }

        public string? GetCurrentOrganizationCode()
        {
            if (!string.IsNullOrEmpty(_explicitOrgCode))
                return _explicitOrgCode;

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
                return null;

            // 0. SuperAdmin paths or SuperAdmin role -> always route to master database
            var path = httpContext.Request.Path.Value ?? string.Empty;
            if (path.StartsWith("/api/SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/superadmin", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/DemoRequests", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/Settings/landing-page-contact", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/SuperAdminPermissions", StringComparison.OrdinalIgnoreCase) ||
                httpContext.User.IsInRole("SuperAdmin") ||
                httpContext.User.HasClaim(c => c.Type == "SuperAdminId"))
            {
                return "master";
            }

            // 1. Check Claims
            var orgCodeClaim = httpContext.User.FindFirst("OrganizationCode")?.Value;
            if (!string.IsNullOrEmpty(orgCodeClaim))
                return orgCodeClaim.Trim();

            // 2. Check Request Header
            if (httpContext.Request.Headers.TryGetValue("X-Organization-Code", out var headerVal) && !string.IsNullOrWhiteSpace(headerVal))
                return headerVal.ToString().Trim();

            if (httpContext.Request.Headers.TryGetValue("X-Tenant-ID", out var tenantVal) && !string.IsNullOrWhiteSpace(tenantVal))
                return tenantVal.ToString().Trim();

            return null;
        }

        public void SetCurrentTenant(string organizationCode)
        {
            _explicitOrgCode = organizationCode?.Trim();
        }

        public string GetTenantConnectionString()
        {
            var orgCode = GetCurrentOrganizationCode();

            if (string.Equals(orgCode, "master", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(orgCode))
            {
                return _config.GetConnectionString("MasterConnection")!;
            }

            string cacheKey = $"tenant_conn_{orgCode.ToLower()}";
            if (_cache.TryGetValue(cacheKey, out string? cachedConnStr) && !string.IsNullOrWhiteSpace(cachedConnStr))
            {
                return cachedConnStr;
            }

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var masterDb = scope.ServiceProvider.GetService(typeof(MasterDbContext)) as MasterDbContext;
                if (masterDb != null)
                {
                    var org = masterDb.Organizations
                        .FirstOrDefault(o => o.OrganizationCode == orgCode && !o.IsDeleted);

                    if (org != null && !string.IsNullOrWhiteSpace(org.DatabaseName))
                    {
                        var masterConnStr = _config.GetConnectionString("MasterConnection") ?? "";
                        var masterBuilder = new MySqlConnectionStringBuilder(masterConnStr);

                        var template = _config.GetConnectionString("TenantConnectionTemplate")
                            ?? "Server={Host};Port={Port};Database={Database};User={User};Password={Password};SslMode=None;AllowPublicKeyRetrieval=True;Allow User Variables=True;";

                        var host = !string.IsNullOrWhiteSpace(org.DbHost) ? org.DbHost : masterBuilder.Server;
                        var port = org.DbPort > 0 ? org.DbPort : (masterBuilder.Port > 0 ? (int)masterBuilder.Port : 3306);
                        var user = !string.IsNullOrWhiteSpace(org.DbUser) ? org.DbUser : masterBuilder.UserID;
                        var pass = !string.IsNullOrWhiteSpace(org.DbPassword) ? org.DbPassword : masterBuilder.Password;

                        var connStr = template
                            .Replace("{Host}", host)
                            .Replace("{Port}", port.ToString())
                            .Replace("{Database}", org.DatabaseName)
                            .Replace("{User}", user)
                            .Replace("{Password}", pass);

                        _cache.Set(cacheKey, connStr, TimeSpan.FromMinutes(10));
                        return connStr;
                    }
                }
            }
            catch
            {
                // Fallback to MasterConnection if Master DB query fails
            }

            return _config.GetConnectionString("MasterConnection")!;
        }
    }
}
