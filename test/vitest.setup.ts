import 'reflect-metadata';
import { vi } from 'vitest';

// Compatibility for existing Jest mocks; new tests should import vi from Vitest.
Object.assign(globalThis, { jest: vi });
