using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.HostedServices;

public class TicketAssignmentHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TicketAssignmentHostedService> _logger;

    public TicketAssignmentHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<TicketAssignmentHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var masterDb = scope.ServiceProvider.GetRequiredService<MasterDbContext>();

                var orgs = await masterDb.Organizations
                    .Where(o => !o.IsDeleted && o.Status == "Active")
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

                        var engine = tenantScope.ServiceProvider.GetRequiredService<ITicketAssignmentEngine>();
                        await engine.AutoAssignPendingTickets();
                    }
                    catch (Exception orgEx)
                    {
                        _logger.LogWarning("Auto-assign pending tickets skipped for {OrgCode}: {Error}", orgCode, orgEx.Message);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in TicketAssignmentHostedService.");
            }

            try
            {
                await Task.Delay(
                    TimeSpan.FromMinutes(5),
                    stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
