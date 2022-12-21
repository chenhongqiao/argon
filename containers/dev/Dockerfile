FROM mcr.microsoft.com/vscode/devcontainers/base:jammy
RUN echo 'debconf debconf/frontend select Noninteractive' | sudo debconf-set-selections
RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y software-properties-common ca-certificates lsb-release

RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /etc/apt/keyrings/mongo.gpg && echo "deb [arch=amd64,arm64 signed-by=/etc/apt/keyrings/mongo.gpg] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x jammy main" | tee /etc/apt/sources.list.d/nodesource.list
RUN curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /etc/apt/keyrings/redis.gpg && echo "deb [signed-by=/etc/apt/keyrings/redis.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
RUN add-apt-repository ppa:chenhongqiao/argon

RUN apt-get update && apt-get install -y nodejs mongodb-mongosh nano vim redis-tools iputils-ping isolate build-essential docker-ce docker-ce-cli containerd.io docker-compose-plugin

RUN mkdir -p /etc/docker && printf "{\"storage-driver\": \"vfs\"}" > /etc/docker/daemon.json

RUN corepack enable
