import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

const execFileAsync = promisify(execFile);

export class TemporaryPostgres {
  private container?: StartedPostgreSqlContainer;
  private client?: PrismaService;
  private uri?: string;
  private migrationDirectory?: string;
  private readonly previousUrl = process.env.DATABASE_URL;

  async start(): Promise<PrismaService> {
    const database = `inventory_test_${randomUUID().replaceAll('-', '')}`;
    const password = randomUUID();
    try {
      this.container = await new PostgreSqlContainer('postgres:17-alpine')
        .withDatabase(database)
        .withUsername('inventory_test')
        .withPassword(password)
        .withLabels({ 'inventory.integration': 'block-05' })
        .withStartupTimeout(120_000)
        .start();

      this.uri = this.container.getConnectionUri();
      const parsed = new URL(this.uri);
      if (
        parsed.port === '5433' ||
        Number(parsed.port) !== this.container.getPort() ||
        decodeURIComponent(parsed.pathname.slice(1)) !== database
      ) {
        throw new Error(
          'Refusing a connection that does not identify the temporary container.',
        );
      }
      process.env.DATABASE_URL = this.uri;
      console.info(
        `TEMPORARY_POSTGRES_URI=${this.uri.replace(password, '***')}`,
      );
      console.info(`TEMPORARY_POSTGRES_ID=${this.container.getId()}`);

      // Prisma CLI loads .env automatically: give it an isolated schema directory
      // containing only the versioned schema and migrations, never project .env.
      this.migrationDirectory = await mkdtemp(
        join(tmpdir(), 'inventory-migrations-'),
      );
      await cp(
        resolve('prisma/schema.prisma'),
        join(this.migrationDirectory, 'schema.prisma'),
      );
      await cp(
        resolve('prisma/migrations'),
        join(this.migrationDirectory, 'migrations'),
        { recursive: true },
      );
      const migration = await execFileAsync(
        process.execPath,
        [
          resolve('node_modules/prisma/build/index.js'),
          'migrate',
          'deploy',
          '--schema',
          join(this.migrationDirectory, 'schema.prisma'),
        ],
        {
          cwd: this.migrationDirectory,
          env: { ...process.env, DATABASE_URL: this.uri },
          timeout: 120_000,
        },
      ).catch(() => {
        // Do not expose connection credentials in child-process errors.
        throw new Error(
          'prisma migrate deploy failed on the temporary database.',
        );
      });
      console.info(migration.stdout.replaceAll(password, '***').trim());

      // Construct the real PrismaClient subclass only after configuring DATABASE_URL
      // and deploying migrations. An explicit datasource also prevents env fallback.
      this.client = new PrismaService({
        datasources: { db: { url: this.uri } },
      });
      await this.client.$connect();
      return this.client;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  assertIsolated(): void {
    if (
      !this.container ||
      !this.client ||
      !this.uri ||
      process.env.DATABASE_URL !== this.uri ||
      new URL(this.uri).port === '5433'
    ) {
      throw new Error(
        'Refusing cleanup outside the temporary PostgreSQL container.',
      );
    }
  }

  async stop(): Promise<void> {
    try {
      await this.client?.$disconnect();
    } finally {
      this.client = undefined;
      try {
        if (this.container) {
          const id = this.container.getId();
          await this.container.stop({
            timeout: 10_000,
            remove: true,
            removeVolumes: true,
          });
          this.container = undefined;
          console.info(`TEMPORARY_POSTGRES_REMOVED=${id}`);
        }
      } finally {
        if (this.previousUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = this.previousUrl;
        if (this.migrationDirectory) {
          const target = resolve(this.migrationDirectory);
          if (
            dirname(target) !== resolve(tmpdir()) ||
            !basename(target).startsWith('inventory-migrations-')
          ) {
            throw new Error(
              'Refusing to remove an unexpected migration directory.',
            );
          }
          await rm(target, { recursive: true, force: true });
          this.migrationDirectory = undefined;
        }
      }
    }
  }
}
