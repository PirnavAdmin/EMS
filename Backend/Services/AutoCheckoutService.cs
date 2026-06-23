using EmployeeManagementSystem.Interfaces;
using Microsoft.Extensions.Hosting;

public class AutoCheckoutService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public AutoCheckoutService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using (var scope = _scopeFactory.CreateScope())
            {
                var service = scope.ServiceProvider.GetRequiredService<IAttendanceService>();

                await service.CheckMissingCheckouts();
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}