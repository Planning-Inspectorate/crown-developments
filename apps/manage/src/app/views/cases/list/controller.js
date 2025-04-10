/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildListCases(service) {
	const { db, logger } = service;
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
		fields.location = `Northing: ${crownDevelopment.siteNorthing?.toString().padStart(6, '0') || '-'}\n`;
		fields.location += `Easting: ${crownDevelopment.siteEasting?.toString().padStart(6, '0') || '-'}`;
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
