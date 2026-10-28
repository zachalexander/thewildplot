/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const [hummingbird, countriesGeo] = await Promise.all([
		fetch('/data/hummingbird.json').then((r) => r.json()),
		fetch('/data/countries-50m.json').then((r) => r.json())
	]);

	return { hummingbird, countriesGeo };
}
