export const getImageUrl = (path) => {
  if (!path) return "";

  const baseUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    window.location.origin;

  // Rewrite /uploads/<filename> or uploads/<filename> to use the secure /api/uploads/<filename> route
  let cleanPath = path;
  if (cleanPath.includes("/uploads/")) {
    const filename = cleanPath.split("/uploads/")[1];
    cleanPath = `/api/uploads/${filename}`;
  } else if (cleanPath.startsWith("uploads/")) {
    const filename = cleanPath.split("uploads/")[1];
    cleanPath = `/api/uploads/${filename}`;
  } else if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  return `${baseUrl}${cleanPath}`;
};

export const getLogoUrl = getImageUrl;