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

function App() {
	const [base64Images, setBase64Images] = React.useState([] as string[]);
	const [colorsInfo, setColorsInfo] = React.useState([] as ColorInfo[][]);
	const [thresholdValue, setThresholdValue] = React.useState(8);
	const [darkThreshold, setDarkThreshold] = React.useState(48);
	const [grayThreshold, setGrayThreshold] = React.useState(6);

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

	async function getBase64Images() {
		const names = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg'];
		const base64Promises = names.map((name) => readImageAsBase64(`/ids/${name}`));
		const extractedColorsPromises = names.map((name) =>
			extractColors(`/ids/${name}`, { distance: 0 })
		);

		// array of base64 images
		const base64Images = await Promise.all(base64Promises);
		setBase64Images(base64Images);

		// array of arrays of colors [[{1}, {2}], [{1}, {2}, {3}]]
		const extractedColors = await Promise.all(extractedColorsPromises);
		setColorsInfo(extractedColors);
	}

	function rgbToCIELCh(rgb: ColorInfo) {
		const lab = chroma.rgb(rgb.red, rgb.green, rgb.blue).lab();
		return chroma.lab(lab[0], lab[1], lab[2]).lch();
	}

	function sortFn(a: ColorInfo, b: ColorInfo) {
		const colorA = rgbToCIELCh(a);
		const colorB = rgbToCIELCh(b);

		// First, sort by hue (h), which represents the color.
		if (colorA[2] !== colorB[2]) {
			return colorA[2] - colorB[2];
		}

		// If hue is the same, sort by lightness (L).
		if (colorA[0] !== colorB[0]) {
			return colorA[0] - colorB[0];
		}

		// If hue and lightness are the same, sort by chroma (C).
		if (colorA[1] !== colorB[1]) {
			return colorA[1] - colorB[1];
		}

		return 0;
	}

	function filterFn(color: ColorInfo) {
		const colorInfo = rgbToCIELCh(color);
		return colorInfo[0] >= darkThreshold && colorInfo[1] >= grayThreshold; // Adjust the thresholds as needed.
	}

	React.useEffect(() => {
		getBase64Images();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [thresholdValue]);

	return (
		<>
			{/* CONTROLS SECTION*/}
			<div style={{ margin: '0 auto', width: '300px' }}>
				<p style={{ textAlign: 'center', fontSize: '24px', fontFamily: 'monospace' }}>
					THRESHOLD: {thresholdValue}
				</p>
				<input
					style={{ width: '100%', margin: '0 auto' }}
					type="range"
					min={0}
					max={20}
					value={thresholdValue}
					onChange={(event) => {
						const newValue = parseInt(event.target.value, 10);
						setThresholdValue(newValue);
					}}
				/>
			</div>
			<div style={{ margin: '0 auto', width: '300px' }}>
				<p style={{ textAlign: 'center', fontSize: '24px', fontFamily: 'monospace' }}>
					DARK CUT: {darkThreshold}
				</p>
				<input
					style={{ width: '100%', margin: '0 auto' }}
					type="range"
					min={0}
					max={100}
					value={darkThreshold}
					onChange={(event) => {
						const newValue = parseInt(event.target.value, 10);
						setDarkThreshold(newValue);
					}}
				/>
			</div>
			<div style={{ margin: '0 auto', width: '300px' }}>
				<p style={{ textAlign: 'center', fontSize: '24px', fontFamily: 'monospace' }}>
					GRAY CUT: {grayThreshold}
				</p>
				<input
					style={{ width: '100%', margin: '0 auto' }}
					type="range"
					min={0}
					max={10}
					value={grayThreshold}
					onChange={(event) => {
						const newValue = parseInt(event.target.value, 10);
						setGrayThreshold(newValue);
					}}
				/>
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
				}}
			>
				{base64Images.map((base64Image, i) => {
					return (
						<React.Fragment key={i}>
							{/* SINGLE PICTURE + PALETTE CONTAINER */}
							<div
								style={{
									width: '400px',
									display: 'flex',
									flexDirection: 'column',
									gap: '10px',
								}}
							>
								{/* PICTURE */}
								<img
									src={base64Image}
									style={{
										width: '100%',
										height: '260px',
										objectFit: 'contain',
										border:
											colorsInfo[i]?.sort(sortFn)?.filter(filterFn).length < thresholdValue
												? '5px solid salmon'
												: '5px solid yellowgreen',
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
									{colorsInfo.length > 0 &&
										colorsInfo[i]
											.sort(sortFn)
											.filter(filterFn)
											.map((colorInfo) => {
												// SINGLE COLOR
												return (
													<div
														key={colorInfo.hex}
														style={{
															backgroundColor: colorInfo.hex,
															padding: '15px',
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
