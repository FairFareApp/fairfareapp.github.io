export async function compressImage(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a photo in JPEG, PNG or WebP format. If your iPhone photo is in HEIC format, save a JPEG copy and choose that copy.",
    );
  if (file.size > 20000000)
    throw new Error("This photo is larger than 20 MB. Choose a photo that is 20 MB or smaller.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {
      throw new Error("FairFare couldn’t open this photo. Choose another photo or take a new one.");
    });
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
        "FairFare couldn’t make this photo small enough to send. Try cropping it to show only the item.",
      );
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("FairFare couldn’t read this photo. Choose another photo or take a new one."));
      reader.readAsDataURL(blob);
    });
    return { blob, data, url: URL.createObjectURL(blob) };
  } catch (e) {
    throw new Error(
      e.message || "FairFare couldn’t open this photo. Choose another photo or take a new one.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function discardImage(image) {
  if (image?.url) URL.revokeObjectURL(image.url);
}
