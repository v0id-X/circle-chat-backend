# Circle Chat --- Backend API

Production backend for **Circle Chat**, a secure, real-time
messaging application built with Node.js, Express, MongoDB, Socket.IO,
and client-side End-to-End Encryption.

The backend is designed as a **blind relay** for encrypted
messages: plaintext message contents and raw private keys are never
processed or stored by the server.

## Overview

Circle Chat provides:

- JWT-based authentication - Client-side End-to-End Encryption -
Real-time encrypted messaging with Socket.IO - Online presence and
typing indicators - Cursor-based message pagination - Encrypted media
handling through Cloudinary - MongoDB Atlas persistence - Dockerized
backend - Terraform-managed Azure infrastructure - Kubernetes/K3s
deployment history - Production deployment on Azure App Service - GitHub
Actions CI/CD with GHCR - Microsoft Entra ID GitHub OIDC federation -
Production WebSocket support

## Current Production Architecture

The backend currently runs on **Azure App Service**. The earlier
K3s deployment is retained below as the legacy architecture and explains
the infrastructure migration.

```text                          ┌──────────────────────┐            
             │    React Frontend    │                          │      
 Vercel        │                          └──────────┬───────────┘      
                              │                                HTTPS /
WSS                                     │                              
      ▼                          ┌──────────────────────┐              
           │   Azure App Service  │                          │  Linux
Web App       │                          │  Node.js + Express   │      
                   │     Port 8000        │                        
 └──────────┬───────────┘                                     │        
                 ┌──────────┴───────────┐                          ▼    
                 ▼                 ┌─────────────────┐  
 ┌─────────────────┐                 │  MongoDB Atlas  │    │  
 Cloudinary   │                 │ Application Data│    │ Encrypted Media
│                 └─────────────────┘    └─────────────────┘ ```

The frontend connects to the backend over HTTPS and WSS. MongoDB Atlas
stores application data and encrypted message payloads, while Cloudinary
handles encrypted media storage.

## Legacy K3s Architecture

The first production deployment ran the backend on a **1 GB Azure
Linux VM** with K3s.

```text                          ┌──────────────────────┐            
             │    React Frontend    │                          │      
 Vercel        │                          └──────────┬───────────┘      
                              │                                HTTPS /
WSS                                     │                              
      ▼                          ┌──────────────────────┐              
           │   Azure Public IP   │                        
 └──────────┬───────────┘                                     │        
                            ▼                        
 ┌──────────────────────┐                          │  Traefik Ingress  
  │                          │     HTTPS / TLS      │                  
       └──────────┬───────────┘                                     │  
                                  ▼                        
 ┌──────────────────────┐                          │  K3s / Kubernetes  
 │                          │   Azure Linux VM     │                    
     │      1 GB RAM        │                        
 └──────────┬───────────┘                                     │        
                            ▼                        
 ┌──────────────────────┐                          │ Circle Chat Backend
 │                          │ Node.js + Express    │                    
     │      Port 8000       │                        
 └──────────┬───────────┘                                     │        
                 ┌──────────┴───────────┐                          ▼    
                 ▼                 ┌─────────────────┐  
 ┌─────────────────┐                 │  MongoDB Atlas  │    │  
 Cloudinary   │                 └─────────────────┘  
 └─────────────────┘ ```

### Legacy CI/CD Pipeline

The earlier deployment path used the Kubernetes environment as the
application runtime:

```text Git Push    │    ▼ GitHub Actions    │    ├── Build Docker
image    │    └── Push image           │           ▼         GHCR      
    │           ▼    Azure VM / K3s           │           ▼  Kubernetes
Deployment           │           ▼  Circle Chat Backend ```

This worked, but it coupled application deployment to a small
self-managed Kubernetes node.

### Why the CI/CD and runtime changed

The K3s deployment was intentionally profiled before moving away from
it. The VM had only **896 MiB of RAM and 2 vCPUs**, and K3s
itself accounted for roughly **474--505 MiB** during the
captured measurements.

The node was also using swap and showed repeated kubelet housekeeping
delays and slow OpenAPI aggregation:

```text Housekeeping took longer than expected expected="1s"
actual="2.771s"

slow openapi aggregation ... 1--2+ seconds ```

The investigation did **not** find kernel OOM-kills or
Kubernetes eviction events, so the migration was not attributed to an
OOM failure. The issue was the overall resource overhead of running a
Kubernetes control plane, ingress, container runtime, and application on
a very small VM.

#### Resource investigation

**Memory and swap usage**

![K3s VM memory usage](docs/images/k3s-memory.png)

The VM had 896 MiB of RAM with very limited available memory and
approximately 595 MiB of swap in use in the captured measurement.

**K3s process footprint**

![K3s process memory usage](docs/images/k3s-process-memory.png)

`k3s-server` was the largest process and accounted for approximately
38.5% of the VM's memory in this snapshot.

**Container memory breakdown**

![K3s container memory usage](docs/images/k3s-container-stats.png)

The backend, Traefik, CoreDNS, and local-path-provisioner were all
sharing the same constrained host.

