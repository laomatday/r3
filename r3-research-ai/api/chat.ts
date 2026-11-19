import {handle} from '../server/chat';

// POST /api/chat — Vercel Node.js Function
export default {
  fetch(request: Request) {
    return handle(request);
  },
};
