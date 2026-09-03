/**
 * Direct Upload Engine for Builder Service (POST /jobs)
 */

class BuilderUploader {
  constructor(endpoint = "/jobs") {
    this.endpoint = endpoint;
  }

  uploadScanPackage(scanBlob, propertyInfo, onUploadProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("files", scanBlob, `${propertyInfo.name.toLowerCase().replace(/\s+/g, "_")}.scan`);
      formData.append("house_name", propertyInfo.name);
      formData.append("client_id", propertyInfo.clientId);
      formData.append("address", propertyInfo.address);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", this.endpoint, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onUploadProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve({ job_id: "job_created_ok", status: "pending" });
          }
        } else {
          reject(new Error(`Upload failed with status code ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload to Builder Service."));
      };

      xhr.send(formData);
    });
  }
}

window.BuilderUploader = BuilderUploader;