**Kubernetes workload**

![K3s workloads](docs/images/k3s-pods.png)

The node was running the application alongside K3s system workloads such
as CoreDNS, Traefik, the service load balancer, and the local-path
provisioner.

**Control-plane delays**

![K3s slow control-plane logs](docs/images/k3s-slow-logs.png)

The logs show repeated kubelet housekeeping delays and slow OpenAPI
aggregation.

The result was a move to **Azure App Service**, while keeping
the application containerized and the infrastructure declarative through
Terraform.

## Current CI/CD Pipeline

The current deployment separates the application image pipeline from
Azure infrastructure management:

```text                     ┌─────────────────────┐                  
  │      Git Push       │                     │        main         │  
                  └──────────┬──────────┘                              
 │                                ▼                    
┌─────────────────────┐                     │   GitHub Actions    │    
                └──────────┬──────────┘                                │
                  ┌────────────┴────────────┐                   │      
                  │                   ▼                         ▼      
    Build Docker image          GitHub OIDC                   │        
                │                   ▼                         ▼        
         GHCR              Microsoft Entra ID                   │      
                  │                   │                         ▼      
            │                 Federated Azure auth                   │  
                      │                   └────────────┬────────────┘  
                             ▼                    
┌─────────────────────┐                     │  Azure App Service  │    
                │  Linux Web App      │                    
└─────────────────────┘ ```

Images are tagged with the **Git commit SHA** rather than
relying on a mutable `latest` tag for deployment. GitHub Actions
authenticates to Azure through **Microsoft Entra ID workload
identity federation (OIDC)** instead of storing a long-lived Azure
service-principal secret in the repository.

Terraform manages the Azure App Service infrastructure separately from
application releases.

## Core Architecture

### End-to-End Encryption

Circle Chat uses client-side cryptography for message confidentiality.

The backend acts as a blind relay.

The server stores:

- Public keys - Password-wrapped private-key ciphertext - Cryptographic
salts - Cryptographic nonces - Encrypted message payloads - Message
metadata

The server does not receive raw private keys or plaintext message
contents.

### Message Flow

```text Sender   │   │ Plaintext message   ▼ Client-side encryption  
│   │ Ciphertext   ▼ Socket.IO   │   ▼ Backend   │   │ Encrypted payload
  ▼ Recipient   │   ▼ Client-side decryption   │   ▼ Plaintext message
```

Circle Chat uses libsodium's `crypto_box`, based on **X25519
public-key encryption and XSalsa20-Poly1305 authenticated
encryption**. Private-key material is protected using
**Argon2id**-derived key wrapping on the client.

### Authentication

Circle Chat uses:

- JWT authentication - bcryptjs password hashing - Protected REST
endpoints - Authenticated Socket.IO connections

```text Client   │   │ JWT   ▼ Socket.IO Handshake   │   ▼ Backend
Authentication   │   ▼ Authenticated Socket ```

### Real-Time Communication

Socket.IO handles:

- Real-time message delivery - Online presence - Typing indicators -
Connection/disconnection handling - Authenticated socket connections

Production connections use:

```text HTTPS → WSS ```

### Message Pagination

Message history uses cursor-based pagination rather than offset
pagination.

MongoDB document IDs are used as cursors to retrieve older messages
efficiently.

```text GET /messages?cursor=<last_message_id> ```

Cursor pagination provides stable traversal while new messages are
inserted.

### Media Storage

Encrypted media is handled through Cloudinary.

```text Image   ↓ Client-side encryption   ↓ Encrypted payload   ↓
Backend   ↓ Cloudinary   ↓ Stored media reference ```

The upload path streams the encrypted data directly rather than
introducing a redundant base64 re-encoding step.

## Technology Stack

| Area | Technology | |---|---| | Runtime | Node.js | |
Language | JavaScript | | Web Framework | Express.js | | Database
| MongoDB Atlas | | ODM | Mongoose | | Real-Time | Socket.IO |
| Authentication | JWT | | Password Hashing | bcryptjs | |
Encryption | libsodium / NaCl | | Key Derivation | Argon2id | |
Public-Key Cryptography | X25519 | | Authenticated Encryption |
XSalsa20-Poly1305 | | Media / CDN | Cloudinary | | Containerization
| Docker | | Container Registry | GitHub Container Registry | |
Infrastructure as Code | Terraform | | Cloud | Microsoft Azure | |
Current Compute | Azure App Service | | Legacy Orchestration |
Kubernetes / K3s | | Legacy Ingress | Traefik | | Legacy TLS |
Let's Encrypt | | CI/CD | GitHub Actions | | Azure CI/CD
Authentication | Microsoft Entra ID / GitHub OIDC | | Frontend
Hosting | Vercel | | Testing | Jest, Supertest |

** ## Testing

Circle Chat includes an automated backend test suite using Jest and
Supertest. Tests are isolated from external services and database
state through module mocking, so the suite can exercise authentication,
authorization, controller behavior, and failure paths without modifying
production data.

