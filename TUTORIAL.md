# Complete Project Tutorial: Building a Microservices Wallet System

Welcome! This tutorial will walk you through every aspect of this project: a production-ready microservices architecture implementing a user management and wallet system. We'll explore **what** each component does, **why** it exists, **how** it works, and **why** these specific design decisions were made.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Getting Started](#getting-started)
4. [The Users Service](#the-users-service)
5. [The Wallet Service](#the-wallet-service)
6. [The Messaging Infrastructure](#the-messaging-infrastructure)
7. [Database Design](#database-design)
8. [Security & Authentication](#security--authentication)
9. [Observability & Operations](#observability--operations)
10. [Architecture Decisions](#architecture-decisions)
11. [Future Improvements](#future-improvements)

---

## Project Overview

### What is this project?

This is a microservices-based financial platform consisting of two independent services:

- **Users Service** (port 3002): Handles user registration, authentication, and profile management
- **Wallet Service** (port 3001): Manages digital wallets, balances, and transactions

### Why this architecture?

The project demonstrates several production-grade patterns:
- **Service independence**: Each service has its own database (database-per-service pattern)
- **Async communication**: Services communicate via RabbitMQ message queues, not direct HTTP calls
- **Reliability**: Uses the Outbox pattern to guarantee message delivery
- **Resilience**: Implements retry ladders and dead-letter queues for fault tolerance

### How does it work?

When a user registers:
