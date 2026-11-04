using System.Security.Claims;

public interface IAdminAuthorizationService
{
    Task<bool> IsAdminAsync(ClaimsPrincipal user);
}