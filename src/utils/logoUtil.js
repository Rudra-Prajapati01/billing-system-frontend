/**
 * Central utility to parse uploaded file paths into full URLs
 * using the configured backend domain.
 */
export const getLogoUrl = (path) => {
  if (!path) {
    // Fallback if logo is missing
    return "https://ui-avatars.com/api/?name=Company&background=5156be&color=fff";
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // Derive backend domain from VITE_API_URL, fallback to production domain
  const backendDomain = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : "https://slateblue-leopard-690725.hostingersite.com";

  return `${backendDomain}${cleanPath}`;
};
