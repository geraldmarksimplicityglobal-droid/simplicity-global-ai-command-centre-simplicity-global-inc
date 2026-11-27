FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY live-framework/IMPLEMENTATION/api/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY --chown=node:node live-framework/IMPLEMENTATION/api/src ./src
USER node
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
