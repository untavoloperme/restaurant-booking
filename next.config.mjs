/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permette all'iframe del widget di essere caricato da altri domini
  async headers() {
    return [
      {
        source: "/widget",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
  // Sopprime warning react-konva (peer deps legacy)
  webpack(config) {
    return config;
  },
};

export default nextConfig;
