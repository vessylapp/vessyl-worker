FROM ubuntu:22.04
LABEL org.opencontainers.image.source=https://github.com/vessylapp/vessyl-worker

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    apt-transport-https \
    lsb-release \
    gnupg \
    git \
    wget \
    unzip \
    nodejs \
    npm 

RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce docker-ce-cli containerd.io
    
RUN npm install -g n
RUN n stable
RUN npm install -g npm@latest
WORKDIR /app
COPY . .
RUN npm install
ENTRYPOINT ["npm", "run", "dev"]