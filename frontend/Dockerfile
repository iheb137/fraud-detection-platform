# ---------- Stage 1 : build Angular ----------
FROM node:22-alpine AS build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN cp src/environments/environment.docker.ts src/environments/environment.ts \
    && npx ng build --configuration production

# ---------- Stage 2 : nginx ----------
FROM nginx:alpine
COPY --from=build /build/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=fraud-backend
ENV ML_HOST=fraud-ml
EXPOSE 80