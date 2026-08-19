import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";

export const getAssets = (config = {}) =>
  api.get(API_ENDPOINTS.masters.assets.list, config);

export const getAssetById = (assetId, config = {}) =>
  api.get(API_ENDPOINTS.masters.assets.byId(assetId), config);

export const createAsset = (payload, config = {}) =>
  api.post(API_ENDPOINTS.masters.assets.list, payload, config);

export const updateAsset = (assetId, payload, config = {}) =>
  api.put(API_ENDPOINTS.masters.assets.byId(assetId), payload, config);

export const deleteAsset = (assetId, config = {}) =>
  api.delete(API_ENDPOINTS.masters.assets.byId(assetId), config);
