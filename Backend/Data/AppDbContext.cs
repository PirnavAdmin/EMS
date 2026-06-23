using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

using System.Collections.Generic;

namespace EmployeeManagementSystem.Data

{

    public class AppDbContext : DbContext

    {

        public AppDbContext(DbContextOptions<AppDbContext> options)

            : base(options)

        {

        }

        public DbSet<Register> Users { get; set; }

        public DbSet<Employee> Employees { get; set; }

        public DbSet<EmployeePersonalInfo> EmployeePersonalInfos { get; set; }

        //protected override void OnModelCreating(ModelBuilder modelBuilder)

        //{

        //    // Make Employee.EmployeeId UNIQUE

        //    modelBuilder.Entity<Employee>()

        //        .HasIndex(e => e.Employee_Id)

        //        .IsUnique();

        //    // Configure string FK relationship

        //    modelBuilder.Entity<EmployeePersonalInfo>()

        //        .HasOne(p => p.Employees)

        //        .WithMany(e => e.PersonalInfos)

        //        .HasForeignKey(p => p.Employee_Id)

        //        .HasPrincipalKey(e => e.Employee_Id);

        //    modelBuilder.Entity<EmployeeExperience>()

        //          .HasOne<Employee>()

        //          .WithMany()

        //          .HasForeignKey(e => e.Employee_Id)

        //          .HasPrincipalKey(e => e.Employee_Id);

        //    modelBuilder.Entity<Employee>()

        // .HasOne(e => e.BankDetails)

        // .WithOne(b => b.Employee)

        // .HasForeignKey<EmployeeBankDetail>(b => b.Employee_Id)

        // .HasPrincipalKey<Employee>(e => e.Employee_Id);

        //}

        public DbSet<EmployeeEducation> EmployeeEducations { get; set; }

        public DbSet<EmployeeExperience> EmployeeExperiences { get; set; }

        public DbSet<EmployeeLeave> EmployeeLeaves { get; set; }

        public DbSet<Department> Departments { get; set; }

        public DbSet<Asset> Assets { get; set; }

        public DbSet<TaskManagement> TaskManagement { get; set; }

        public DbSet<Branch> Branches { get; set; }

        public DbSet<EmployeeBankDetail> EmployeeBankDetails { get; set; }

        public DbSet<Holiday> Holidays { get; set; }

        public DbSet<Project> Projects { get; set; }

        public DbSet<JobOpening> JobOpenings { get; set; }

        public DbSet<Client> Clients { get; set; }

        public DbSet<SalaryStructureConfig> SalaryStructureConfigs { get; set; }

        public DbSet<OfferLetter> OfferLetters { get; set; }

        public DbSet<PaySlip> PaySlips { get; set; }

        public DbSet<Admin> Admins { get; set; }

        public DbSet<UserNotification> UserNotifications { get; set; }

        public DbSet<Attendance> Attendance { get; set; }

        public DbSet<ActivityLog> ActivityLogs { get; set; }

        public DbSet<EmployeeLeaveBalance> EmployeeLeaveBalances { get; set; }

        public DbSet<AdminNotification> AdminNotifications { get; set; }

        public DbSet<Role> Roles { get; set; }

        public DbSet<Company> Company { get; set; }

        public DbSet<Module> Modules { get; set; }

        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<MonitoringSettings> MonitoringSettings { get; set; }

        public DbSet<EmployeeScreenshot> EmployeeScreenshots { get; set; }

        public DbSet<MonitoringLog> MonitoringLogs { get; set; }
        public DbSet<EmployeeDocument> EmployeeDocuments { get; set; }
        public DbSet<BreakLog> BreakLogs { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)

