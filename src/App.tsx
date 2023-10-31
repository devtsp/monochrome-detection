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
}

type ImageConfigs = Array<{ img: string; colors: Array<ColorInfo>; valid?: boolean }>;

const IMAGE_NAMES = [
	'1.jpg',
	'2.jpg',
	'3.jpg',
	'4.jpg',
	'5.webp',
	'6.webp',
	'7.webp',
	'8.webp',
	'9.jpg',
	'10.webp',
	'11.jpg',
	'12.jpg',
	'13.jpg',
	'14.jpg',
	'15.jpg',
	'16.webp',
	'17.jpg',
];

function App() {
	const [minColorsRequired, setMinColorsRequired] = React.useState(10);
	const [darkThreshold, setDarkThreshold] = React.useState(36);
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
		const base64Promises = IMAGE_NAMES.map((name) => readImageAsBase64(`/ids/${name}`));
		const extractedColorsPromises = IMAGE_NAMES.map((name) =>
			extractColors(`/ids/${name}`, { distance: 0 })
		);
		const base64Images = await Promise.all(base64Promises);
		const extractedColors = await Promise.all(extractedColorsPromises);
		const imagesWithPalette = base64Images.map((img, i) => {
			return {
				img,
				colors: extractedColors[i],
			};
		});
		setImagesWithPalette(imagesWithPalette);
	}

	function configImages() {
		const imageConfigs = imagesWithPalette.map((imgConfig) => {
			const filteredColors = imgConfig.colors.filter((color) => filterPalette(color));
			const sortedFilteredColors = filteredColors.sort(sortPalette);
			const valid = filteredColors.length >= minColorsRequired;
			const result = {
				img: imgConfig.img,
				colors: sortedFilteredColors,
				valid,
			};
			return result;
		});
		const sortedImageConfigs = imageConfigs.sort((a, b) => b.colors.length - a.colors.length);
		setImageConfigs(sortedImageConfigs);
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

	React.useEffect(() => {
		getImagesWithPalettes();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		configImages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [minColorsRequired, darkThreshold, grayThreshold, imagesWithPalette]);

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
					<p style={{ fontSize: '30px' }}>DARK CUT: {Math.floor((darkThreshold * 100) / 72)}%</p>
					<input
						style={{ width: '100%', margin: '0 auto' }}
						type="range"
						min={0}
						max={72}
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
					<p style={{ fontSize: '30px' }}>N COLORS TO PASS: {minColorsRequired}</p>
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
					padding: '70px 0',
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
									gap: '10px',
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
								{/* PALETTE */}
								<div
									style={{
										display: 'flex',
										width: '100%',
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
														padding: '8px',
														borderRadius: '50px',
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
