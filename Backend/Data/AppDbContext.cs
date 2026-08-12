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

        //public DbSet<EmployeeLeaveBalance> EmployeeLeaveBalances { get; set; }
        public DbSet<EmployeeMonthlyLeaveBalance> EmployeeMonthlyLeaveBalances { get; set; }
        public DbSet<AdminNotification> AdminNotifications { get; set; }

        public DbSet<Role> Roles { get; set; }

        public DbSet<Company> Company { get; set; }

        public DbSet<Module> Modules { get; set; }

        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<MonitoringSettings> MonitoringSettings { get; set; }

        public DbSet<EmployeeScreenshot> EmployeeScreenshots { get; set; }
        public DbSet<ProjectTeamMember> ProjectTeamMembers { get; set; }
        public DbSet<MonitoringLog> MonitoringLogs { get; set; }
        public DbSet<EmployeeDocument> EmployeeDocuments { get; set; }
        public DbSet<BreakLog> BreakLogs { get; set; }
        public DbSet<WorkFromHomeRequest> WorkFromHomeRequests { get; set; }
        public DbSet<Team> Teams { get; set; }

        public DbSet<TeamMember> TeamMembers { get; set; }

        public DbSet<TeamReportingDay> TeamReportingDays { get; set; }

        public DbSet<TeamMemberOverride> TeamMemberOverrides { get; set; }

        public DbSet<TeamMemberReportingDay> TeamMemberReportingDays { get; set; }
        public DbSet<EmployeeLocation> EmployeeLocations { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
      

        public DbSet<TicketTimer> TicketTimers { get; set; }
        public DbSet<TicketAssignment> TicketAssignments { get; set; }
        public DbSet<SchedulerLog> SchedulerLogs { get; set; }

        public DbSet<RoundRobinState> RoundRobinStates { get; set; }

        public DbSet<SchedulerSetting> SchedulerSettings { get; set; }
        public DbSet<TicketHistory> TicketHistory { get; set; }
        public DbSet<TicketWorkLog> TicketWorkLogs { get; set; }

        public DbSet<EmailSettings> EmailSettings { get; set; }
        public DbSet<AttendanceSettings> AttendanceSettings { get; set; }
        public DbSet<LeaveSettings> LeaveSettings { get; set; }
        public DbSet<CompanySettings> CompanySettings { get; set; }
        public DbSet<NotificationSettings> NotificationSettings { get; set; }
        public DbSet<GeneralSettings> GeneralSettings { get; set; }
        public DbSet<PolicySettings> PolicySettings { get; set; }
        public DbSet<AgreementMaster> AgreementMasters { get; set; }
        public DbSet<EmployeeAgreement> EmployeeAgreements { get; set; }

        public DbSet<RelievingLetter> RelievingLetters { get; set; }
        public DbSet<UserPermission> UserPermissions { get; set; }
        public DbSet<OnboardingCandidate> OnboardingCandidates { get; set; }

        public DbSet<OnboardingPersonalInfo> OnboardingPersonalInfos { get; set; }

        public DbSet<OnboardingEducation> OnboardingEducations { get; set; }

        public DbSet<OnboardingExperience> OnboardingExperiences { get; set; }

        public DbSet<OnboardingDocument> OnboardingDocuments { get; set; }
        public DbSet<BrandingSettings> BrandingSettings { get; set; }

        public DbSet<TemplateMaster> TemplateMaster { get; set; }

        public DbSet<DocumentMaster> DocumentMaster { get; set; }

        public DbSet<FooterSettings> FooterSettings { get; set; }

        public DbSet<FileStorage> FileStorage { get; set; }

        public DbSet<TaxDeclaration> TaxDeclarations { get; set; }

        public DbSet<TaxDeclarationItem> TaxDeclarationItems { get; set; }

        public DbSet<TaxProof> TaxProofs { get; set; }

        public DbSet<EmployeeTDS> EmployeeTDS { get; set; }

        public DbSet<Form16> Form16 { get; set; }

        public DbSet<PerformanceCycle> PerformanceCycles { get; set; }

        public DbSet<EmployeeGoal> EmployeeGoals { get; set; }

        public DbSet<Appraisal> Appraisals { get; set; }

        public DbSet<GoalReview> GoalReviews { get; set; }

        public DbSet<AppraisalLetter> AppraisalLetters { get; set; }

        public DbSet<EmployeeResignation> EmployeeResignations { get; set; }

        public DbSet<EmployeeClearance> EmployeeClearances { get; set; }

        public DbSet<ExitInterview> ExitInterviews { get; set; }

        public DbSet<FullFinalSettlement> FullFinalSettlements { get; set; }

        public DbSet<WorkflowMaster> WorkflowMasters { get; set; }

        public DbSet<WorkflowSteps> WorkflowSteps { get; set; }

        public DbSet<WorkflowHistory> WorkflowHistories { get; set; }

        public DbSet<ShiftMaster> ShiftMasters { get; set; }

        public DbSet<EmployeeShiftAssignment> EmployeeShiftAssignments { get; set; }

        public DbSet<ShiftRoster> ShiftRosters { get; set; }

        public DbSet<ShiftPlanner> ShiftPlanners { get; set; }

        public DbSet<ShiftSwap> ShiftSwaps { get; set; }

        public DbSet<ShiftChangeRequest> ShiftChangeRequests { get; set; }

        public DbSet<EmployeeWeeklyOff> EmployeeWeeklyOffs { get; set; }
        public DbSet<PerformanceCycle> PerformanceCycle { get; set; }
        public DbSet<EmployeeResignation> EmployeeResignation { get; set; }

        public DbSet<ShiftRotation> ShiftRotations { get; set; }

        public DbSet<SuperAdmin> SuperAdmins { get; set; }
        public DbSet<AdminPermission> AdminPermissions { get; set; }

        public DbSet<AdminSubscription> AdminSubscriptions { get; set; }
        public DbSet<EmployeeGoal> EmployeeGoal { get; set; }

        public DbSet<Appraisal> Appraisal { get; set; }
        public DbSet<GoalReview> GoalReview { get; set; }

        public DbSet<EmployeeClearance> EmployeeClearance { get; set; }
        public DbSet<ExitInterview> ExitInterview { get; set; }
        public DbSet<FullFinalSettlement> FullFinalSettlement { get; set; }

        public DbSet<WorkflowMaster> WorkflowMaster { get; set; }
        public DbSet<WorkflowSteps> WorkflowStep { get; set; }
        public DbSet<WorkflowHistory> WorkflowHistorie { get; set; }
        public DbSet<TemplateModuleMaster> TemplateModuleMaster { get; set; }
        public DbSet<ExperienceLetter> ExperienceLetters { get; set; }
        public DbSet<EmployeeSalaryStructure>
    EmployeeSalaryStructures
        { get; set; }
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
            modelBuilder.Entity<EmployeeMonthlyLeaveBalance>()
    .ToTable("EmployeeMonthlyLeaveBalance");

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

            //modelBuilder.Entity<EmployeeLeaveBalance>().ToTable("employeeleavebalance");

            modelBuilder.Entity<AdminNotification>().ToTable("adminnotifications");

            modelBuilder.Entity<Role>().ToTable("roles");
            modelBuilder.Entity<AgreementMaster>()
    .ToTable("agreementmaster");

            modelBuilder.Entity<Company>().ToTable("Company");

            modelBuilder.Entity<Module>().ToTable("modules");
            modelBuilder.Entity<Team>().ToTable("Teams");
            modelBuilder.Entity<TeamMember>().ToTable("teammembers");
            modelBuilder.Entity<TeamMemberOverride>().ToTable("teammemberoverrides");
            modelBuilder.Entity<TeamReportingDay>().ToTable("teamreportingdays");
            modelBuilder.Entity<TeamMemberReportingDay>().ToTable("teammemberreportingdays");
            modelBuilder.Entity<WorkFromHomeRequest>().ToTable("workfromhomerequests");
            modelBuilder.Entity<AttendanceSettings>()
    .ToTable("attendancesettings");
            modelBuilder.Entity<EmployeeAgreement>()
        .ToTable("employeeagreement");
            modelBuilder.Entity<Ticket>().ToTable("tickets");
            modelBuilder.Entity<TicketTimer>().ToTable("tickettimer");
            modelBuilder.Entity<TicketHistory>().ToTable("tickethistory");
            modelBuilder.Entity<TicketWorkLog>().ToTable("ticketworklogs");

            modelBuilder.Entity<SchedulerLog>().ToTable("schedulerlog");
            modelBuilder.Entity<SchedulerSetting>().ToTable("schedulersettings");

            modelBuilder.Entity<ProjectTeamMember>().ToTable("projectteammembers");
            modelBuilder.Entity<RolePermission>().ToTable("rolepermissions");
            modelBuilder.Entity<Admin>().ToTable("admins");
            modelBuilder.Entity<MonitoringSettings>()
    .ToTable("MonitoringSettings");
            modelBuilder.Entity<RelievingLetter>()
                .ToTable("RelievingLetter");
            modelBuilder.Entity<UserPermission>()
    .ToTable("userpermission");

            modelBuilder.Entity<EmployeeScreenshot>()
                .ToTable("EmployeeScreenshots");

            modelBuilder.Entity<MonitoringLog>()
                .ToTable("MonitoringLogs");
            modelBuilder.Entity<PerformanceCycle>().ToTable("performancecycle");

            modelBuilder.Entity<ShiftMaster>().ToTable("shiftmaster");
            modelBuilder.Entity<ShiftRoster>().ToTable("shiftroster");
            modelBuilder.Entity<EmployeeShiftAssignment>().ToTable("employeeshiftassignment");
            modelBuilder.Entity<ShiftPlanner>().ToTable("shiftplanner");
            modelBuilder.Entity<ShiftSwap>().ToTable("shiftswap");
            modelBuilder.Entity<ShiftChangeRequest>().ToTable("shiftchangerequest");
            modelBuilder.Entity<EmployeeWeeklyOff>().ToTable("employeeweeklyoff");
            modelBuilder.Entity<ShiftRotation>().ToTable("shiftrotation");
            modelBuilder.Entity<SuperAdmin>()
    .ToTable("superadmins");
            modelBuilder.Entity<AdminPermission>()
    .ToTable("adminpermissions");

            modelBuilder.Entity<AdminSubscription>()
    .ToTable("adminsubscriptions");
            modelBuilder.Entity<AdminSubscription>()

    .HasKey(x => x.SubscriptionId);
            modelBuilder.Entity<EmployeeResignation>()
    .ToTable("employeeresignation");
            modelBuilder.Entity<EmployeeGoal>()
    .ToTable("employeegoal");
            modelBuilder.Entity<Appraisal>()
    .ToTable("appraisal");

            modelBuilder.Entity<GoalReview>()
                .ToTable("goalreview");

            modelBuilder.Entity<EmployeeClearance>()
                .ToTable("employeeclearance");

            modelBuilder.Entity<ExitInterview>()
                .ToTable("exitinterview");

            modelBuilder.Entity<FullFinalSettlement>()
                .ToTable("fullfinalsettlement");

            modelBuilder.Entity<WorkflowMaster>()
                .ToTable("workflowmaster");

            modelBuilder.Entity<WorkflowSteps>()
                .ToTable("workflowsteps");

            modelBuilder.Entity<WorkflowHistory>()
                .ToTable("workflowhistory");

            modelBuilder.Entity<RolePermission>()

                .HasOne(rp => rp.Role)

                .WithMany(r => r.RolePermissions)

                .HasForeignKey(rp => rp.RoleId);

            modelBuilder.Entity<RolePermission>()

                .HasOne(rp => rp.Module)

                .WithMany(m => m.RolePermissions)

                .HasForeignKey(rp => rp.ModuleId);

            modelBuilder.Entity<TicketAssignment>()
    .HasOne(x => x.Ticket)
    .WithMany()
    .HasForeignKey(x => x.TicketId)
    .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TicketAssignment>()
                .HasOne(x => x.Employee)
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .HasPrincipalKey(x => x.Employee_Id)
                .OnDelete(DeleteBehavior.Cascade);
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

            modelBuilder.Entity<Employee>()
    .HasAlternateKey(e => e.Employee_Id);
            modelBuilder.Entity<Employee>()
                .HasAlternateKey(e => e.Employee_Id);

            modelBuilder.Entity<UserPermission>()
                .HasOne(up => up.Employee)
                .WithMany()
                .HasForeignKey(up => up.EmployeeId)
                .HasPrincipalKey(e => e.Employee_Id);

            modelBuilder.Entity<UserPermission>()
    .HasOne(up => up.Module)
    .WithMany(m => m.UserPermissions)
    .HasForeignKey(up => up.ModuleId);
            //Make Employee.EmployeeId UNIQUE

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

            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<OnboardingCandidate>()
                .HasAlternateKey(x => x.OnboardingId);

            modelBuilder.Entity<TemplateMaster>()

.HasOne(t => t.Module)

.WithMany()

.HasForeignKey(t => t.ModuleId)

.OnDelete(DeleteBehavior.Restrict);


            modelBuilder.Entity<OnboardingPersonalInfo>()
                .HasOne(x => x.OnboardingCandidate)
                .WithMany()
                .HasForeignKey(x => x.OnboardingId)
                .HasPrincipalKey(x => x.OnboardingId);

            modelBuilder.Entity<OnboardingEducation>()
                .HasOne(x => x.OnboardingCandidate)
                .WithMany()
                .HasForeignKey(x => x.OnboardingId)
                .HasPrincipalKey(x => x.OnboardingId);

            modelBuilder.Entity<OnboardingExperience>()
                .HasOne(x => x.OnboardingCandidate)
                .WithMany()
                .HasForeignKey(x => x.OnboardingId)
                .HasPrincipalKey(x => x.OnboardingId);

            modelBuilder.Entity<OnboardingDocument>()
                .HasOne(x => x.OnboardingCandidate)
                .WithMany()
                .HasForeignKey(x => x.OnboardingId)
                .HasPrincipalKey(x => x.OnboardingId);
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<RelievingLetter>()
    .HasOne(r => r.Employee)
    .WithMany()
    .HasForeignKey(r => r.EmployeeId)
    .HasPrincipalKey(e => e.Employee_Id);

            modelBuilder.Entity<Team>()
                .HasOne(x => x.ReportingManager)
                .WithMany(x => x.ManagedTeams)
                .HasForeignKey(x => x.ReportingManagerId)
                .HasPrincipalKey(x => x.Employee_Id);

            modelBuilder.Entity<TeamMember>()
                .HasOne(x => x.Employee)
                .WithMany(x => x.TeamMembers)
                .HasForeignKey(x => x.EmployeeId)
                .HasPrincipalKey(x => x.Employee_Id);
            modelBuilder.Entity<TeamMember>()
    .HasOne(t => t.TeamMemberOverride)
    .WithOne(o => o.TeamMember)
    .HasForeignKey<TeamMemberOverride>(o => o.TeamMemberId);


            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ProjectTeamMember>()
                .HasOne(x => x.Project)
                .WithMany(x => x.ProjectTeamMembers)
                .HasForeignKey(x => x.ProjectId);

            modelBuilder.Entity<ProjectTeamMember>()
                .HasOne(x => x.Employee)
                .WithMany(x => x.ProjectTeamMembers)
                .HasForeignKey(x => x.EmployeeId)
                .HasPrincipalKey(x => x.Employee_Id);

            modelBuilder.Entity<TaxDeclaration>().ToTable("TaxDeclaration");

            modelBuilder.Entity<TaxDeclarationItem>().ToTable("TaxDeclarationItem");

            modelBuilder.Entity<TaxProof>().ToTable("TaxProof");

            modelBuilder.Entity<EmployeeTDS>().ToTable("EmployeeTDS");

            modelBuilder.Entity<Form16>().ToTable("Form16");

            modelBuilder.Entity<EmployeeResignation>()

    .HasOne(r => r.Employee)

    .WithMany()

    .HasForeignKey(r => r.Employee_Id)

    .HasPrincipalKey(e => e.Employee_Id);


            modelBuilder.Entity<FullFinalSettlement>()

    .HasOne(f => f.Employee)

    .WithMany()

    .HasForeignKey(f => f.Employee_Id)

    .HasPrincipalKey(e => e.Employee_Id);


            //    modelBuilder.Entity<ShiftRoster>()

            //.HasOne(x => x.Employee)

            //.WithMany()

            //.HasForeignKey(x => x.Employee_Id)

            //.HasPrincipalKey(e => e.Employee_Id);

            //    modelBuilder.Entity<ShiftRoster>()

            //        .HasOne(x => x.Shift)

            //        .WithMany()

            //        .HasForeignKey(x => x.ShiftId);

        }

    }



}




