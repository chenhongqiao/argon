FROM mcr.microsoft.com/vscode/devcontainers/base:focal
RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y software-properties-common && apt-get update

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
RUN wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add - && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
RUN add-apt-repository ppa:redislabs/redis

RUN apt-get update && apt-get install -y nodejs mongodb-mongosh nano vim redis-tools iputils-ping
RUN corepack enable
