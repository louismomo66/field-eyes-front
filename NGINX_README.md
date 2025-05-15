# Field Eyes Deployment with NGINX

## Application Configuration

The Field Eyes application has been configured to run under the `/app` base path to match the NGINX configuration. This means all routes and assets are prefixed with `/app`.

Key changes made:

1. Added `basePath: '/app'` to `next.config.mjs`
2. Added `assetPrefix: '/app'` to ensure static assets are properly referenced
3. Created a utility function `getAssetPath()` for handling asset URLs
4. Updated navigation components to work with the base path

## NGINX Configuration

The provided NGINX configuration routes the application as follows:

- Static website files are served from `/var/www/html`
- The Next.js application is served under the `/app` path and routes to port 3000
- API requests are proxied to port 9002
- MQTT WebSocket connections are proxied to port 9001

## Deployment Steps

1. Build the Next.js application:
   ```
   npm run build
   ```

2. Deploy the `.next` folder to your server

3. Start the Next.js server on port 3000:
   ```
   PORT=3000 npm start
   ```

4. Ensure your NGINX configuration is in place at `/etc/nginx/sites-available/field-eyes.com`

5. Create a symlink to enable the site:
   ```
   ln -s /etc/nginx/sites-available/field-eyes.com /etc/nginx/sites-enabled/
   ```

6. Test the NGINX configuration:
   ```
   nginx -t
   ```

7. Reload NGINX:
   ```
   systemctl reload nginx
   ```

## URL Structure

With this configuration, your URLs will look like:

- Main app dashboard: `https://field-eyes.com/app/dashboard`
- Device page: `https://field-eyes.com/app/dashboard/devices/{deviceId}`
- API endpoint: `https://field-eyes.com/api/readings`
- MQTT WebSocket: `https://field-eyes.com/mqtt` 