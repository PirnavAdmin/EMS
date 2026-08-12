import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { withAuthHeaders } from "../api/requestConfig";

export const generateRelievingLetter = (data, config = {}) =>
  api.post(
    API_ENDPOINTS.RELIEVING_LETTER.GENERATE,
    data,
    withAuthHeaders(config)
  );

export const getAllRelievingLetters = (config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.GET_ALL, withAuthHeaders(config));

export const downloadRelievingLetter = (id, config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.DOWNLOAD(id), {
    ...withAuthHeaders(config),
    responseType: "blob",
  });

export const previewRelievingLetter = (id, config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.PREVIEW(id), {
    ...withAuthHeaders(config),
    responseType: "blob",
    dedupe: false,
  });

export const sendRelievingLetter = (payload, config = {}) =>
  api.post(
    API_ENDPOINTS.RELIEVING_LETTER.SEND,
    payload,
    withAuthHeaders(config)
  );

export const getRelievingLetterSendStatus = (id, config = {}) =>
  api.get(API_ENDPOINTS.RELIEVING_LETTER.SEND_STATUS(id), {
    ...withAuthHeaders(config),
    dedupe: false,
  });

export const deleteRelievingLetter = (id, config = {}) =>
  api.delete(API_ENDPOINTS.RELIEVING_LETTER.DELETE(id), withAuthHeaders(config));
