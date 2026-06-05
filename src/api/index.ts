import 'dotenv/config';
import app from '../app';

// Vercel serverless handler — export `app` directly.
// Vercel will invoke the Express app as a function without calling app.listen().
export default app;
