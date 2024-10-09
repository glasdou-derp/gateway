<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

# Gateway

This is the gateway service that is responsible for routing requests to the appropriate microservice. It is built using NestJS, Nats, and Redis.

## Installation

1. Clone the repository
2. Copy the `.env.template` file to `.env` and fill in the required environment variables
3. Run `pnpm install` to install the dependencies
4. Run `docker compose up -d` to start the database
5. Run `pnpm start:dev` to start the development server
