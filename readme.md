# Circle Chat — Backend API

Production backend for **Circle Chat**, a secure, real-time messaging application built with Node.js, Express, MongoDB, Socket.IO, and client-side End-to-End Encryption.

The backend is designed as a **blind relay** for encrypted messages: plaintext message contents and raw private keys are never processed or stored by the server.

---

## Overview

Circle Chat provides:

- JWT-based authentication
- Client-side End-to-End Encryption
- Real-time encrypted messaging with Socket.IO
- Online user presence
- Typing indicators
- Cursor-based message pagination
- Encrypted media handling through Cloudinary
- MongoDB Atlas persistence
- Dockerized backend
- Terraform-managed Azure infrastructure
- Kubernetes deployment using K3s
- Traefik-based HTTPS ingress
- Let's Encrypt TLS certificates
- Production WebSocket support over WSS

---

## Production Architecture

```
                         ┌─────────────────────────┐
                         │      React Frontend     │
                         │        Vercel           │
                         └────────────┬────────────┘
                                      │
                         HTTPS / WSS  │
                                      ▼
                         ┌─────────────────────────┐
                         │      Azure Public IP    │
                         │      20.197.24.9         │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │    Traefik Ingress       │
                         │       HTTPS/TLS          │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │        K3s Cluster       │
                         │     Azure Linux VM       │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Circle Chat Backend    │
                         │   Node.js + Express      │
                         │      Port 8000           │
                         └──────┬───────────┬───────┘
                                │           │
                     ┌──────────┘           └──────────┐
                     ▼                                 ▼
             ┌─────────────────┐              ┌─────────────────┐
             │   MongoDB Atlas │              │    Cloudinary   │
             │   Application   │              │  Media Storage  │
             │      Data       │              │                 │
             └─────────────────┘              └─────────────────┘
```

---

## Core Architecture

### End-to-End Encryption

Circle Chat uses client-side cryptography for message confidentiality.

The backend acts as a blind relay.

The server stores:

- Public keys
- Password-wrapped private-key ciphertext
- Cryptographic salts
- Cryptographic nonces
- Encrypted message payloads
- Message metadata

The server does not receive raw private keys or plaintext message contents.

**Message Flow**

```
Sender
  │
  │ Plaintext message
  ▼
Client-side encryption
  │
  │ Ciphertext
  ▼
Socket.IO
  │
  ▼
Backend
  │
  │ Encrypted payload
  ▼
Recipient
  │
  ▼
Client-side decryption
  │
  ▼
Plaintext message
```

Private keys are unwrapped on the client using the user's credentials and are not sent to the backend in plaintext.

### Authentication

Circle Chat uses:

- JWT authentication
- bcryptjs password hashing
- Protected REST endpoints
- Authenticated Socket.IO connections

After successful authentication, the client receives the encrypted key material required for local cryptographic operations.

Socket.IO connections authenticate using the user's JWT.

```
Client
  │
  │ JWT
  ▼
Socket.IO Handshake
  │
  ▼
Backend Authentication
  │
  ▼
Authenticated Socket
```

### Real-Time Communication

Circle Chat uses Socket.IO for persistent real-time communication.

Socket functionality includes:

- Real-time message delivery
- Online user presence
- Typing indicators
- Connection/disconnection handling
- Authenticated socket connections

Production connections use:

```
HTTPS → WSS
```

Production Socket.IO endpoint:

```
wss://circlechat-20-197-24-9.sslip.io/socket.io/
```

### Message Pagination

Message history uses cursor-based pagination rather than offset pagination.

MongoDB document IDs are used as cursors to efficiently retrieve older messages.

**Why Cursor Pagination?**

Offset pagination can become increasingly expensive as datasets grow:

```
?page=50
?page=100
?page=200
```

Cursor pagination instead uses the position of the last retrieved document:

```
GET /messages?cursor=<last_message_id>
```

This provides stable pagination and avoids duplicate or skipped records when new messages are inserted.

### Media Storage

Media is stored using Cloudinary rather than directly inside MongoDB.

The backend handles the upload process while MongoDB stores the associated message metadata.

For encrypted media:

```
Image
  ↓
Client-side encryption
  ↓
Encrypted payload
  ↓
Backend
  ↓
Cloudinary
  ↓
Stored media reference
```

This keeps MongoDB focused on application data and message metadata.

---

## Technology Stack

| Component | Technology |
|---|---|
| Runtime | Node.js |
| Language | JavaScript |
| Web Framework | Express.js |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Real-Time | Socket.IO |
| Authentication | JWT |
| Password Hashing | bcryptjs |
| Encryption | Client-side E2EE |
| Media Storage | Cloudinary |
| Containerization | Docker |
| Infrastructure as Code | Terraform |
| Cloud Provider | Microsoft Azure |
| Compute | Azure Linux Virtual Machine |
| Container Orchestration | K3s / Kubernetes |
| Ingress | Traefik |
| TLS | Let's Encrypt |
| Container Registry | GitHub Container Registry |
| Frontend Hosting | Vercel |

---

## Project Structure

```
server/
│
├── infra/
│   └── terraform/
│       ├── main.tf
│       ├── providers.tf
│       ├── variables.tf
│       ├── terraform.tfvars.example
│       └── .terraform.lock.hcl
│
├── k8s/
│   ├── deployment.yaml
│   └── service.yaml
│
├── Dockerfile
├── .dockerignore
├── .gitignore
│
├── controllers/
├── middleware/
├── models/
├── routes/
├── utils/
├── server.js
└── package.json
```

---

## Local Development

### Requirements

Install:

- Node.js 20+
- npm
- MongoDB Atlas account
- Cloudinary account

Clone the repository:

```bash
git clone https://github.com/v0id-X/circle-chat-backend.git
cd circle-chat-backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
PORT=8000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Start the development server:

```bash
npm run server
```

The backend should be available at:

```
http://localhost:8000
```

---

## Docker

The backend includes a production Dockerfile.

Build the image:

```bash
docker build -t circle-chat-backend .
```

Run the container:

```bash
docker run -p 8000:8000 --env-file .env circle-chat-backend
```

The container exposes:

```
8000
```

---

## Terraform Infrastructure

The production VM infrastructure is managed using Terraform.

Terraform provisions the Azure infrastructure required to run the K3s cluster.

### Infrastructure Resources

The Terraform configuration manages:

- Azure Resource Group
- Virtual Network
- Subnet
- Network Security Group
- Network Security Rules
- Static Public IP
- Network Interface
- Linux Virtual Machine

Infrastructure configuration:

```
infra/terraform/
├── main.tf
├── providers.tf
├── variables.tf
├── terraform.tfvars.example
└── .terraform.lock.hcl
```

### Terraform Setup

Navigate to the Terraform directory:

```bash
cd infra/terraform
```

Initialize Terraform:

```bash
terraform init
```

Create your local variables file:

**Linux/macOS**
```bash
cp terraform.tfvars.example terraform.tfvars
```

**Windows PowerShell**
```powershell
Copy-Item terraform.tfvars.example terraform.tfvars
```

Populate the required Azure values.

Format the Terraform configuration:

```bash
terraform fmt
```

Validate the configuration:

```bash
terraform validate
```

Review the infrastructure plan:

```bash
terraform plan
```

Apply the infrastructure:

```bash
terraform apply
```

> `terraform.tfvars` is intentionally ignored by Git and must not be committed.

---

## Kubernetes / K3s Deployment

The production backend runs on a K3s Kubernetes cluster hosted on an Azure Linux VM.

Kubernetes manifests are located in:

```
k8s/
├── deployment.yaml
└── service.yaml
```

Apply the deployment:

```bash
kubectl apply -f k8s/deployment.yaml
```

Apply the service:

```bash
kubectl apply -f k8s/service.yaml
```

Check the deployment:

```bash
kubectl get deployment
```

Check pods:

```bash
kubectl get pods
```

Check services:

```bash
kubectl get svc
```

For the current K3s setup, the kubeconfig may require elevated permissions:

```bash
sudo kubectl get nodes
```

---

## Production Ingress

Traefik is used as the Kubernetes ingress controller.

Production traffic flows through:

```
Internet
   ↓
Azure Public IP
   ↓
Traefik
   ↓
Kubernetes Service
   ↓
