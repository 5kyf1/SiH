import mongoose from 'mongoose';
import geoip from 'geoip-lite';
import { Context, Next } from 'koa';

// MongoDB connection URI
const mongoURI = 'mongodb+srv://dankmater404:admin123@cluster0.9pq3hla.mongodb.net/Cluster0?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(error => console.error('Error connecting to MongoDB:', error));

// Define the request log schema
const requestLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String,
  geoLocation: String,
  httpHeaders: String,
  urlPath: String,
  queryParameters: String,
  connectionDuration: String,
  referrer: String,
  cookies: String,
  protocolType: String,
  portNumber: String,
  trafficVolume: Number,
  sessionId: String,
  requestMethod: String,
  responseTime: Number,
  statusCode: Number,
  requestPayloadSize: Number,
});

// Create a model from the schema
const RequestLog = mongoose.model('RequestLog', requestLogSchema);

// Middleware function to log the request data
export const logRequestData = async (ctx: Context, next: Next) => {
  const start = Date.now();

  // Log incoming request details
  console.log('Processing request:', {
    method: ctx.method,
    url: ctx.url,
    headers: ctx.headers,
    query: ctx.query,
    ip: ctx.ip,
  });

  await next();

  const duration = Date.now() - start;
  const geo = geoip.lookup(ctx.ip);

  const cookies = Object.keys(ctx.cookies.request || {}).map((cookieName) => {
    return { [cookieName]: ctx.cookies.get(cookieName) };
  });

  // Create a new log entry
  const logEntry = new RequestLog({
    ipAddress: ctx.ip,
    userAgent: ctx.headers['user-agent'] || '',
    geoLocation: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
    httpHeaders: JSON.stringify(ctx.headers),
    urlPath: ctx.url,
    queryParameters: JSON.stringify(ctx.query),
    connectionDuration: `${duration}ms`,
    referrer: ctx.headers['referrer'] || ctx.headers['referer'] || '',
    cookies: JSON.stringify(cookies),
    protocolType: ctx.protocol,
    portNumber: ctx.request.socket.localPort || '',
    trafficVolume: ctx.request.length || 0,
    sessionId: ctx.session ? ctx.session.id || '' : '',
    requestMethod: ctx.method,
    responseTime: duration,
    statusCode: ctx.status,
    requestPayloadSize: ctx.request.length || 0,
  });

  // Save the log entry to MongoDB
  try {
    await logEntry.save();
    console.log('Log entry saved to MongoDB');
  } catch (error) {
    console.error('Error saving log entry to MongoDB:', error);
  }
};
