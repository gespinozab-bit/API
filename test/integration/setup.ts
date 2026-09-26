import 'reflect-metadata';

// Never inherit a development or externally configured database connection.
// beforeAll replaces this sentinel only with the URI of its own new container.
process.env.DATABASE_URL =
  'postgresql://disabled:disabled@127.0.0.1:1/disabled';
