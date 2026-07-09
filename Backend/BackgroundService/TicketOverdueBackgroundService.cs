using EmployeeManagementSystem.Interfaces;

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

                    var overdueService =
                        scope.ServiceProvider
                             .GetRequiredService<ITicketOverdueService>();

                    await overdueService.CheckOverdueTicketsAsync();

                    _logger.LogInformation(
                        "Ticket overdue check completed at {Time}",
                        DateTime.UtcNow);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error while checking overdue tickets.");
                }

                // 1 minute for testing
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

                // Change to 15 minutes in production:
                // await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            }
        }
    }
}