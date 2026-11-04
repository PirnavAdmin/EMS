namespace EmployeeManagementSystem.Models
{
    public class AdminPermission
    {
        public int Id { get; set; }

        public int AdminId { get; set; }

        public int ModuleId { get; set; }

        public bool CanView { get; set; }

        public bool CanAdd { get; set; }

        public bool CanEdit { get; set; }

        public bool CanDelete { get; set; }

        public bool CanAccess { get; set; }

        public Admin Admin { get; set; }

        public Module Module { get; set; }
    }
}
