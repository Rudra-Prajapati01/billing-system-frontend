export const getImageUrl = (path) => {
  if (!path) return "";

  const baseUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    window.location.origin;

  const formattedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${baseUrl}${formattedPath}`;
};

export const getLogoUrl = getImageUrl;