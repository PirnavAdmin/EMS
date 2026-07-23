using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Authorization
{
    public class PermissionAttribute : TypeFilterAttribute
    {
        public PermissionAttribute(int moduleId, PermissionAction action)
            : base(typeof(PermissionFilter))
        {
            Arguments = new object[]
            {
                moduleId,
                action
            };
        }
    }
}