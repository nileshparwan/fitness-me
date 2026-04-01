const AVATAR_MAX_DIMENSION = 512;
const AVATAR_QUALITY = 0.82;
const AVATAR_MAX_BYTES = 50_000;

function approximateDataUrlBytes(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return 0;
  return Math.round((dataUrl.length - commaIndex - 1) * 0.75);
}

export function dataUrlSizeBytes(dataUrl: string | null | undefined) {
  if (!isBase64DataUrl(dataUrl)) return 0;
  return approximateDataUrlBytes(dataUrl);
}

export async function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = image.naturalWidth;
      let height = image.naturalHeight;
      if (width > AVATAR_MAX_DIMENSION || height > AVATAR_MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * AVATAR_MAX_DIMENSION);
          width = AVATAR_MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * AVATAR_MAX_DIMENSION);
          height = AVATAR_MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas not supported"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      let dataUrl = canvas.toDataURL("image/webp", AVATAR_QUALITY);
      if (!dataUrl.startsWith("data:image/webp")) {
        dataUrl = canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
      }

      const approxBytes = approximateDataUrlBytes(dataUrl);
      if (approxBytes > AVATAR_MAX_BYTES) {
        reject(new Error(`Compressed image is ${Math.round(approxBytes / 1000)} KB - please use a smaller photo.`));
        return;
      }

      resolve(dataUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image file."));
    };

    image.src = objectUrl;
  });
}

export function isBase64DataUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("data:");
}
