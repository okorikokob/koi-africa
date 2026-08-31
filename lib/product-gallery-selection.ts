export function findVerifiedGalleryImageIndex(
  galleryImages: string[],
  selectedColourImages: string[],
): number | null {
  if (selectedColourImages.length === 0) return null;
  for (const selectedImage of selectedColourImages) {
    const normalizedSelectedImage = selectedImage.split("?")[0];
    const index = galleryImages.findIndex((galleryImage) =>
      galleryImage === selectedImage || galleryImage.split("?")[0] === normalizedSelectedImage
    );
    if (index >= 0) return index;
  }
  return null;
}
