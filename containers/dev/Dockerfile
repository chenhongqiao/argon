FROM mcr.microsoft.com/vscode/devcontainers/base:focal
RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y software-properties-common ca-certificates lsb-release && apt-get update

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add - && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
RUN mkdir -p /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN add-apt-repository ppa:redislabs/redis
RUN add-apt-repository ppa:chenhongqiao/argon

RUN apt-get update && apt-get install -y nodejs mongodb-mongosh nano vim redis-tools iputils-ping isolate build-essential docker-ce docker-ce-cli containerd.io docker-compose-plugin
RUN corepack enable
