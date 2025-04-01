// a small script to read an LPA data CSV and output the appropriate Prisma inputs as JSON
//
// set LPA_DATA_FILE_PATH with the file path to a CSV
//
// assumes a CSV with the following headers:
// horizonLpaName,pinsLpaCode,onsLpaName,onsLpaCode,poBox,address1,address2,city,county,postCode,country,telephoneNo,emailAddress

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEADERS = Object.freeze({
	HORIZON_LPA_NAME: 'horizonLpaName',
	PINS_LPA_CODE: 'pinsLpaCode',
	ONS_LPA_NAME: 'onsLpaName',
	ONS_LPA_CODE: 'onsLpaCode',
	PO_BOX: 'poBox',
	ADDRESS_1: 'address1',
	ADDRESS_2: 'address2',
	CITY: 'city',
	COUNTY: 'county',
	POSTCODE: 'postCode',
	COUNTRY: 'country',
	TELEPHONE_NO: 'telephoneNo',
	EMAIL_ADDRESS: 'emailAddress'
});

async function run() {
	const contents = await readFile(process.env.LPA_DATA_FILE_PATH, 'utf8');
	const lines = contents.toString().split('\n').filter(Boolean).map(parseCSVLine);

	const headers = lines[0];
	if (headers.length !== 13) {
		throw new Error('Expected 13 columns');
	}
	const allMatch = lines.every((line) => line.length === headers.length);
	if (!allMatch) {
		throw new Error('Not all lines have the same number of columns');
	}

	const createInputs = lines
		.slice(1)
		.map((l) => mapToObject(headers, l))
		.map(toCreateInput);

	// quick data integrity check - ONS codes may not be unique, but should always have the same name
	const onsCodeToName = new Map();
	for (const lpa of createInputs) {
		if (lpa.onsCode) {
			if (onsCodeToName.has(lpa.onsCode)) {
				const name = onsCodeToName.get(lpa.onsCode);
				if (name !== lpa.name) {
					throw new Error(`Duplicate onsCode with different names, code: ${lpa.onsCode}, names: ${name}, ${lpa.name}`);
				}
			}
			onsCodeToName.set(lpa.onsCode, lpa.name);
		}
	}

	await writeFile(path.join(__dirname, 'data-lpa-prod-list.json'), JSON.stringify(createInputs, null, 2), 'utf8');
	console.log(`data-lpa-prod-list.json written with ${createInputs.length} LPAs`);
}

/**
 * @param {Object<string, string>} lpa
 * @returns {import('@prisma/client').Prisma.LpaCreateInput}
 */
function toCreateInput(lpa) {
	const address = {
		line1: lpa[HEADERS.ADDRESS_1] || null,
		line2: lpa[HEADERS.ADDRESS_2] || null,
		townCity: lpa[HEADERS.CITY] || null,
		county: lpa[HEADERS.COUNTY] || null,
		postcode: lpa[HEADERS.POSTCODE] || null
	};
	/**
	 * @type {import('@prisma/client').Prisma.LpaCreateInput}
	 */
	const createInput = {
		id: ONS_CODE_TO_ID[lpa[HEADERS.ONS_LPA_CODE]],
		name: lpa[HEADERS.ONS_LPA_NAME],
		pinsCode: lpa[HEADERS.PINS_LPA_CODE] || null,
		onsCode: lpa[HEADERS.ONS_LPA_CODE] || null,
		email: lpa[HEADERS.EMAIL_ADDRESS],
		telephoneNumber: lpa[HEADERS.TELEPHONE_NO] || null
	};
	if (Object.values(address).some(Boolean)) {
		// some address fields set
		createInput.Address = {
			create: address
		};
	}
	return createInput;
}

/**
 * @param {string[]} headers
 * @param {string[]} line
 * @returns {Object<string, string>}
 */
function mapToObject(headers, line) {
	const obj = {};
	headers.forEach((header, i) => {
		obj[header] = line[i];
	});
	return obj;
}

