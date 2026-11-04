using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace EmployeeManagementSystem.Authorization
{
    public class PermissionFilter : IAsyncAuthorizationFilter
    {
        private readonly IPermissionService _permissionService;
        private readonly int _moduleId;
        private readonly PermissionAction _action;

        public PermissionFilter(
            IPermissionService permissionService,
            int moduleId,
            PermissionAction action)
        {
            _permissionService = permissionService;
            _moduleId = moduleId;
            _action = action;
        }

        public async Task OnAuthorizationAsync(
            AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;

            if (user?.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            bool allowed = await _permissionService.HasPermission(
                user,
                _moduleId,
                _action.ToString());

            if (!allowed)
            {
                context.Result = new ForbidResult();
            }
        }
    }
}