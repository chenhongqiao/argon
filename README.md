# Argon Contest Server

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

A fast and scalable online competitive programming contest server powered by cloud native computing.

## Packages

This monorepo contains 5 packages.

### [@argoncs/api-server](https://www.npmjs.com/package/@argoncs/api-server)

This package contains the server portion of the contest platform. It interacts with the user and the judger.

### [@argoncs/upload-server](https://www.npmjs.com/package/@argoncs/upload-server)

Upload server that handles testcases.

### [@argoncs/judge-daemon](https://www.npmjs.com/package/@argoncs/judge-daemon)

This package contains the code to be used on judgers. It executes submissions in sandboxes and grade their outputs.

### [@argoncs/result-handler](https://www.npmjs.com/package/@argoncs/result-handler)

The result handler receives compiling and grading results from a message queue and then perform database updates.

### [@argoncs/types](https://www.npmjs.com/package/@argoncs/types)

Type and class definitions utilized by both the server and the judger. Not designed to be used as a standalone package.

### [@argoncs/common](https://www.npmjs.com/package/@argoncs/common)

Utilities and libraries used by both the server and the judger to interact with the infrastructure (such as DB and Object Storage).

## Azure Hosting Guide

**General Steps**:
- Create Azure Subscription
- Create VM
- SSH into VM, install softwares
- SSH into VM, start servers

**Create Azure & VM**:
- Create azure account: [here](https://azure.microsoft.com/en-us/)
- Create a subscription: “Azure services” -> “Subscriptions” -> “Add”
    - Follow instructions from there. Use free trial.
- Create virtual machine: “add resource” -> “Virtual machine”
	- Use Ubuntu 24
	- Use x64
	- Use Dasv5, 2 cores
	- Set Username
	- Set your public-key: “use existing public key” -> copy tour public key in.
	- Inbound ports: 22 (SSH) (others later)
	- Networking, Create new virtual network
	- Networking, Create new public IP
- Test connection: `ssh [username]@[public IP]`
- Navigate to network settings on portal
	- Ports to open (Inbound and outbound): 443 (HTTPS), 8443 (admin), 8880 (upload)
	- DNS: add record for “contest.joincpi.org,” using this machine’s IP. This is done by the owner of “joincpi.org” domain. Ask someone.

**Installing Software**: <br>
*Note: all “apt install” commands in following steps have been bundled into this one*: <br>
`sudo apt install unzip g++ openjdk-8-jdk pypy3 make pkg-config libcap-dev libsystemd-dev unzip certbot` <br>

- Setup editor (vim)
    - `sudo apt install neovim`
	- set up personal vim configs
- `git clone https://github.com/shine00chang/argon.git`
- Install nodeJS
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
corepack enable
cd argon
yarn (corepack will install yarn 4.5.x)
```
- write `set-env.sh` in `argon/`:
```
export NODE_ENV=development
export COOKIE_SECRET=[CHANGEME]
export MONGO_URL="mongodb://root:password@localhost:27017/dev?authSource=admin&ssl=false&directConnection=true
export MINIO_URL="minio://root:password@localhost:9000”
export CACHEREDIS_URL="redis://localhost:6379”
export RANKLISTREDIS_URL="redis://localhost:6380"
export RABBITMQ_URL="amqp://root:password@localhost:5672"	
export BOX_META_DIR="$(pwd)/box-metas"
export CERT="TODO” (will be set in HTTPS setup)
export CERTKEY="TODO” (will be set in HTTPS setup)
export API_SERVER_PORT=8443
export CLIENT_PORT=443
export UPLOAD_SERVER_PORT=8880
```
**Install Docker**:
- [official instructions](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)
- **Do not start containers! Mongo needs setup**

**Setup Mongo DB replica set**:
	- cd to `argon/deploy/dev/`
```
openssl rand -base64 756 > replica.key
docker compose up -d	
docker exec -it [container ID] sh
mongosh mongodb://root:password@127.0.0.1
rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] })
```
**Setup Uploader**:
- `sudo apt install unzip`

**Setup Judger**:
- `sudo apt install g++ openjdk-8-jdk pypy3` (python)
- `sudo apt install make pkg-config libcap-dev libsystemd-dev` (isolate compilation prereqs)
- Install isolate
	- cd to `/`
    ```
    git clone https://github.com/ioi/isolate.git
    cd to isolate/
    make install
    sudo cp systemd/isolate.service /etc/systemd/system/
    sudo systemctl start isolate.service
    ```
- Download Codeforces checker build library: `curl -o testlib.h https://raw.githubusercontent.com/MikeMirzayanov/testlib/refs/heads/master/testlib.h`
- Judger directories
	- cd to `argon/packages/judger/`
    ```
	mkdir argon-cache
    mkdir box-metas
    ```
**HTTPS Setup**:
- Add record for “contest.joincpi.org” using this machine’s IP. This is done by the owner of “joincpi.org” domain. Ask someone.
- `sudo apt install certbot`
- `certbot certonly`
    - follow instructions from there
    - record location of certificate. need to plug this into configurations file
- Write the path to the public key to “CERT” in set-env.sh
- Write the path to the private key to “CERTKEY” in set-env.sh
- Certbot should put the keys in /etc/letsencrypt/[domainname]/keys/ .. etc

**Startup Routine**:
- Start isolate systemd service: `sudo systemctl start isolate.service`
- Check containers are live:
	- should see 4 containers: mongo, dragonfly-cache, dragonfly-ranklist, rabbitmq 
	- `sudo docker ps`
- Start containers if not: 
	- cd to `argon/deploy/dev/`
	- `sudo docker compose up`
- Start servers:
 	- To start ‘yarn dev’ as daemon (background process): setsid yarn dev </dev/null >log.txt 2>&1 & 
	- Create a note of the process IDs of each processes. This will help identify the process for killing later. The PID of the process that started the process will be printed. The started process’ PID is usually a few ID’s higher, but recording these will suffice.
	- run this command in: `argon/packages/api-server`, `argon/packages/upload-server`, `argon/packages/judger`, `argon/packages/client`, `argon/packages/result-handler`

**Selectively Killing Services**: <br>
Find services via: `ps aux | grep 'yarn dev’` <br>
It will list processes running with a command that includes the word `yarn dev` <br>
Use your recorded PIDs to find process to kill, with: `kill [pid]`

**Common Issues & Diagnostic Steps**:
- Did not start Mongo replica set
	- See “setup Mongo DB” step
- Judger systemd not on: `sudo systemctl start isolate.service`
- Wrong ports
	- Check the ports in config file
	- Check the ports used in source code:
		- is client calling API via the right port?
		- is `admin.html` in `api-server` calling upload via the right port?

