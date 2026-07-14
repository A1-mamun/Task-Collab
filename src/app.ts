import cookieParser from 'cookie-parser';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import router from './app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import config from './app/config';
const app: Application = express();

const allowedOrigins = config.frontendUrls
  ? config.frontendUrls.split(',').map((origin) => origin.trim())
  : [];
console.log(allowedOrigins);
// parser
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const date = new Date().toISOString();
  const method = req.method;
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  console.log(`[${date}] ${ip} → ${method} ${fullUrl}`);
  next();
});

// application routes
app.use('/api/v1/', router);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello From Task Collab!');
});

app.use(globalErrorHandler);

app.use(notFound);

export default app;
