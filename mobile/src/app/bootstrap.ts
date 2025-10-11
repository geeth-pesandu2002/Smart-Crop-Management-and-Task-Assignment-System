import { ensureDb } from '../db';
import { seedIfEmpty } from '../db/tasks';

export function bootstrap() {
  ensureDb();
  seedIfEmpty();
}
