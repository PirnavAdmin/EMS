
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using FirebaseAdmin.Messaging;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class FcmNotificationService : IFcmNotificationService
    {
        private readonly AppDbContext _context;
        private readonly FirebaseMessaging _messaging;

        public FcmNotificationService(
            AppDbContext context,
            FirebaseMessaging messaging)
        {
            _context = context;
            _messaging = messaging;
        }


        public async Task<FcmSendResult> SendToEmployeeAsync(
            string employeeId,
            string title,
            string body,
            string type,
            string screen,
            Dictionary<string, string>? data = null)
        {
            var result = new FcmSendResult
            {
                EmployeeId = employeeId
            };

            var devices = await _context.UserNotificationDevices
                .Where(d => d.EmployeeId == employeeId && d.IsActive)
                .ToListAsync();

            result.DevicesFound = devices.Count;

            if (devices.Count == 0)
            {
                result.Status = "No active devices found";
                return result;
            }

            foreach (var batch in devices.Chunk(500))
            {
                var tokens = batch.Select(d => d.DeviceToken).ToList();

                var messageData = new Dictionary<string, string>
                {
                    ["type"] = type,
                    ["screen"] = screen
                };

                if (data != null)
                {
                    foreach (var item in data)
                        messageData[item.Key] = item.Value;
                }

                var message = new MulticastMessage
                {
                    Tokens = tokens,
                    Notification = new Notification
                    {
                        Title = title,
                        Body = body
                    },
                    Data = messageData,
                    Android = new AndroidConfig
                    {
                        Notification = new AndroidNotification
                        {
                            ChannelId = "hrms_updates"
                        }
                    }
                };

                var response =
                    await _messaging.SendEachForMulticastAsync(message);

                result.SuccessCount += response.SuccessCount;
                result.FailureCount += response.FailureCount;

                for (var i = 0; i < response.Responses.Count; i++)
                {
                    var sendResult = response.Responses[i];

                    if (sendResult.IsSuccess)
                        continue;

                    var error = sendResult.Exception?.Message
                        ?? "Unknown Firebase error";

                    result.Errors.Add(error);

                    if (sendResult.Exception is FirebaseMessagingException ex &&
                        ex.MessagingErrorCode == MessagingErrorCode.Unregistered)
                    {
                        var device = batch.FirstOrDefault(
                            d => d.DeviceToken == tokens[i]);

                        if (device != null)
                        {
                            device.IsActive = false;
                            device.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }

                await _context.SaveChangesAsync();
            }

            result.Status = result.FailureCount == 0
                ? "Accepted by Firebase"
                : result.SuccessCount > 0
                    ? "Partially accepted by Firebase"
                    : "Firebase send failed";

            return result;
        }

    }
}
