FROM node:24-alpine
WORKDIR /app
COPY package.json index.html maker.html ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
RUN node scripts/build.mjs
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["node", "scripts/server.mjs", "--dist"]
