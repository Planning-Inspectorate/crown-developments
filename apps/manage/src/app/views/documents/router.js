import { Router as createRouter } from 'express';
import * as controllers from './controller.js';

const router = createRouter({ mergeParams: true });

router.route('/').get(controllers.renderViewReceivedDocuments);

export default router;
