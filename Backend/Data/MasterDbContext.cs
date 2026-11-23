using EmployeeManagementSystem.Models;
using EmployeeManagementSystem.Models.Master;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Data
{
    public class MasterDbContext : DbContext
    {
        public MasterDbContext(DbContextOptions<MasterDbContext> options)
            : base(options)
        {
        }

        public DbSet<Organization> Organizations { get; set; }
        public DbSet<MasterUser> MasterUsers { get; set; }
        public DbSet<OrganizationModulePermission> OrganizationModulePermissions { get; set; }
        public DbSet<SuperAdmin> SuperAdmins { get; set; }
        public DbSet<SuperAdminNotification> SuperAdminNotifications { get; set; }
        public DbSet<DemoRequest> DemoRequests { get; set; }
        public DbSet<LandingSettings> LandingSettings { get; set; }
        public DbSet<LandingPricingPlan> LandingPricingPlans { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<OrganizationSubscription> OrganizationSubscriptions { get; set; }
        public DbSet<AdminSubscription> AdminSubscriptions { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<AdminPermission> AdminPermissions { get; set; }
        public DbSet<Module> Modules { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Organization>().ToTable("organizations");
            modelBuilder.Entity<MasterUser>().ToTable("master_users");
            modelBuilder.Entity<OrganizationModulePermission>().ToTable("organization_module_permissions");
            modelBuilder.Entity<SuperAdmin>().ToTable("superadmins");
            modelBuilder.Entity<SuperAdminNotification>().ToTable("superadminnotifications");
            modelBuilder.Entity<DemoRequest>().ToTable("demo_requests");
            modelBuilder.Entity<LandingSettings>().ToTable("LandingSettings");
            modelBuilder.Entity<LandingPricingPlan>().ToTable("LandingPricingPlans");
            modelBuilder.Entity<LandingPricingPlan>().HasIndex(p => p.PlanKey).IsUnique();
            modelBuilder.Entity<SystemSetting>().ToTable("systemsettings");
            modelBuilder.Entity<OrganizationSubscription>().ToTable("organizationsubscriptions");
            modelBuilder.Entity<AdminSubscription>().ToTable("adminsubscriptions");
            modelBuilder.Entity<Admin>().ToTable("admins");
            modelBuilder.Entity<AdminPermission>().ToTable("adminpermissions");
            modelBuilder.Entity<AdminPermission>().Ignore(ap => ap.Admin);
            modelBuilder.Entity<AdminPermission>().Ignore(ap => ap.Module);
            modelBuilder.Entity<Module>().ToTable("modules");
            modelBuilder.Entity<Module>().Ignore(m => m.RolePermissions);
            modelBuilder.Entity<Module>().Ignore(m => m.UserPermissions);
            modelBuilder.Ignore<Employee>();
            modelBuilder.Ignore<EmployeeBankDetail>();
            modelBuilder.Ignore<RolePermission>();
            modelBuilder.Ignore<UserPermission>();
        }
    }
}