Test Coverage

The current suite contains 44 automated tests across 5 test suites:

Authentication middleware --- missing, invalid, and expired
JWTs; missing users; valid authenticated requests

Rate limiting --- authentication request limiting and response
behavior

Protected user routes --- authenticated access, invalid tokens,
and missing users

User controller --- signup, password hashing, duplicate
accounts, login, password verification, public-key management,
profile updates, Cloudinary uploads, and error handling

Message controller --- conversation isolation, cursor
pagination, message-seen authorization, message creation, encrypted
media handling, Socket.IO delivery, and controller error paths

The suite also covers the security fixes made during the application's
self-audit, including authentication failures and IDOR/access-control
checks.

Coverage

The latest coverage run reports:

Metric          Coverage

Statements      100%
Lines           100%
Functions       100%
Branches       97.5%

The remaining uncovered branch is an error path inside the
encrypted-media upload helper; the main application and controller logic
is otherwise fully covered by the current suite.

Running Tests

Run the complete suite:

npm test

Run the coverage report:

npm run test:coverage

Run an individual suite:

npm test -- tests/controllers/userController.test.js

Tests use a dedicated Jest setup file to suppress expected application
error logs during test runs without changing production logging
behavior.

Test Structure

tests/
├── controllers/
│   ├── messageController.test.js
│   └── userController.test.js
├── middleware/
│   ├── auth.test.js
│   └── rateLimiter.test.js
├── routes/
│   └── userRoutes.test.js
├── jest.test.js
└── setup.js

The tests are intended to catch regressions in authentication,
authorization, real-time messaging behavior, data access, and
security-sensitive controller paths as the backend evolves.

Infrastructure as Code**

The current Terraform configuration manages the Azure resources used by
the production App Service deployment.

```text infra/terraform/ ├── main.tf ├── variables.tf ├──
terraform.tfvars.example └── .terraform.lock.hcl ```

Current managed resources include:

- Azure Resource Group - Azure Linux App Service Plan - Azure Linux Web
App

Terraform is intentionally separate from the application release
pipeline: infrastructure changes are managed through Terraform, while
container releases are handled by GitHub Actions.

Basic workflow:

```bash terraform init terraform fmt terraform validate terraform
plan terraform apply ```

`terraform.tfvars` is intentionally ignored by Git and must not be
committed.

## Docker

The backend includes a production Dockerfile.

Build the image:

```bash docker build -t circle-chat-backend . ```

The application container exposes port `8000`.

Images used by the deployment are published to GitHub Container
Registry.

## Kubernetes / K3s --- Legacy Deployment

The original Kubernetes deployment used:

```text k8s/ ├── deployment.yaml └── service.yaml ```

The workload was deployed to a single-node K3s cluster on the Azure VM,
with Traefik providing ingress and TLS termination.

The K3s environment is retained in the repository as the project's
**legacy deployment path** and as part of the infrastructure
history. The current production runtime is Azure App Service.

## Security Model

Circle Chat separates authentication from message confidentiality.

**Authentication**

```text Identity    ↓ JWT Authentication    ↓ Authorization ```

**Message Confidentiality**

```text Plaintext    ↓ Client-side Encryption    ↓ Ciphertext    ↓
Backend Relay    ↓ Ciphertext    ↓ Client-side Decryption    ↓ Plaintext
```

The backend therefore does not require access to users' raw private keys
or plaintext message contents to relay messages.

The project also includes a self-directed security audit covering:

- Unauthenticated WebSocket handshakes - JWT expiration - Login-flow
user enumeration - IDOR / access-control gaps - N+1 MongoDB queries

The N+1 query was replaced with a single MongoDB aggregation pipeline.

## API

The backend provides REST APIs for:

- Authentication - User profiles - Public key retrieval - Message
history - Media operations - Application resources

Real-time communication is handled through Socket.IO.

Relevant implementation areas:

```text routes/ controllers/ middleware/ models/ utils/ ```

## Production Verification

The current deployment has been verified for:

- Azure App Service connectivity - REST API requests - CORS -
Socket.IO - WebSocket Secure (WSS) - JWT socket authentication -
End-to-End message encryption/decryption - Real-time message delivery -
MongoDB Atlas integration - Cloudinary integration - Container image
deployment through GHCR - GitHub Actions CI/CD - Terraform-managed
infrastructure

## Git Workflow

Feature development uses Git branches.

```bash git checkout -b feature/my-feature git add . git commit -m
"feat: add my feature" git push -u origin feature/my-feature ```

Open a Pull Request against `main` after testing the changes.

## Project Structure

```text server/ ├── infra/ │   └── terraform/ ├── k8s/ │   ├──
deployment.yaml │   └── service.yaml ├── controllers/ ├── middleware/
├── models/ ├── routes/ ├── tests/ │ ├── controllers/ │ ├── middleware/
│ ├── routes/ │ └── setup.js ├── utils/ ├── Dockerfile ├── .dockerignore
├── .gitignore ├── server.js └── package.json ```

## License

See the repository license for the terms governing this project.