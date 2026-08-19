import React, { useEffect, useRef, useState } from "react";
import {
  fetchBrandingLogos,
  notifyBrandingLogoUpdated } from
"../../utils/brandingLogo";
import { uploadBrandingLogo } from "../../services/settingsService";

export default function BrandingSettings() {
  const [companyLogo, setCompanyLogo] = useState("");
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const loadRequestIdRef = useRef(0);

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

    if (!file) return;

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setImageLoadError(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a logo first.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      await uploadBrandingLogo(formData);

      const refreshedCompanyLogo = await refreshCompanyLogo(true);

      if (refreshedCompanyLogo) {
        setPreview("");
        setSelectedFile(null);
        setImageLoadError(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        notifyBrandingLogoUpdated();
      }

      alert("Logo uploaded successfully.");
    } catch (error) {

      alert(error?.response?.data?.message || "Failed to upload logo.");
    } finally {
      setUploading(false);
    }
  };

  const displayLogoSrc = preview || companyLogo;

  return (
    <div>
      <div style={{ marginBottom: "25px" }}>
        <h2>Branding Settings</h2>

        <p>
          Upload your company logo. The same logo will be used on the
          login page and sidebar.
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
          accept=".png,.jpg,.jpeg,.webp,.svg"
          onChange={handleFileChange} />
        

        <div style={{ marginTop: "20px" }}>
          <button
            type="button"
            className="app-button-primary"
            onClick={handleUpload}
            disabled={uploading}>
            
            {uploading ? "Uploading..." : "Upload Logo"}
          </button>
        </div>
      </div>
    </div>);

}
