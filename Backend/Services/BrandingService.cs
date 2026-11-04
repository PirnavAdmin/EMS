using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class BrandingService : IBrandingService

    {

        private readonly AppDbContext _context;

        public BrandingService(AppDbContext context)

        {

            _context = context;

        }

        public async Task<BrandingResponseDto> GetBrandingAsync(int companyId)

        {

            var branding = await _context.BrandingSettings

                .FirstOrDefaultAsync(x => x.Company_Id == companyId);

            if (branding == null)

                return null;

            return new BrandingResponseDto

            {

                BrandingId = branding.BrandingId,

                Company_Id = branding.Company_Id,

                CompanyLogo = branding.CompanyLogo,

                LoginLogo = branding.LoginLogo,

                SidebarLogo = branding.SidebarLogo,

                LoginBackground = branding.LoginBackground,

                Favicon = branding.Favicon,

                PrimaryColor = branding.PrimaryColor,

                SecondaryColor = branding.SecondaryColor,

                ButtonColor = branding.ButtonColor,

                FontFamily = branding.FontFamily,

                FooterText = branding.FooterText,

                FooterLink = branding.FooterLink,

                SupportEmail = branding.SupportEmail,

                SupportPhone = branding.SupportPhone,

                IsDarkMode = branding.IsDarkMode

            };

        }

        public async Task<BrandingResponseDto> CreateBrandingAsync(CreateBrandingDto dto)

        {

            var branding = new BrandingSettings

            {

                Company_Id = dto.Company_Id,

                PrimaryColor = dto.PrimaryColor,

                SecondaryColor = dto.SecondaryColor,

                ButtonColor = dto.ButtonColor,

                FontFamily = dto.FontFamily,

                FooterText = dto.FooterText,

                FooterLink = dto.FooterLink,

                SupportEmail = dto.SupportEmail,

                SupportPhone = dto.SupportPhone,

                IsDarkMode = dto.IsDarkMode,

                CreatedDate = DateTime.Now

            };

            _context.BrandingSettings.Add(branding);

            await _context.SaveChangesAsync();

            return await GetBrandingAsync(dto.Company_Id);

        }

        public async Task<BrandingResponseDto> UpdateBrandingAsync(UpdateBrandingDto dto)

        {

            var branding = await _context.BrandingSettings

                .FirstOrDefaultAsync(x => x.BrandingId == dto.BrandingId);

            if (branding == null)

                return null;

            branding.PrimaryColor = dto.PrimaryColor;

            branding.SecondaryColor = dto.SecondaryColor;

            branding.ButtonColor = dto.ButtonColor;

            branding.FontFamily = dto.FontFamily;

            branding.FooterText = dto.FooterText;

            branding.FooterLink = dto.FooterLink;

            branding.SupportEmail = dto.SupportEmail;

            branding.SupportPhone = dto.SupportPhone;

            branding.IsDarkMode = dto.IsDarkMode;

            branding.UpdatedDate = DateTime.Now;

            await _context.SaveChangesAsync();

            return await GetBrandingAsync(dto.Company_Id);

        }

        public async Task<bool> DeleteBrandingAsync(int brandingId)

        {

            var branding = await _context.BrandingSettings

                .FirstOrDefaultAsync(x => x.BrandingId == brandingId);

            if (branding == null)

                return false;

            _context.BrandingSettings.Remove(branding);

            await _context.SaveChangesAsync();

            return true;

        }

    }

}