/**
 * Parse one line of a CSV file, handling quoted fields and escaped quotes
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
	const result = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				field += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(field);
			field = '';
		} else {
			field += char;
		}
	}
	result.push(field);
	return result;
}

run().catch(console.error);

// static mapping to ID - required for the question-generation to function which links by ID
const ONS_CODE_TO_ID = Object.freeze({
	ZZZZZZZZZ: '3e2dac35-d7fe-418d-b4b4-56f11fac108e', // test LPA
	E60000001: 'e4a24f35-5edf-4f04-bf18-ab0dfeb54d64',
	E60000002: '15598949-fb23-47ed-a81d-816df5ca96b5',
	E60000003: '93c94cc4-440e-4d3e-96a9-aee67a3d6e0d',
	E60000004: 'f73b824d-1749-4470-9d9f-4a8cfb390e18',
	E60000005: '37ff68f0-ec3c-4336-bafb-a71c3573ff5f',
	E60000006: '9612ca45-e369-403b-9271-fe6acaadda04',
	E60000007: '729d15a1-93c2-42a2-b618-ab042f4f810e',
	E60000008: '2c51b6ec-1c4d-45c8-9c6f-8f838d336296',
	E60000009: 'd5876719-c6c1-493d-bf0c-cea87394870c',
	E60000010: 'becdfba3-bb1a-4df9-8962-2fd1267e1a94',
	E60000011: '9f46f513-91b4-4fd4-961f-c44e4f73f2dd',
	E60000012: '012f9818-d76a-4a75-8d81-451aaecfcea6',
	E60000013: '58487234-0967-4d6e-bc9e-fc42f92b2766',
	E60000014: '4b23da6f-2c5b-46ba-8d2a-c696effc5cff',
	E60000015: '0bc77b41-1e7c-4cbc-b89d-5991937f05b0',
	E60000016: '6bd85f07-46bd-432b-a1be-7e7745075809',
	E60000017: '9c3d19f3-1bc9-4462-aa57-44f56b18c9fd',
	E60000018: '9d978ab0-2753-4c2b-87ce-6a3b51517f68',
	E60000020: 'd9baf6a5-8e87-454d-bc37-9faa0fbb4b44',
	E60000021: '615c4f06-8754-4e8f-80d2-9fda74f97ee2',
	E60000022: 'add8965a-4ca7-4b06-a358-bfbb77c09677',
	E60000023: '7d7ef1c6-8e4a-4b61-a270-20bb296734b9',
	E60000024: 'f0d0cec8-a4ea-454a-a3fb-16ab4be20f4f',
	E60000025: '5b3c6966-9ba9-4f86-9107-107cf2cc7e1e',
	E60000026: '712b9d48-4071-4d09-a0ae-d3e37b1fef6a',
	E60000027: '3ca2e942-107a-473f-983d-9d53fe75e988',
	E60000028: 'd0bb590d-ce58-413b-9213-a1f6c4f1a278',
	E60000029: '432a7ea2-d877-44f2-912f-574aa13e01d8',
	E60000030: '5bbb71fa-1957-41e6-b0c7-dfb7fc5ad16c',
	E60000031: 'f3f55f69-0258-4bfa-89b6-95edbf61e619',
	E60000032: '9659fdc6-c3f1-4b7c-bf4b-19a0805519da',
	E60000033: '52ec6d92-015f-490d-9349-7906e1822cd6',
	E60000034: '8a4d9569-2092-4173-a7a3-ffd63701cfb7',
	E60000035: 'b38dc314-6abd-4002-ac9e-b3a376c0ec51',
	E60000036: '510e72fd-4991-40c2-86c0-801797925114',
	E60000037: '07cc4a68-50a2-4677-a3fb-fbd72f02255c',
	E60000038: '59a7915c-fa86-47fc-a7ac-4bdd4612e4ed',
	E60000039: '30c45a02-d80d-45e6-b8ad-97444316290f',
	E60000040: 'af13560e-c46e-4574-92ea-d698f82fdc7b',
	E60000041: '42cc948a-8641-4282-b98a-2ea1610908e6',
	E60000042: 'df3f9dc8-8f81-4265-b3b8-bd6eaf66282d',
	E60000043: '24d1e3ba-80e5-488f-b3d3-9257c3d142a6',
	E60000044: 'a9e6138e-aaa9-4067-9052-50775f05d62c',
	E60000045: '83e02603-c40c-4d16-90e5-ca809d3b4c72',
	E60000046: '5cb4da20-f93e-46ab-938d-560c43ab20c1',
	E60000047: 'df605b8e-f5cc-4eb8-8192-a86c46bb584c',
	E60000048: 'ccb614d7-2408-4ecb-990c-ffa58681a718',
	E60000049: 'a24ef87e-8bc7-4909-87c3-d5d6c1707457',
	E60000050: 'b8c0c48c-eb60-44d6-bf26-e93092f9a30e',
	E60000051: '03bb2a4b-fd6d-4633-bf49-e40eae39390e',
	E60000052: '9880dc22-08a0-427e-9d43-148cb579ecd3',
	E60000053: '3f8a5b77-c5e5-47c9-944d-d2dda56eb8ee',
	E60000054: 'a8c3f911-a04e-41e0-bf9e-358543fececc',
	E60000055: 'f588937a-221f-4b79-a717-a2cde9336001',
	E60000056: 'c0ba65fe-0c64-4239-835a-19882ea89674',
	E60000057: '529364bd-8bdc-420c-b5f9-33b8a176aef4',
	E60000058: '88233822-fe49-493e-a079-361d1a78b869',
	E60000059: 'e836585a-b898-4483-8fb6-0d4fa5f4144d',
	E60000060: 'fed02e18-635a-479f-b250-1f79986fa2e1',
	E60000061: 'ffe4db5c-5cb5-411e-a160-ec37cc680b51',
	E60000062: 'abc6af8e-3a01-43da-ad0b-66f8f856dd80',
	E60000063: '368ba2a6-9daa-46e0-94de-72f24dd34f34',
	E60000064: '7b6fbec4-6190-4e59-9291-d486d24818de',
	E60000065: '8b0e92a0-c7c7-4dbb-b94b-66c95256aa4c',
	E60000066: '89da4df6-713f-446b-a88b-01e5ae0a032e',
	E60000067: '2177de57-4022-49c2-804c-dc6d7e86c265',
	E60000068: '6db38cdb-a6a0-47d4-b3f0-8c49e5790ed0',
	E60000069: '5651ee6d-eeef-42d3-9fd2-76f9b29f3288',
	E60000070: 'dcefc43c-74a3-4401-89c2-22528ba22f84',
	E60000071: '5336d913-16a2-4e31-b3a9-47b0fc178147',
	E60000072: '62adbfbe-c52b-4204-8a8e-2c711852a324',
	E60000073: '1d37ef7b-29a6-4d6e-acd9-7b5a12cf30bb',
	E60000074: '636b9df4-559c-4d4f-bcf5-6d4681cf42af',
	E60000075: 'fb30b862-54ce-45c1-9309-5dcce27d2e7e',
	E60000076: '69dc48c5-264d-401f-b276-1cd020c78d65',
	E60000077: '176f346a-7de4-4c0b-a6cb-7a38fc08235f',
	E60000078: 'bbd23aef-82fc-4641-8e5c-92914860157a',
	E60000079: '56fbc517-018c-4529-b800-4dcf6eaa7946',
	E60000080: 'f9227ecb-ef4e-4ed0-9c32-764bc4df4227',
	E60000081: '4d579cd8-dbcc-46a0-8665-2cc3bbd901fb',
	E60000082: 'e59b44d8-9145-475d-9a02-e1824af1e290',
	E60000083: '604de1c8-7113-48fe-9136-c7746bfc75cb',
	E60000084: 'e36971a3-60f7-4c9b-b9a7-3429a5064994',
	E60000085: 'a7fd66f7-4c91-4642-a068-e122fd769dd1',
	E60000086: '4ba298dc-30b8-42ea-a3d6-c2f3654e73ec',
	E60000087: '14c834cd-13c1-420a-8f22-33ec9175df23',
	E60000088: 'd58a435c-d989-498b-b557-d66b28ecd1c8',
	E60000089: 'cb7b4e4c-a8b7-42f6-8fb5-79367cb7a8d0',
	E60000090: 'ea0402d0-176e-40e7-87c0-5f9731253fa9',
	E60000091: '948c79f9-6c5e-4f59-8d26-ea6b38359ec4',
	E60000092: '51af865d-1b3c-492a-a470-09b9a89f274d',
	E60000093: '2561a694-119e-4e0e-b793-09223ab19f2e',
	E60000094: 'd6935ee3-8670-4b7b-b66a-6fe48b3c9d2d',
	E60000095: '1ec7e713-f538-4179-b9b6-41a758e0c774',
	E60000096: 'ea0dcaa9-0c7f-4ff0-b606-0dda885269af',
	E60000097: '3cdd8bc4-d00e-4ccc-b9d6-9db018fd8f42',
	E60000098: 'b9286618-f339-42c9-81c9-eb2ab7ae9bcb',
	E60000106: 'f57ce9eb-40f2-4968-a4c3-c0c484f085ab',
	E60000107: '989982bc-edd9-4a57-99dc-0652f743529c',
	E60000108: '1d9eba04-c9ed-4409-9d98-9133554a78a1',
	E60000109: 'b3f7fdc0-6d70-4da1-927f-c806242b4fa2',
	E60000110: 'b2ac8f70-1fd4-426b-8110-12f87a57f9e7',
	E60000111: '2f033e7b-02b7-442c-94b1-a9c9b3ae6af0',
	E60000112: '074abd18-d7a0-4b41-8fc3-57addc14a6f9',
	E60000113: 'fd47f072-f9b1-480e-b704-67be2131b0a4',
	E60000114: '6b4a18c8-b79b-4e01-81c5-ccf7286bc7be',
	E60000115: '5360857c-e1da-4038-8690-e58cc3e8500b',
	E60000116: '02b90494-47eb-4d51-9dc3-7d5aa084c3ff',
	E60000117: '6cb40267-5efd-491c-af34-79ccfd36f39d',
	E60000118: 'e5e1999b-cd15-46b7-b49e-502f771d2a1d',
	E60000119: 'e7f9fee3-c040-4676-8fe8-c1f73f200ce6',
	E60000120: 'f0128041-8009-417e-a224-432673b17865',
	E60000121: '4950e08d-0beb-49b0-adae-435a24b86607',
	E60000122: 'f81fd9f3-4782-4c5d-93e9-8f743e62fac9',
	E60000123: '78e437f3-8e77-49cc-a53c-796d70552ae8',
	E60000124: '1ada4757-cca0-4f51-bb0c-68d084c08f99',
	E60000125: 'ad9fd481-24ca-4aaa-8184-b2d31c22c9cf',
	E60000126: 'fa39cb57-81c6-4c3e-94fa-5ca83fd58888',
	E60000127: 'aa8135b1-069f-4041-9ad4-2122644d0d37',
	E60000128: '1647cc82-15bd-4b50-be5f-563ded62cd00',
	E60000129: '0f604c26-9c68-4073-bb89-4db63bcdbb59',
	E60000130: 'ee013bb8-d9c0-4ad8-83ee-024ea57a0ede',
	E60000131: '765bad3c-8552-4034-8e7a-13aa6818ac73',
	E60000132: 'e8d6e6b4-c0a6-4656-89a3-54203d0d303d',
	E60000133: 'e21a6b91-e34f-4aba-91e8-06b08d7089b4',
	E60000134: '8afcb189-509e-447a-93e8-940427c6bfc7',
	E60000135: 'b4bff5d3-9069-4847-bacb-b1b2195b1a2a',
	E60000136: '70936547-db04-4389-9057-b3b40d621cbd',
	E60000137: '5efaaf91-107e-40bb-bb07-aed073fd8c6f',
	E60000138: 'e58d182d-f863-4334-9260-4adcbe07953a',
	E60000139: '7c5814a1-ce2b-4d67-8f68-679d35475f0e',
	E60000140: '1b9f7a86-ac9b-4a59-8c69-ceabbd14cdb2',
	E60000141: '398aa3a0-7a19-40b6-8df1-6cfecb2da51a',
	E60000142: '0767f55d-47ec-46e8-9727-85d623b318eb',
	E60000143: 'fbfc2fe5-d801-46ec-be89-f7d8cfadcffb',
	E60000144: '5abf645b-6387-4f2b-9c2a-b66e1d81c8de',
	E60000145: '853363fb-5b89-450b-8a46-918ec3eee11c',
	E60000146: 'a363103d-4210-4c47-936e-6532876b6ee0',
	E60000147: '651b837a-6495-419f-abe5-292128804b11',
	E60000148: '86c46152-58b3-44d9-a9e6-8d2b39257f35',
	E60000149: '57812375-7872-44f6-8ab0-4bb1580e60a8',
	E60000150: 'c81b48f1-6b47-4c27-8b7c-55768965d10c',
	E60000151: '5ac8b58e-f160-4df5-b53a-a8dc9d77fef9',
	E60000152: 'f207d3d1-d909-43f6-b7d0-7b101c6b3a65',
	E60000153: 'cd9291e5-ae74-48f9-a40e-b32f45a98f84',
	E60000154: 'ea242e1d-0878-4396-a6ba-92b0d1db2eb1',
	E60000155: '446ab70d-be0e-405b-bf95-126769898557',
	E60000156: '9ee14078-64ad-4081-9745-ad8c7c5e3126',
	E60000157: '06ed84c4-3204-419d-91a9-a6dd22401cb2',
	E60000158: '1ec743ba-0dce-467b-881c-92f5108b5202',
	E60000159: '4fcc32ea-d0f9-43ae-b3cd-4d647b75838a',
	E60000160: '9e3160f2-a671-4102-acf4-0a3d7ad1aeb9',
	E60000161: '1a155393-ddf0-4bf0-a031-6d0ca966551a',
	E60000162: '2ad7c715-8999-4c40-a04d-6d8525128529',
	E60000163: 'b99ee523-f396-453a-aca0-61c856dc5a3d',
	E60000164: 'e8d20bf4-a63b-4ef3-ac23-ba53044019fa',
	E60000165: '0bd40dad-13d1-4c2e-b810-9a5e56b8cb13',
	E60000166: '2d6ef9ca-a37d-464b-90d3-12d1bfd8de59',
	E60000167: '964a6dca-3b76-4f64-81f8-177aa4f72f6d',
	E60000168: 'd6f4453d-3048-48a5-88ce-5b142e2bf09f',
	E60000169: 'df39ba28-0a62-4286-a372-cb157f035231',
	E60000170: '4ee730a6-8a51-45d6-861f-d0b38a176748',
	E60000171: '5694487c-c2b4-4133-b703-aa1af1ff4c5a',
	E60000172: '226029f1-aab4-440f-9eca-94ca91d28852',
	E60000173: 'c009853a-3cc2-474f-a57f-14f5ada3d91b',
	E60000174: '511ef240-d57a-490a-8a01-4e710040d5d1',
	E60000175: '37afe756-7b68-48b7-bfca-23df0570cafd',
	E60000176: '05ce1f7c-1383-4ffb-b14a-2613e03f2679',
	E60000177: '371a0e0a-fcc1-4762-a2e6-70624f6b9c06',
	E60000178: '4b909b38-543b-4a63-9bc6-5fcc091f4c4b',
	E60000179: 'f0407ab4-309b-4455-9874-3917ea58c501',
	E60000180: '36c5e4ec-9c09-47cc-a9e8-c2675db106b2',
	E60000181: 'd641fec9-2ca5-48fd-8a62-d07b057b135d',
	E60000182: 'd1ec2087-b3f0-45e5-84cf-a67ee0a33445',
	E60000183: 'c58f73b8-44d0-4a7e-97fb-38c527c3f668',
	E60000184: '2381f102-b321-4bcc-a4c9-a242495660e2',
	E60000185: '05bc1502-e998-450f-be0f-2b8ea06db3c3',
	E60000186: '50e82be8-458d-4e7f-af6e-fe6db08020aa',
	E60000187: '719b3411-7689-41be-9e4c-be0642659849',
	E60000188: 'c19c86f5-ca94-4a6c-90c6-9321338af603',
	E60000189: 'c354c2c7-279d-43ab-afbf-7d1429651418',
	E60000190: '53459602-36ba-451c-9cb6-e5c0c43652d6',
	E60000191: '240508d9-6e5b-4727-990e-e7ea58100bb0',
	E60000192: 'c829bbdf-34dd-4a15-b5da-72ffe7309218',
	E60000193: '1f938dfb-ce4a-416b-aaa0-07f930099495',
	E60000194: '61710ef3-d962-417c-aa62-aa2251915a6b',
	E60000195: 'c56b3135-c40a-4ee2-a9c4-b3a3b3512b0b',
	E60000196: '4ac13f60-3574-43dc-8094-be07067c13e8',
	E60000197: '5e0ef760-230d-4bce-897a-9595ddd21416',
	E60000198: '02ec16ab-c27a-4e5f-a794-89ffebec24d8',
	E60000199: 'ad9c58a3-4bbc-47f9-bfbf-a1c240443bf2',
	E60000200: '46e800e7-56c4-4415-baac-140b189c38c3',
	E60000201: '9f555987-d3ce-4e15-abda-a1b61beba84b',
	E60000202: 'e32309a2-fdec-420a-85ed-e458d034b738',
	E60000203: '218d01dd-d460-4b17-bcd8-92041dd9a2de',
	E60000204: 'fd2fe5cd-1e73-47b4-8a67-f4758b641e23',
	E60000205: '3ee3408d-012e-4317-94df-9ac0e0301d9d',
	E60000206: '7c49a321-6bfb-4c2d-8fda-fb0a331adda4',
	E60000207: '38984328-6365-469f-b7cd-fe51d437ac50',
	E60000208: 'a0ae908a-dc56-4eb5-9fd0-deb72c7f01c9',
	E60000209: '8cf05873-52d2-4290-be0b-2f71f7ba8d85',
	E60000210: 'aba82689-b72a-4a94-969a-0e9583e31e91',
	E60000211: '34bf8e3b-9dd8-444e-902b-f3aa4c5a8d61',
	E60000212: '0abf435d-881b-4fca-b25f-88cdabfe0fa7',
	E60000213: '0920b66f-ffe6-4e13-b7c1-1bf512d6eb2a',
	E60000214: '88b81049-fa77-4fed-a236-b071e695024d',
	E60000215: 'e4d16bc6-5e33-4cd2-a8c2-9b2e45d8723d',
	E60000216: 'eb5a9033-f4ca-4e87-942d-bcfdbf481f5b',
	E60000217: 'b18ad3ae-b488-4d15-bcf2-bfeb48306fd1',
	E60000218: '088f79a5-d79e-4fc2-b27a-27fe1bf72375',
	E60000219: 'de9ea32a-a26e-400a-8c71-b56f7bdd396a',
	E60000220: '07d0acde-1c26-4b18-9bf1-74368f608a1a',
	E60000221: 'a7146c8c-1560-4b2c-abd7-338c509dd574',
	E60000222: 'a2340930-cd33-41a7-a35c-07b1c58eb57d',
	E60000223: '3bc9eec6-79e1-4cab-8b1e-2b3b356109ea',
	E60000224: '735edbd5-49b0-445c-80bf-13962e911e5d',
	E60000225: '85de1709-1236-42d5-84e4-8050ced96dac',
	E60000226: '9f9c17ff-93bc-490a-a2f7-47ab92151958',
	E60000227: 'a52d3ab0-3467-476a-bbf0-8dc4254f3159',
	E60000228: '00525d4b-8582-4c6a-8333-960c7b50e9db',
	E60000229: 'addea9cd-76d0-4127-b5b1-63e80fbcd0c1',
	E60000230: 'd00299c6-e4fd-48b9-89a9-fc2c1514f159',
	E60000231: '056d7369-7003-4293-8eb5-869e79631349',
	E60000232: '2b9aeaa6-10c4-4501-9414-0d1f1fc62441',
	E60000237: '06490e18-62d2-455d-ba89-e844b8ea7688',
	E60000238: '0c0c4028-aa2b-4ce0-a7de-aa51a7b64015',
	E60000239: '15bb14e7-c1c1-4c4e-a3f8-e395d3b553e7',
	E60000240: '6dd311da-4a7f-4f08-84ee-ea7655b36372',
	E60000241: '9b9501fc-c523-4e8a-ac2f-ee662a1a34b7',
	E60000242: '6b26e78f-3c09-426d-93bf-2fe6bed292f1',
	E60000243: 'a6ede4ca-d5f3-4813-b6c4-b6bf05626f76',
	E60000244: '0834e58e-7f08-435f-ad06-c62a172960dd',
	E60000245: 'd0d5426c-3392-4b7f-a4f9-d24aee96048d',
	E60000246: '97cac9a1-2886-4d44-9acd-7b2aa1797f7f',
	E60000247: 'd21bb72e-8335-451d-b44e-6b9308eb6c5a',
	E60000248: 'ddabb7ea-7ad0-4290-94ae-c39318058c94',
	E60000249: '0db33842-e2dd-4a00-b0e9-1675f7051aa8',
	E60000250: 'ff27c95b-25ae-4ebd-8153-0d2eed17fc46',
	E60000251: 'eab17ed8-8b51-4641-8699-542bd8dcc6b0',
	E60000252: '37bd039d-982f-4261-8e30-eaeb5dedd84f',
	E60000253: '55f9789d-f30e-4ffb-b732-af6f41245a8e',
	E60000254: '1963d92e-4df1-4a13-948f-bc241e97e5b9',
	E60000255: '1a37bde4-2fab-43ee-bd85-2ed59ea4bbac',
	E60000256: 'e7d53717-605c-40b0-9fd7-2dc713ee56e6',
	E60000257: '34e1675c-a21f-41c8-b071-db968b8b2270',
	E60000258: 'b66db4a3-1934-4f50-9144-ec6ba9d37764',
	E60000259: '4d82d85d-5244-4327-bc16-a48726fa79f0',
	E60000260: '17101fde-ba75-4a4f-88fd-90c4c0ed6f3b',
	E60000261: '35777738-944d-409b-a025-12a8138096e0',
	E60000262: 'b1bcec60-d1f7-43b8-a8c4-87c8444e0b5d',
	E60000263: '069c860d-7752-4632-a17f-9753dc73a759',
	E60000264: 'd1cb7507-a345-49dd-b580-a38c8c01678e',
	E60000265: 'aa4b7a90-c10e-4a58-8eea-72bad7947995',
	E60000266: '9c0f9261-9c19-40f2-badd-ca88c1fc8ab6',
	E60000267: '4b0b0c4e-51c6-40c0-a829-36b8214df216',
	E60000268: '6a5d02b8-2b16-4731-a984-4e81bb58426b',
	E60000269: '666296c3-0048-4f17-bd9a-33d6f29a4a23',
	E60000270: '599b2c3c-e44b-4a66-a596-56d71e36bfd3',
	E60000271: 'a0a192f5-fbe1-403f-a99e-eb14f2f974e9',
	E60000272: '47736758-7e4d-46e4-96b9-fbb42fbb7fcc',
	E60000273: '99bc3590-7028-4ea4-b657-ce4f50cf3884',
	E60000274: '6113e366-2b0f-4bd5-a7b7-e9134f89dd5c',
	E60000275: '9fe68fc7-e9a7-4910-8220-3c6a41a749a3',
	E60000276: '0c85c738-4d61-4923-9864-5124acbee742',
	E60000277: 'b8fe5ed7-6683-4157-a38f-692f90dcbbcc',
	E60000278: '982bea28-be03-44f2-816f-17cecb0e465a',
	E60000279: 'cff49edc-c7c8-4b96-8778-faa7988045dc',
	E60000280: '82bc0178-b01a-4a3d-af05-19079fced01d',
	E60000281: '5b54bc78-fc77-4862-9567-fca5b6c209d1',
	E60000282: 'ddf7e536-abb8-4bb0-84e7-265ff8564e2d',
	E60000283: '0e3273cf-be67-4856-992a-359659ccc24a',
	E60000284: 'd8c9287f-8073-48eb-bdae-88b81d163a48',
	E60000285: 'a0c7c396-3993-410e-baab-9a600347946a',
	E60000286: 'e8ffb167-043b-4d22-8c64-06eccd462e94',
	E60000287: '656859d9-f30b-4ac9-bac6-751d4aa7c323',
	E60000288: 'c98fa6b2-f879-4927-a182-dce7f5918d73',
	E60000289: 'cfaf5518-c5d4-41a6-8a2b-f38033f5e707',
	E60000290: 'bdcdf46a-192c-4b45-b7d7-d98076ef7482',
	E60000291: '154c1371-39b1-4f13-960d-96f87d5a0be6',
	E60000292: '07a2ca3f-1b85-404f-b04c-07fcf94da9b6',
	E60000293: '1943a73d-ba12-4801-aab2-e12d2f04bc26',
	E60000294: '4425d9ee-a45f-42f8-a29c-97bbb6258dff',
	E60000295: 'de47d3ee-1604-4d11-8835-56ca372e954d',
	E60000296: '9d067f07-5797-4f39-9405-6f84094a2dac',
	E60000297: 'bce058a6-2ff5-4758-b607-125a3c854b86',
	E60000298: '75fbc401-aef2-4e74-b746-efe83e1d2a54',
	E60000299: 'ca2da14b-f3f4-47ff-b065-6a76d590edc4',
	E60000300: '7ed5548e-51eb-4059-9114-b51e37482170',
	E60000301: '769f0506-4b34-49ed-aaa1-3a198bbcea9f',
	E60000302: '5ae8f29a-f9d7-4bb6-a9a0-40c5455f5f3d',
	E60000303: '6c4e2fb6-4b60-49de-8b83-59a56516056a',
	E60000304: 'e1217eb7-6959-4b23-8ded-60b569836bcd',
	E60000305: '100ea736-ca26-4d98-8eea-7c779aaaa4d2',
	E60000306: '15a8faed-11cb-435c-bb4a-71f6d301b7fc',
	E60000307: '4c8b7f9c-2206-4d26-98c0-b64678eca9a6',
	E60000308: '43ffd687-9a5e-49dd-b3cb-fa246b567926',
	E60000309: 'ff997497-f985-49c1-a8cf-05a0c3cfd2c9',
	E60000310: 'ac6e722a-e49e-4f8e-b3f5-63e7e806f4b2',
	E60000311: '3030f31b-d457-4baa-8a65-d3aceb774487',
	E60000312: '75375317-326a-477b-bdcf-f42e49df684e',
	E60000313: '49ae216c-e8a3-4e79-9d66-64d4737177bd',
	E60000314: 'e07fa655-9250-441d-b317-53f7241a52ce',
	E60000315: 'ca6b0934-22a2-4f38-9f0a-dc2909200dad',
	E60000316: '1c30c058-13e6-4000-9d30-d0c621a6acda',
	E60000317: '7eb3cbea-22c6-49af-b58d-1c348bb5b1a7',
	E60000318: 'b0d1b750-b08b-4e53-8a9b-010f842b9ed4',
	E60000319: 'd307f052-7035-45ce-8071-e6b2db3fc370',
	E60000320: 'fd1ede71-d694-423f-8f87-aeef94d7c84c',
	E60000321: '8cba1461-093a-4e91-b9ce-148afbabc3ec',
	E60000322: '627fa36f-7174-4327-af04-64f8f3dca5af',
	E60000323: 'd780cf06-d1ed-4a83-9dad-e8312757bd42',
	E60000324: 'dd4b5c09-c296-4d2a-9d57-0be46547c911',
	E60000325: 'e9f88ec7-bc96-4497-9ffd-3a374440c630',
	E60000326: 'aee4f092-b22c-4e70-bf25-806dd2d51c93',
	E60000327: '9bcea5d7-5ade-487c-bb5e-1619c994f8c6',
	E60000328: '63337ea0-6136-4dd1-8a1c-a9a6fd4b7919',
	E60000329: '3f50fcf7-c37c-44cf-a85e-0ec10ed19aa9',
	E60000330: '5987c2e6-cf22-4942-8328-4c1e6dc11a86',
	E60000331: 'ab6d95ed-3d4b-445e-94c5-dc0cafa6da25',
	E60000332: '5b03afb7-38d0-4319-b999-5cd01df649ad',
	E60000333: '45a323a7-0acf-4f66-9e9e-103699fddc70',
	E60000334: '2f0ac055-f2f5-45ab-b47e-dc7d7ba29d67',
	E60000335: '8b03d137-de51-4bdd-92d2-b276522846f8',
	E60000336: '5f69c564-97f5-40fd-939f-a8d4cbad8c5d',
	E60000337: '61e47f7d-eaa1-4887-8c2d-13298b3a44e6'
});
