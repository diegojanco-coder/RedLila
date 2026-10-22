FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN node node_modules/vite/bin/vite.js build --configLoader runner

FROM node:22-alpine
ENV NODE_ENV=production SERVE_FRONTEND=true
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/src ./backend/src
COPY backend/scripts/init-production-db.js ./backend/scripts/init-production-db.js
COPY backend/seeds/001_completo.sql ./backend/seeds/001_completo.sql
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
USER node
EXPOSE 3001
CMD ["node", "backend/src/app.js"]
