# ---------- Base builder ----------
FROM node:22-alpine AS base_builder
WORKDIR /app

RUN npm install -g dotenv-cli

# Shared .env.docker
COPY clients/.env.docker .env

# ---------- Auth client ----------
FROM base_builder AS builder_auth
COPY clients/auth/package*.json ./
RUN npm ci
COPY clients/auth/. .
RUN dotenv -e /app/.env -- npm run build

# ---------- Customer client ----------
FROM base_builder AS builder_customer
COPY clients/customer/package*.json ./
RUN npm ci
COPY clients/customer/. .
RUN dotenv -e /app/.env -- npm run build

# ---------- Vendor client ----------
FROM base_builder AS builder_vendor
COPY clients/vendor/package*.json ./
RUN npm ci
COPY clients/vendor/. .
RUN dotenv -e /app/.env -- npm run build

# ---------- Final Nginx ----------
FROM nginx:alpine
COPY --from=builder_auth /app/dist /usr/share/nginx/html/auth
COPY --from=builder_customer /app/dist /usr/share/nginx/html/customer
COPY --from=builder_vendor /app/dist /usr/share/nginx/html/vendor

COPY ./nginx/conf.d/ui.conf /etc/nginx/conf.d/ui.conf
COPY ./nginx/conf.d/apis.conf /etc/nginx/conf.d/apis.conf
