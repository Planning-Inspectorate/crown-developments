/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Handler}
 */
export function buildListCases({ db, logger }) {
	return async (req, res) => {
		logger.info('list cases');

		const crownDevelopments = await db.crownDevelopment.findMany({
			select: {
				id: true,
				reference: true,
				siteNorthing: true,
				siteEasting: true,
				SiteAddress: true,
				Lpa: { select: { name: true } },
				Status: { select: { displayName: true } },
				Type: { select: { displayName: true } }
			},
			orderBy: {
				createdDate: 'desc'
			},
			take: 1000 // upper limit until pagination/search is implemented
		});

		return res.render('views/cases/list/view.njk', {
			pageHeading: 'All Crown Developments',
			crownDevelopments: crownDevelopments.map(crownDevelopmentToViewModel),
			containerClasses: 'pins-container-wide'
		});
	};
}

/**
 *
 * @param {import('./types.js').CrownDevelopmentListFields} crownDevelopment
 * @return {import('./types.js').CrownDevelopmentListViewModel}
 */
export function crownDevelopmentToViewModel(crownDevelopment) {
	const fields = {
		id: crownDevelopment.id,
		reference: crownDevelopment.reference,
		lpaName: crownDevelopment.Lpa?.name,
		status: crownDevelopment.Status?.displayName,
		type: crownDevelopment.Type?.displayName,
		location: ''
	};
	if (crownDevelopment.SiteAddress) {
		fields.location = addressToViewModel(crownDevelopment.SiteAddress);
	} else if (crownDevelopment.siteNorthing || crownDevelopment.siteEasting) {
		fields.location = `Northing: ${crownDevelopment.siteNorthing || '-'}\n`;
		fields.location += `Easting: ${crownDevelopment.siteEasting || '-'}`;
	}

	return fields;
}

/**
 * @param {import('@prisma/client').Prisma.AddressGetPayload<{}>} address
 * @returns {string}
 */
function addressToViewModel(address) {
	const fields = [address.line1, address.line2, address.townCity, address.county, address.postcode];
	return fields.filter(Boolean).join(', ');
}
