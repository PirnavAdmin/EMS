// varsha - Audit Logs Data Transfer Objects
using System;
using System.Collections.Generic;

namespace EmployeeManagementSystem.DTOs
{
    public class AuditLogResponseDto
    {
        public long Id { get; set; }
        public string OrganizationCode { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserRole { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string? EntityName { get; set; }
        public string? EntityId { get; set; }
        public string? Description { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public string? RequestMethod { get; set; }
        public string? RequestPath { get; set; }
        public int StatusCode { get; set; }
        public string? CorrelationId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AuditLogQueryParameters
    {
        private int _page = 1;
        private int _pageSize = 10;

        public int Page
        {
            get => _page;
            set => _page = value < 1 ? 1 : value;
        }

        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value < 1 ? 10 : (value > 100 ? 100 : value);
        }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Module { get; set; }
        public string? Action { get; set; }
        public string? UserId { get; set; }
        public string? Search { get; set; }
    }

    public class AuditLogSummaryDto
    {
        public int TotalActivities { get; set; }
        public int UniqueUsers { get; set; }
        public DateTime? RecentActivityTimestamp { get; set; }
        public List<string> ModulesTracked { get; set; } = new();
        public Dictionary<string, int> ActionWiseCounts { get; set; } = new();
    }

    public class AuditLogPagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
    }
}
