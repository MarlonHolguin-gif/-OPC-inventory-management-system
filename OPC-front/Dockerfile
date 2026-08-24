# ---- Etapa de build ----
FROM node:22-alpine AS build
WORKDIR /app

# Cachear dependencias antes de copiar el código fuente
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite incrusta las variables VITE_* dentro del JS al compilar — a diferencia
# del backend, no se pueden leer en runtime desde el contenedor. Por eso van
# como ARG de build, no como "environment:" en docker-compose.yml.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---- Etapa de runtime ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
