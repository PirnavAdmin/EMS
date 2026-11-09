import React, { useEffect, useRef, useState } from "react";
import {
  fetchBrandingLogos,
  notifyOrganizationAdminLogoUpdated } from
"../../utils/brandingLogo";
import { uploadBrandingLogo } from "../../services/settingsService";
import { toastError, toastSuccess, toastWarning } from "@/components/common/Toast/toastService";
import { FaSpinner } from "react-icons/fa";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_EXTENSIONS = /\.(png|jpe?g|webp|svg)$/i;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml"
]);

export default function BrandingSettings() {
  const [companyLogo, setCompanyLogo] = useState("");
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const loadRequestIdRef = useRef(0);
  const uploadInFlightRef = useRef(false);

  const refreshCompanyLogo = async (forceRefresh = false) => {
    const requestId = ++loadRequestIdRef.current;

    try {
      const logos = await fetchBrandingLogos({
        forceRefresh
      });

      if (requestId !== loadRequestIdRef.current) {
        return "";
      }

      const nextCompanyLogo = logos.companyLogo || "";

      setCompanyLogo(nextCompanyLogo);
      setBrandingLoaded(true);

      return nextCompanyLogo;
    } catch {
      if (requestId === loadRequestIdRef.current) {
        setCompanyLogo("");
        setBrandingLoaded(true);
      }

      return "";
    }
  };

  useEffect(() => {
    refreshCompanyLogo();

    return () => {
      loadRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    setImageLoadError(false);
  }, [preview, companyLogo]);

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview]
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setPreview("");
      return;
    }

    const hasAllowedExtension = ALLOWED_LOGO_EXTENSIONS.test(file.name);
    const hasAllowedType =
      !file.type || ALLOWED_LOGO_TYPES.has(file.type.toLowerCase());

    if (!hasAllowedExtension || !hasAllowedType) {
      toastWarning("Choose a PNG, JPG, JPEG, SVG, or WebP logo.");
      event.target.value = "";
      setSelectedFile(null);
      setPreview("");
      return;
    }

    if (file.size === 0 || file.size > MAX_LOGO_SIZE_BYTES) {
      toastWarning(
        file.size === 0
          ? "The selected logo file is empty."
          : "The logo must be no larger than 2 MB."
      );
      event.target.value = "";
      setSelectedFile(null);
      setPreview("");
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setImageLoadError(false);
  };

  const handleUpload = async () => {
    if (uploadInFlightRef.current) return;

    if (!selectedFile) {
      toastWarning("Please select a logo first.");
      return;
    }

    try {
      uploadInFlightRef.current = true;
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      await uploadBrandingLogo(formData);
      const refreshedCompanyLogo = await refreshCompanyLogo(true);

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (refreshedCompanyLogo) {
        setPreview("");
        setImageLoadError(false);
      }

      notifyOrganizationAdminLogoUpdated();
      toastSuccess("Logo added successfully!");
    } catch {
      toastError("Failed to upload logo. Please try again.");
    } finally {
      uploadInFlightRef.current = false;
      setUploading(false);
    }
  };

  const displayLogoSrc = preview || companyLogo;

  return (
    <div>
      <div style={{ marginBottom: "25px" }}>
        <h2>Branding Settings</h2>

        <p>
          Upload the logo for this organization's Admin workspace. It does not
          change the public Landing Page.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #d9eeee",
          borderRadius: "12px",
          padding: "30px",
          maxWidth: "600px"
        }}>
        
        <h3 style={{ marginBottom: "15px" }}>Company Logo</h3>

        {displayLogoSrc && !imageLoadError ?
        <div
          style={{
            marginBottom: "25px",
            padding: "20px",
            border: "1px solid #e5eeee",
            borderRadius: "10px",
            textAlign: "center"
          }}>
          
            <img
            src={displayLogoSrc}
            alt="Company Logo"
            onError={() => setImageLoadError(true)}
            style={{
              maxWidth: "300px",
              maxHeight: "150px",
              objectFit: "contain"
            }} />
          
          </div> :
        brandingLoaded ?
        <div
          style={{
            marginBottom: "25px",
            padding: "20px",
            border: "1px dashed #d9eeee",
            borderRadius: "10px",
            textAlign: "center",
            color: "#6b7f86"
          }}>
          
            No branding logo uploaded yet.
          </div> :

        <div
          style={{
            marginBottom: "25px",
            padding: "20px",
            border: "1px dashed #d9eeee",
            borderRadius: "10px",
            textAlign: "center",
            color: "#6b7f86",
            minHeight: "190px"
          }} />

        }

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileChange} />
        

        <div style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="app-button-primary"
            onClick={handleUpload}
            disabled={uploading}>
            
            {uploading ? (
              <>
                <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                Uploading...
              </>
            ) : "Upload Logo"}
          </button>
        </div>
      </div>
    </div>);

}
