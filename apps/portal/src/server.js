import { getApp } from './app/app.js';
import {loadConfig} from './app/config.js';
import {getLogger} from '#util/logger.js';

const config = loadConfig();
const logger = getLogger();

const app = getApp();
// set the HTTP port to use from loaded config
app.set('http-port', config.httpPort);

// start the app, listening for incoming requests on the given port
app.listen(app.get('http-port'), () => {
    logger.info(
        `Server is running at http://localhost:${app.get('http-port')} in ${app.get('env')} mode`
    );
});