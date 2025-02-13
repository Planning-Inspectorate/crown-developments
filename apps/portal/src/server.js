import { getApp } from './app/app.js';
import { loadConfig } from './app/config.js';
import { getLogger } from '@pins/crowndev-lib/util/logger.js';
import { memoryUsage } from 'node:process';
import { bytesToUnit } from './app/views/files/controller.js';

const config = loadConfig();
const logger = getLogger(config);

const app = getApp(config, logger);
// Trust proxy, because our application is behind Front Door
// required for secure session cookies
// see https://expressjs.com/en/resources/middleware/session.html#cookiesecure
app.set('trust proxy', true);

// set the HTTP port to use from loaded config
app.set('http-port', config.httpPort);

// not for production use, just for debugging!
// to verify that the app is not downloading the whole file into memory for downloads
let usage = 0;
setInterval(() => {
	const latestUsage = memoryUsage.rss();
	if (latestUsage === usage) {
		return;
	}
	usage = memoryUsage.rss();
	console.log(bytesToUnit(usage));
}, 1000);

// start the app, listening for incoming requests on the given port
app.listen(app.get('http-port'), () => {
	logger.info(`Server is running at http://localhost:${app.get('http-port')} in ${app.get('env')} mode`);
});
