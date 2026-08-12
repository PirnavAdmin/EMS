using System.Security.Claims;

namespace EmployeeManagementSystem.Helpers
{
    public static class CurrentUserHelper
    {
        public static string? GetEmployeeOrOnboardingId(ClaimsPrincipal user)
        {
            return user.FindFirst("EmployeeId")?.Value
                ?? user.FindFirst("OnboardingId")?.Value;
        }

        public static string? GetEmployeeId(ClaimsPrincipal user)
        {
            return user.FindFirst("EmployeeId")?.Value;
        }

        public static string? GetOnboardingId(ClaimsPrincipal user)
        {
            return user.FindFirst("OnboardingId")?.Value;
        }
    }
}