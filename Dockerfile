FROM ubuntu:22.04
LABEL org.opencontainers.image.source=https://github.com/vessylapp/vessyl-worker
RUN apt-get update && \
    apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
    echo "deb [arch=amd64 signed-by=/etc/apt/trusted.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce docker-ce-cli containerd.io nodejs npm

RUN npm install -g n
RUN n stable
RUN npm install -g npm@latest
WORKDIR /app
COPY . .
RUN npm install
ENTRYPOINT ["npm", "run", "dev"]