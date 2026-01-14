FROM node:20-alpine AS builder

WORKDIR /app
COPY . .
RUN apk add --no-cache bash
RUN ./scripts/release.sh

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
