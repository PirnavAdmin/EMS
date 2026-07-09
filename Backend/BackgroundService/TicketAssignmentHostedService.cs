using EmployeeManagementSystem.Interfaces;
namespace EmployeeManagementSystem.HostedServices;

public class TicketAssignmentHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public TicketAssignmentHostedService(
        IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope =
                _scopeFactory.CreateScope();

            var engine =
                scope.ServiceProvider
                .GetRequiredService<ITicketAssignmentEngine>();

            await engine.AutoAssignPendingTickets();

            await Task.Delay(
                TimeSpan.FromMinutes(5),
                stoppingToken);
        }
    }
}
