using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IAssetService

    {

        Task<string> CreateAsset(AssetDto dto);

        Task<List<Asset>> GetAllAssets();

        Task<Asset?> GetAssetById(int id);

        Task<string> UpdateAsset(int id, AssetDto dto);

        Task<string> AssignAsset(int id, string employeeId);

        Task<string> ReturnAsset(int id);

        Task<string> DeleteAsset(int id);
        Task<byte[]> ExportAssetsReport();



    }

}