        {

            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Register>().ToTable("users");

            modelBuilder.Entity<Employee>().ToTable("employees");

            modelBuilder.Entity<EmployeePersonalInfo>().ToTable("employeepersonalinfo");

            modelBuilder.Entity<EmployeeEducation>().ToTable("employeeeducation");

            modelBuilder.Entity<EmployeeExperience>().ToTable("employeeexperience");

            modelBuilder.Entity<EmployeeLeave>().ToTable("employeeleave");

            modelBuilder.Entity<Department>().ToTable("departments");

            modelBuilder.Entity<Asset>().ToTable("assets");

            modelBuilder.Entity<TaskManagement>().ToTable("taskmanagement");

            modelBuilder.Entity<Branch>().ToTable("branches");

            modelBuilder.Entity<EmployeeBankDetail>().ToTable("employeebankdetails");

            modelBuilder.Entity<Holiday>().ToTable("holidays");

            modelBuilder.Entity<Project>().ToTable("projects");

            modelBuilder.Entity<JobOpening>().ToTable("jobopenings");

            modelBuilder.Entity<Client>().ToTable("clients");

            modelBuilder.Entity<SalaryStructureConfig>().ToTable("salarystructureconfigs");

            modelBuilder.Entity<OfferLetter>().ToTable("offerletters");

            modelBuilder.Entity<PaySlip>().ToTable("payslips");

            modelBuilder.Entity<UserNotification>().ToTable("usernotifications");

            modelBuilder.Entity<Attendance>().ToTable("attendance");

            modelBuilder.Entity<ActivityLog>().ToTable("activitylogs");

            modelBuilder.Entity<EmployeeLeaveBalance>().ToTable("employeeleavebalance");

            modelBuilder.Entity<AdminNotification>().ToTable("adminnotifications");

            modelBuilder.Entity<Role>().ToTable("roles");

            modelBuilder.Entity<Company>().ToTable("Company");

            modelBuilder.Entity<Module>().ToTable("modules");
          


            modelBuilder.Entity<RolePermission>().ToTable("rolepermissions");
            modelBuilder.Entity<Admin>().ToTable("admins");
            modelBuilder.Entity<MonitoringSettings>()
    .ToTable("MonitoringSettings");

            modelBuilder.Entity<EmployeeScreenshot>()
                .ToTable("EmployeeScreenshots");

            modelBuilder.Entity<MonitoringLog>()
                .ToTable("MonitoringLogs");

            modelBuilder.Entity<RolePermission>()

                .HasOne(rp => rp.Role)

                .WithMany(r => r.RolePermissions)

                .HasForeignKey(rp => rp.RoleId);

            modelBuilder.Entity<RolePermission>()

                .HasOne(rp => rp.Module)

                .WithMany(m => m.RolePermissions)

                .HasForeignKey(rp => rp.ModuleId);

            // Optimization: safe read-path indexes for dashboard, attendance, payroll, and report filters.
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.Employee_Id, a.Attendance_Date });

            modelBuilder.Entity<Attendance>()
                .HasIndex(a => a.Attendance_Date);

            modelBuilder.Entity<EmployeeLeave>()
                .HasIndex(l => new { l.EmployeeId, l.Status, l.FromDate, l.ToDate });

            modelBuilder.Entity<Holiday>()
                .HasIndex(h => h.Holiday_Date);

            modelBuilder.Entity<PaySlip>()
                .HasIndex(p => new { p.Month, p.Year });

            modelBuilder.Entity<PaySlip>()
                .HasIndex(p => p.EmployeeId);

            modelBuilder.Entity<ActivityLog>()
                .HasIndex(a => a.CreatedAt);


            // Make Employee.EmployeeId UNIQUE

            modelBuilder.Entity<Employee>()

                .HasIndex(e => e.Employee_Id)

                .IsUnique();

            // Configure string FK relationship

            modelBuilder.Entity<EmployeePersonalInfo>()

                .HasOne(p => p.Employees)

                .WithMany(e => e.PersonalInfos)

                .HasForeignKey(p => p.Employee_Id)

                .HasPrincipalKey(e => e.Employee_Id);

            modelBuilder.Entity<EmployeeExperience>()

                  .HasOne<Employee>()

                  .WithMany()

                  .HasForeignKey(e => e.Employee_Id)

                  .HasPrincipalKey(e => e.Employee_Id);

            modelBuilder.Entity<Employee>()

         .HasOne(e => e.BankDetails)

         .WithOne(b => b.Employee)

         .HasForeignKey<EmployeeBankDetail>(b => b.Employee_Id)

         .HasPrincipalKey<Employee>(e => e.Employee_Id);

        }


    }

}

