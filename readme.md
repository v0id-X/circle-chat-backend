# Circle Chat - Backend API

This repository contains the Node.js and Express.js backend infrastructure for Circle Chat, a real-time messaging application. The architecture is designed to handle seamless real-time communication, optimized database querying, and secure cloud-based media storage.

## Core Architecture & Features

* **Real-Time Communication:** Utilizes Socket.io for persistent, full-duplex communication channels. This facilitates instant message delivery, online user state tracking, and live typing indicators.
* **Cursor-Based Pagination:** Implements high-performance history fetching using MongoDB `_id` timestamps as cursors. This ensures efficient infinite scrolling on the client side without duplicate data rendering or offset skipping.
* **Cloud Media Integration:** Offloads media storage to Cloudinary. Image buffers are uploaded securely via the API, keeping the primary MongoDB database lightweight and focused strictly on relational data and message metadata.
* **Secure API Architecture:** Features JWT-based authentication for protected routes and environment-variable-driven CORS configuration, optimized for decoupled client-server deployments across different domains.

## Technology Stack

* **Runtime Environment:** Node.js
* **Web Framework:** Express.js
* **Database:** MongoDB Atlas (accessed via Mongoose)
* **Real-Time Engine:** Socket.io
* **Authentication:** JSON Web Tokens (JWT) & bcryptjs
* **Media Storage:** Cloudinary
