# Circle Chat - Backend API

This repository contains the Node.js and Express.js backend infrastructure for Circle Chat, a secure, real-time messaging application. The architecture is designed to handle seamless real-time communication, zero-knowledge cryptographic storage, optimized database querying, and secure cloud-based media storage.

## Core Architecture & Features

* **Zero-Knowledge Cryptographic Storage (Cross-Platform E2EE):** Facilitates multi-device End-to-End Encryption. The backend operates as a "blind relay" that never sees raw private keys or plain-text message payloads. It strictly stores the user's public key alongside their password-wrapped private key (ciphertext), cryptographic salts, and nonces. 
* **Secure Authentication & Key Delivery:** Features standard JWT-based authentication layered alongside cryptographic payload delivery. Upon a successful `bcrypt` password verification, the API securely serves the user's encrypted key vault back to the client for local unwrapping.
* **Real-Time Communication:** Utilizes Socket.io for persistent, full-duplex communication channels. This facilitates instant encrypted message delivery, online user state tracking, and live typing indicators.
* **Cursor-Based Pagination:** Implements high-performance history fetching using MongoDB `_id` timestamps as cursors. This ensures efficient infinite scrolling on the client side without duplicate data rendering or offset skipping.
* **Cloud Media Integration:** Offloads media storage to Cloudinary. Encrypted image buffers (Base64 strings) are uploaded securely via the API, keeping the primary MongoDB database lightweight and focused strictly on relational data and message metadata.

## Technology Stack

* **Runtime Environment:** Node.js
* **Web Framework:** Express.js
* **Database:** MongoDB Atlas (accessed via Mongoose)
* **Real-Time Engine:** Socket.io
* **Authentication:** JSON Web Tokens (JWT) & bcryptjs
* **Media Storage:** Cloudinary