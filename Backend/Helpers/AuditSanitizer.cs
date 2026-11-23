// varsha - Audit Sanitizer helper for sensitive data masking and delta computation
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace EmployeeManagementSystem.Helpers
{
    public static class AuditSanitizer
    {
        private static readonly HashSet<string> SensitiveKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "password",
            "passwordhash",
            "confirmpassword",
            "oldpassword",
            "newpassword",
            "token",
            "jwt",
            "refreshtoken",
            "apikey",
            "secret",
            "secretkey",
            "credential",
            "credentials",
            "connectionstring",
            "authorization",
            "otp",
            "otpcode",
            "salt",
            "bankaccountnumber",
            "accountnumber",
            "bankaccount",
            "cvv",
            "pin",
            "pannumber",
            "aadharnumber",
            "ssn",
            "taxid",
            "access_token",
            "id_token"
        };

        public static string? Sanitize(object? input)
        {
            if (input == null) return null;

            try
            {
                if (input is string stringValue)
                {
                    if (string.IsNullOrWhiteSpace(stringValue)) return null;

                    // Check if string is JSON
                    stringValue = stringValue.Trim();
                    if ((stringValue.StartsWith("{") && stringValue.EndsWith("}")) ||
                        (stringValue.StartsWith("[") && stringValue.EndsWith("]")))
                    {
                        var jsonNode = JsonNode.Parse(stringValue);
                        if (jsonNode != null)
                        {
                            SanitizeNode(jsonNode);
                            return jsonNode.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
                        }
                    }

                    return stringValue;
                }

                var serialized = JsonSerializer.Serialize(input);
                var node = JsonNode.Parse(serialized);
                if (node != null)
                {
                    SanitizeNode(node);
                    return node.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        private static void SanitizeNode(JsonNode node)
        {
            if (node is JsonObject obj)
            {
                var keys = obj.Select(kvp => kvp.Key).ToList();
                foreach (var key in keys)
                {
                    if (IsSensitiveKey(key))
                    {
                        obj.Remove(key);
                    }
                    else if (obj[key] != null)
                    {
                        SanitizeNode(obj[key]!);
                    }
                }
            }
            else if (node is JsonArray array)
            {
                foreach (var item in array)
                {
                    if (item != null)
                    {
                        SanitizeNode(item);
                    }
                }
            }
        }

        private static bool IsSensitiveKey(string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return false;

            if (SensitiveKeys.Contains(key)) return true;

            // Check if key contains sensitive substrings
            var lower = key.ToLowerInvariant();
            return lower.Contains("password") ||
                   lower.Contains("secret") ||
                   lower.Contains("token") ||
                   lower.Contains("credential") ||
                   lower.Contains("apikey") ||
                   lower.Contains("otp") ||
                   lower.Contains("cvv");
        }

        public static (string? oldValuesJson, string? newValuesJson) ComputeDelta(object? oldObj, object? newObj)
        {
            if (oldObj == null && newObj == null) return (null, null);

            if (oldObj == null) return (null, Sanitize(newObj));
            if (newObj == null) return (Sanitize(oldObj), null);

            try
            {
                var oldJson = Sanitize(oldObj);
                var newJson = Sanitize(newObj);

                if (oldJson == null || newJson == null)
                    return (oldJson, newJson);

                var oldNode = JsonNode.Parse(oldJson);
                var newNode = JsonNode.Parse(newJson);

                if (oldNode is JsonObject oldObject && newNode is JsonObject newObject)
                {
                    var oldDelta = new JsonObject();
                    var newDelta = new JsonObject();

                    var allKeys = new HashSet<string>(oldObject.Select(x => x.Key))
                        .Union(newObject.Select(x => x.Key));

                    foreach (var key in allKeys)
                    {
                        oldObject.TryGetPropertyValue(key, out var oldVal);
                        newObject.TryGetPropertyValue(key, out var newVal);

                        string oldValStr = oldVal?.ToJsonString() ?? "null";
                        string newValStr = newVal?.ToJsonString() ?? "null";

                        if (oldValStr != newValStr)
                        {
                            if (oldVal != null) oldDelta[key] = oldVal.DeepClone();
                            if (newVal != null) newDelta[key] = newVal.DeepClone();
                        }
                    }

                    string? oldRes = oldDelta.Count > 0 ? oldDelta.ToJsonString() : null;
                    string? newRes = newDelta.Count > 0 ? newDelta.ToJsonString() : null;

                    return (oldRes, newRes);
                }

                return (oldJson, newJson);
            }
            catch
            {
                return (Sanitize(oldObj), Sanitize(newObj));
            }
        }
    }
}
