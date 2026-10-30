import { execSync } from 'child_process';

const resolveCommit = () => {
  if (process.env.RENDER_GIT_COMMIT && process.env.RENDER_GIT_COMMIT.trim()) {
    return process.env.RENDER_GIT_COMMIT.trim();
  }
  if (process.env.GIT_COMMIT && process.env.GIT_COMMIT.trim()) {
    return process.env.GIT_COMMIT.trim();
  }
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
  }
};

export const SERVER_COMMIT = resolveCommit();
export const SERVER_START_TIME = new Date().toISOString();
