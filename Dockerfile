# Stage 1: Build the React application
FROM node:lts-alpine AS build-stage

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# If package-lock.json is not present yet, npm install will generate it.
# Copying them separately leverages Docker cache.
COPY package.json ./
# Assuming npm, so package-lock.json will be generated if not present.
# If you have a package-lock.json, you should copy it too:
# COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:stable-alpine AS serve-stage

# Copy static assets from the build stage
# Vite builds to a 'dist' folder by default
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port 80 (default Nginx port)
EXPOSE 80

# Optional: Add a custom Nginx configuration for SPA routing if needed.
# Create a file named nginx.conf in the same directory as Dockerfile with:
# server {
#   listen 80;
#   server_name localhost;
#   root /usr/share/nginx/html;
#   index index.html index.htm;
#   location / {
#     try_files $uri $uri/ /index.html;
#   }
# }
# And then uncomment the following line:
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Default command to start Nginx (already part of the base Nginx image)
CMD ["nginx", "-g", "daemon off;"]
