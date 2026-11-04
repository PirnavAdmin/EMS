using Microsoft.Extensions.DependencyInjection;

using Microsoft.Extensions.Hosting;

namespace EmployeeManagementSystem.Services

{

    public class EmployeeExitStatusBackgroundService

        : BackgroundService

    {

        private readonly IServiceScopeFactory _scopeFactory;

        public EmployeeExitStatusBackgroundService(

            IServiceScopeFactory scopeFactory)

        {

            _scopeFactory = scopeFactory;

        }

        protected override async Task ExecuteAsync(

            CancellationToken stoppingToken)

        {

            while (!stoppingToken.IsCancellationRequested)

            {

                try

                {

                    using var scope =

                        _scopeFactory.CreateScope();

                    var exitStatusService =

                        scope.ServiceProvider

                            .GetRequiredService<EmployeeExitStatusService>();

                    await exitStatusService

                        .ProcessExpiredLastWorkingDates();

                }

                catch (Exception ex)

                {

                    Console.WriteLine(

                        $"EmployeeExitStatusBackgroundService Error: {ex}");

                }

                await Task.Delay(

                    TimeSpan.FromMinutes(5),

                    stoppingToken);

            }

        }

    }

}
