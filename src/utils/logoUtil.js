export const getImageUrl = (path) => {
  if (!path) return "";

  const baseUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    window.location.origin;

  const cleanPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${baseUrl}${cleanPath}`;
};

export const getLogoUrl = getImageUrl;