Circle Chat Backend
```

HTTPS is terminated through Traefik using Let's Encrypt.

Production backend:

```
https://circlechat-20-197-24-9.sslip.io
```

Health endpoint:

```
GET /ping
```

Example:

```bash
curl https://circlechat-20-197-24-9.sslip.io/ping
```

Expected response:

```json
{
  "message": "Server is awake"
}
```

---

## Production Verification

The production deployment has been verified for:

- Azure VM connectivity
- K3s node health
- Kubernetes pod health
- Kubernetes service routing
- Traefik ingress
- HTTPS
- REST API requests
- CORS
- Socket.IO
- WebSocket Secure (wss://)
- JWT socket authentication
- End-to-End message encryption
- End-to-End message decryption
- Real-time message delivery

Example Kubernetes checks:

```bash
kubectl get nodes
kubectl get pods -A
kubectl get svc -A
```

Production Socket.IO endpoint:

```
wss://circlechat-20-197-24-9.sslip.io/socket.io/
```

---

## Environment Variables & Secrets

The following files must not be committed:

```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
terraform.tfvars
```

Sensitive files are also ignored:

```
*.pem
*.key
*.crt
*.p12
*.pfx
```

Terraform state files are excluded:

```
*.tfstate
*.tfstate.*
```

Use `terraform.tfvars.example` as the safe template for Terraform configuration.

**Never commit:**

- JWT secrets
- MongoDB credentials
- Cloudinary secrets
- Azure credentials
- SSH private keys
- Kubernetes secrets
- `.env` files
- Terraform state containing sensitive values

---

## Security Model

Circle Chat separates authentication from message confidentiality.

**Authentication** — the backend handles:

```
Identity
   ↓
JWT Authentication
   ↓
Authorization
```

**Message Confidentiality** — the client handles:

```
Plaintext
   ↓
Client-side Encryption
   ↓
Ciphertext
   ↓
Backend Relay
   ↓
Ciphertext
   ↓
Client-side Decryption
   ↓
Plaintext
```

The backend therefore does not require access to users' raw private keys or plaintext message contents to relay messages.

---

## Production Architecture (Infra View)

The current production environment consists of:

```
Vercel
  │
  │ HTTPS / WSS
  ▼
Azure Public IP
20.197.24.9
  │
  ▼
Azure Linux VM
  │
  ▼
K3s
  │
  ├── Traefik
  │
  └── Circle Chat Backend
          │
          ├── MongoDB Atlas
          │
          └── Cloudinary
```

---

## API

The backend provides REST APIs for:

- Authentication
- User profiles
- Public key retrieval
- Message history
- Media operations
- Application resources

Real-time communication is handled through Socket.IO.

Relevant implementation areas:

```
routes/
controllers/
middleware/
```

---

## Git Workflow

Feature development uses Git branches.

Create a feature branch:

```bash
git checkout -b feature/my-feature
```

Implement and test the feature.

Stage changes:

```bash
git add .
```

Commit:

```bash
git commit -m "feat: add my feature"
```

Push the branch:

```bash
git push -u origin feature/my-feature
```

Then open a Pull Request against `main`.

After review and testing, merge the Pull Request.

---

## Production Status

| Component | Status |
|---|---|
| Azure VM | Running |
| K3s Cluster | Running |
| Kubernetes Backend | Running |
| Traefik | Running |
| HTTPS | Working |
| REST API | Working |
| CORS | Working |
| Socket.IO | Working |
| WSS | Working |
| JWT Socket Authentication | Working |
| E2EE Messaging | Working |
| MongoDB Atlas | Integrated |
| Cloudinary | Integrated |

Production health check:

```
https://circlechat-20-197-24-9.sslip.io/ping
```

---

## Future Infrastructure Improvements

The current infrastructure is deployed and production-tested.

Potential future improvements include:

- Kubernetes readiness probes
- Kubernetes liveness probes
- CPU and memory resource requests/limits
- Production monitoring
- Centralized logging
- Automated database backups
- More restrictive network security rules
- Deployment rollback mechanisms
- Immutable container image tags
- Infrastructure monitoring and alerting

---

## License

See the repository license for the terms governing this project.