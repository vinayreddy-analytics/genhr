/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.css': {
          loaders: [],
          as: '*'
        }
      }
    }
  }
}

module.exports = nextConfig
