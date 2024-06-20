FROM ghcr.io/vessylapp/vessyl-docker-image:latest
LABEL org.opencontainers.image.source=https://github.com/vessylapp/vessyl-worker
WORKDIR /app
COPY . .
RUN npm install
ENTRYPOINT ["npm", "run", "start"]