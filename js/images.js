export async function compressImage(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPEG, PNG or WebP photograph. On iPhone, use a compatible JPEG export if needed.",
    );
  if (file.size > 20000000)
    throw new Error("This photo is over 20 MB. Please choose a smaller image.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(
      1,
      1280 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.78));
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.size > 1500000)
      throw new Error(
        "This image is too detailed to send. Please take a closer photograph.",
      );
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read this photo."));
      reader.readAsDataURL(blob);
    });
    return { blob, data, url: URL.createObjectURL(blob) };
  } catch (e) {
    throw new Error(
      e.message || "Could not open this photograph. Try a different image.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function discardImage(image) {
  if (image?.url) URL.revokeObjectURL(image.url);
}
