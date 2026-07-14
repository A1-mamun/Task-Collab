import http from 'http';
import app from './app';
import config from './app/config';
import prisma from './app/utils/prisma';

let server: http.Server;

async function main() {
  try {
    // connect to the database
    await prisma.$connect();
    console.log('Connected to PostgreSQL database successfully');

    server = app.listen(config.port, () => {
      console.log(`App listening on port ${config.port}!`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

process.on('unhandledRejection', (reason) => {
  console.log('Shutting down the server due to Unhandled Promise Rejection');
  console.error(reason);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on('uncaughtException', (reason) => {
  console.log('Shutting down the server due to Uncaught Exception');
  console.error(reason);
  process.exit(1);
});
