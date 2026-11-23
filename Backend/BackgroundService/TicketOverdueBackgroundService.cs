using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.BackgroundServices
{
    public class TicketOverdueBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TicketOverdueBackgroundService> _logger;

        public TicketOverdueBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<TicketOverdueBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Ticket Overdue Background Service Started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var masterDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();

                    var orgs = await masterDb.Organizations
                        .Where(o => !o.IsDeleted)
                        .Select(o => o.OrganizationCode)
                        .ToListAsync(stoppingToken);

                    foreach (var orgCode in orgs)
                    {
                        if (string.IsNullOrWhiteSpace(orgCode) || string.Equals(orgCode, "master", StringComparison.OrdinalIgnoreCase))
                            continue;

                        try
                        {
                            using var tenantScope = _scopeFactory.CreateScope();
                            var tenantProvider = tenantScope.ServiceProvider.GetRequiredService<ITenantProvider>();
                            tenantProvider.SetCurrentTenant(orgCode);

                            var overdueService = tenantScope.ServiceProvider.GetRequiredService<ITicketOverdueService>();
                            await overdueService.CheckOverdueTicketsAsync();
                        }
                        catch (Exception orgEx)
                        {
                            _logger.LogWarning("Failed checking overdue tickets for {OrgCode}: {Error}", orgCode, orgEx.Message);
                        }
                    }

                    _logger.LogInformation(
                        "Ticket overdue check completed across all organizations at {Time}",
                        DateTime.UtcNow);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error while checking overdue tickets.");
                }

                try
                {
                    // 15 minutes between checks
                    await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}