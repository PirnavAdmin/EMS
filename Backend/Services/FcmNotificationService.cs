
//using EmployeeManagementSystem.Data;
//using EmployeeManagementSystem.Interfaces;
//using FirebaseAdmin.Messaging;
//using Microsoft.EntityFrameworkCore;

//namespace EmployeeManagementSystem.Services
//{
//    public class FcmNotificationService : IFcmNotificationService
//    {
//        private readonly AppDbContext _context;
//        private readonly FirebaseMessaging _messaging;

//        public FcmNotificationService(
//            AppDbContext context,
//            FirebaseMessaging messaging)
//        {
//            _context = context;
//            _messaging = messaging;
//        }

//        public async Task SendToEmployeeAsync(
//            string employeeId,
//            string title,
//            string body,
//            string type,
//            string screen,
//            Dictionary<string, string>? data = null)
//        {
//            var devices = await _context.UserNotificationDevices
//                .Where(d => d.EmployeeId == employeeId && d.IsActive)
//                .ToListAsync();

//            if (devices.Count == 0)
//            {
//                Console.WriteLine(
//                    $"No active FCM devices found for employee {employeeId}.");
//                return;
//            }

//            foreach (var batch in devices.Chunk(500))
//            {
//                var tokens = batch
//                    .Select(d => d.DeviceToken)
//                    .ToList();

//                var messageData = new Dictionary<string, string>
//                {
//                    ["type"] = type,
//                    ["screen"] = screen
//                };

//                if (data != null)
//                {
//                    foreach (var item in data)
//                    {
//                        messageData[item.Key] = item.Value;
//                    }
//                }

//                var message = new MulticastMessage
//                {
//                    Tokens = tokens,
//                    Notification = new Notification
//                    {
//                        Title = title,
//                        Body = body
//                    },
//                    Data = messageData,
//                    Android = new AndroidConfig
//                    {
//                        Notification = new AndroidNotification
//                        {
//                            ChannelId = "hrms_updates"
//                        }
//                    }
//                };

//                var response =
//                    await _messaging.SendEachForMulticastAsync(message);
//                Console.WriteLine(
//    $"FCM SuccessCount: {response.SuccessCount}");

//                Console.WriteLine(
//                    $"FCM FailureCount: {response.FailureCount}");

//                for (var i = 0; i < response.Responses.Count; i++)
//                {
//                    var result = response.Responses[i];

//                    if (result.IsSuccess)
//                    {
//                        Console.WriteLine(
//                            $"FCM notification sent to employee {employeeId}.");
//                        continue;
//                    }

//                    Console.WriteLine(
//                        $"FCM send failed for employee {employeeId}: " +
//                        result.Exception?.Message);

//                    if (result.Exception is FirebaseMessagingException ex &&
//                        ex.MessagingErrorCode ==
//                        MessagingErrorCode.Unregistered)
//                    {
//                        var failedToken = tokens[i];

//                        var device = batch.FirstOrDefault(
//                            d => d.DeviceToken == failedToken);

//                        if (device != null)
//                        {
//                            device.IsActive = false;
//                            device.UpdatedAt = DateTime.UtcNow;
//                        }
//                    }
//                }

//                await _context.SaveChangesAsync();
//            }
//        }
//    }
//}
