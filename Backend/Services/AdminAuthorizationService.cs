using EmployeeManagementSystem.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

public class AdminAuthorizationService : IAdminAuthorizationService
{
    private readonly AppDbContext _context;

    public AdminAuthorizationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> IsAdminAsync(ClaimsPrincipal user)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        if (string.IsNullOrWhiteSpace(email))
            return false;

        return await _context.Admins
            .AsNoTracking()
            .AnyAsync(a => a.Email.ToLower() == email);
    }
}