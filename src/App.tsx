import React from 'react';
import chroma from 'chroma-js';

import { extractColors } from 'extract-colors';

interface ColorInfo {
	hex: string;
	red: number;
	green: number;
	blue: number;
	hue: number;
	intensity: number;
	lightness: number;
	saturation: number;
	area: number;
	colorFamily: string;
}

interface ImageConfig {
	img: string;
	colors: Array<ColorInfo>;
	distinctColors: Array<string>;
	valid: boolean;
	monochrome: number;
}

type ImageConfigs = Array<ImageConfig>;

const IMAGE_URLS = [
	'/ids/1.jpg',
	'/ids/2.jpg',
	'/ids/3.jpg',
	'/ids/4.jpg',
	'/ids/5.jpg',
	'/ids/6.jpg',
	'/ids/7.jpg',
	'/ids/8.jpg',
	'/ids/9.jpg',
	'/ids/10.jpg',
	'/ids/11.jpg',
	'/ids/12.jpg',
	'/ids/13.jpg',
	'/ids/14.jpg',
	'/ids/15.jpg',
	'/ids/16.jpg',
	'/ids/17.jpg',
];

function App() {
	const [minColorsRequired, setMinColorsRequired] = React.useState(10);
	const [minDistinctColorsRequired, setMinDistinctColorsRequired] = React.useState(3);
	const [darkThreshold, setDarkThreshold] = React.useState(44);
	const [grayThreshold, setGrayThreshold] = React.useState(6);
	const [imagesWithPalette, setImagesWithPalette] = React.useState([] as ImageConfigs);
	const [imageConfigs, setImageConfigs] = React.useState([] as ImageConfigs);

	const readImageAsBase64 = (url: string) => {
		return new Promise<string>((res) =>
			fetch(url)
				.then((response) => response.blob())
				.then((blob) => {
					const reader = new FileReader();
					reader.onload = () => res(reader.result as string);
					reader.readAsDataURL(blob);
				})
				.catch(() => res(''))
		);
	};

	async function getImagesWithPalettes() {
		const base64Promises = IMAGE_URLS.map((url) => readImageAsBase64(url));
		const extractedColorsPromises = IMAGE_URLS.map((url) => extractColors(url, { distance: 0 }));
		const base64Images = await Promise.all(base64Promises);
		const extractedColors = await Promise.all(extractedColorsPromises);
		const imagesWithPalette = base64Images.map((img, i) => {
			return {
				img,
				colors: extractedColors[i],
			};
		});
		setImagesWithPalette(imagesWithPalette as ImageConfigs);
	}

	function determineColorFamily(hue: number) {
		const hueRounded = Math.round(hue * 1000);
		if (hueRounded > 900 || hueRounded <= 50) return `(pink)`;
		if (hueRounded > 50 && hueRounded <= 140) return `(brown)`;
		if (hueRounded > 140 && hueRounded <= 490) return `(green)`;
		if (hueRounded > 490 && hueRounded <= 600) return `(blue)`;
		if (hueRounded > 600 && hueRounded <= 900) return `(purple)`;
		return hueRounded.toString();
	}

	function configEachImageColorPalette(imgConfig: ImageConfig) {
		return (
			imgConfig.colors
				// apply filtering using form state
				.filter((color) => filterPalette(color))
				// add color family custom logic
				.map((colorInfo) => ({ ...colorInfo, colorFamily: determineColorFamily(colorInfo.hue) }))
				// sort palette
				.sort(sortPalette)
		);
	}

	function configEachImageFinalObject(imgConfig: ImageConfig) {
		// configure each image color palette info
		const imageColors = configEachImageColorPalette(imgConfig);

		// determine how many "distinct" colors are in the palette
		const distinctColors = new Set(imageColors.map((colorInfo) => colorInfo.colorFamily));

		// determine single image validation using distinct colors detected against threshold setted in form
		const valid =
			distinctColors.size >= minDistinctColorsRequired && imageColors.length >= minColorsRequired;

		// determe monochrome percentage
		const certaintyDependingOnColorAmount = (imageColors.length * 100) / 15;
		const certaintyDependingOnDistinctColors = (distinctColors.size * 100) / 5;
		const mixedPercentages = Math.floor(
			Math.abs((certaintyDependingOnColorAmount + certaintyDependingOnDistinctColors) / 2 - 100)
		);
		const finalCertainty =
			imageColors.length > 20 || distinctColors.size > 3 ? 0 : mixedPercentages;

		// build and return the final image config
		// (base64 img, colors array, distinct colors set, validation boolean)
		const result = {
			img: imgConfig.img,
			colors: imageColors,
			distinctColors: Array.from(distinctColors),
			valid,
			monochrome: finalCertainty,
		};
		return result;
	}

	function rgbToCIELCh(colorInfo: ColorInfo) {
		const [lightness, axisA, axisB] = chroma
			.rgb(colorInfo.red, colorInfo.green, colorInfo.blue)
			.lab();
		return chroma.lab(lightness, axisA, axisB).lch();
	}

	function sortPalette(a: ColorInfo, b: ColorInfo) {
		const [lightnessA, chromaA, hueA] = rgbToCIELCh(a);
		const [lightnessB, chromaB, hueB] = rgbToCIELCh(b);
		if (hueA !== hueB) return hueA - hueB;
		if (lightnessA !== lightnessB) return lightnessA - lightnessB;
		if (chromaA !== chromaB) return chromaA - chromaB;
		return 0;
	}

	function filterPalette(colorInfo: ColorInfo) {
		const [lightness, chroma] = rgbToCIELCh(colorInfo);
		return lightness >= darkThreshold && chroma >= grayThreshold;
	}

	function configImages() {
		// loop over the image + palette array
		const imageWithPaletteConfigs = imagesWithPalette.map(configEachImageFinalObject);
		// sort images by distinct colors detected descending
		const finalImagesWithPaletteConfigsSorted = imageWithPaletteConfigs.sort(
			(a, b) => a.monochrome - b.monochrome
		);
		// update state
		setImageConfigs(finalImagesWithPaletteConfigsSorted);
	}

	React.useEffect(() => {
		getImagesWithPalettes();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		configImages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		minColorsRequired,
		minDistinctColorsRequired,
		darkThreshold,
		grayThreshold,
		imagesWithPalette,
	]);

	return (
		<>
			{/* CONTROLS SECTION*/}
			<div
				style={{
					display: 'flex',
					gap: '50px',
					alignItems: 'flex-end',
					padding: '10px 100px',
					background: 'hsl(220, 55%, 90%)',
				}}
			>
				<div style={{ flexGrow: '1' }}>
					<p style={{ fontSize: '30px' }}>DARK CUT: {Math.floor((darkThreshold * 100) / 88)}%</p>
					<input
						style={{ width: '100%', margin: '0 auto' }}
						type="range"
						min={0}
						max={88}
						value={darkThreshold}
						onChange={(event) => {
							const newValue = parseInt(event.target.value, 10);
							setDarkThreshold(newValue);
						}}
					/>
				</div>
				<div style={{ flexGrow: '1' }}>
					<p style={{ fontSize: '30px' }}>GRAY CUT: {Math.floor((grayThreshold * 100) / 12)}%</p>
					<input
						style={{ width: '100%', margin: '0 auto' }}
						type="range"
						min={0}
						max={12}
						value={grayThreshold}
						onChange={(event) => {
							const newValue = parseInt(event.target.value, 10);
							setGrayThreshold(newValue);
						}}
					/>
				</div>
				<div style={{ flexGrow: '1' }}>
					<p style={{ fontSize: '30px' }}>MIN TOTAL COLORS TO PASS: {minColorsRequired}</p>
					<input
						style={{ width: '100%', margin: '0 auto' }}
						type="range"
						min={0}
						max={20}
						value={minColorsRequired}
						onChange={(event) => {
							const newValue = parseInt(event.target.value, 10);
							setMinColorsRequired(newValue);
						}}
					/>
				</div>
				<div style={{ flexGrow: '1' }}>
					<p style={{ fontSize: '30px' }}>
						MIN DISTINCT COLORS TO PASS: {minDistinctColorsRequired}
					</p>
					<input
						style={{ width: '100%', margin: '0 auto' }}
						type="range"
						min={0}
						max={6}
						value={minDistinctColorsRequired}
						onChange={(event) => {
							const newValue = parseInt(event.target.value, 10);
							setMinDistinctColorsRequired(newValue);
						}}
					/>
				</div>
			</div>
			{/* PICTURES SECTION*/}
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'flex-start',
					width: '100%',
					flexWrap: 'wrap',
					gap: '30px',
					padding: '30px 0',
				}}
			>
				{imageConfigs.map((config, i) => {
					return (
						<React.Fragment key={i}>
							{/* SINGLE PICTURE + PALETTE CONTAINER */}
							<div
								style={{
									width: '250px',
									display: 'flex',
									flexDirection: 'column',
									gap: '5px',
									position: 'relative',
								}}
							>
								{/* PICTURE */}
								<img
									src={config.img}
									style={{
										width: '100%',
										height: '150px',
										objectFit: 'cover',
										borderRadius: '15px',
										border: `5px solid ${config.valid ? 'yellowgreen' : 'salmon'}`,
									}}
								/>

								<div
									style={{
										position: 'absolute',
										right: 8,
										top: 8,
										background: 'rgba(255,255,255,.88)',
										boxShadow: '0 0 10px -3px black',
										borderRadius: '10px',
										padding: '0px 10px',
										lineBreak: 'normal',
										width: 'fit-content',
										lineHeight: '1.1',
									}}
								>
									monochrome:
									<p
										style={{
											fontSize: '20px',
											fontWeight: '600',
											color:
												config.monochrome > 90
													? 'red'
													: config.monochrome > 50
													? 'orangered'
													: config.monochrome > 10
													? 'orange'
													: 'gold',
										}}
									>
										{config.monochrome}%
									</p>
								</div>

								<div>
									COLORS: [{config.colors?.length}]
									<br />
									DISTINCT: [{config.distinctColors?.length}]
									{/* <br />
									IS MONOCHROME: [{config.monochrome}]% */}
								</div>
								{/* PALETTE */}
								<div
									style={{
										display: 'flex',
										flexWrap: 'wrap',
									}}
								>
									{config.colors.length > 0 &&
										config.colors.map((colorInfo) => {
											// SINGLE COLOR
											return (
												<div
													key={colorInfo.hex}
													style={{
														backgroundColor: colorInfo.hex,
														height: '8px',
														width: '20px',
														color: 'hsl(0, 0%, 40%)',
														textShadow: '0 0 5px -4px white',
													}}
												></div>
											);
										})}
								</div>
							</div>
						</React.Fragment>
					);
				})}
			</div>
		</>
	);
}

export default App;
