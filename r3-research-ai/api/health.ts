import {handle} from '../server/chat';

// GET /api/health — Vercel Node.js Function
export default {
  fetch(request: Request) {
    return handle(request);
  },
};
