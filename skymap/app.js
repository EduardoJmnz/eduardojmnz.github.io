function applyPreviewWatermark(tokens){
  if (!$watermark) return;

  if (!state.preview?.watermarkEnabled){
    $watermark.style.backgroundImage = "none";
    return;
  }

  const isNeon = isNeonThemeId(state.map.colorTheme);
  const isWhiteBg = (!isNeon && state.map.backgroundMode === "white");

  const color = isWhiteBg
    ? (tokens.posterInk || "#111111")
    : "#FFFFFF";

  const opacity = clamp(Number(state.preview?.watermarkOpacity ?? 0.60), 0, 0.60);

  const uri = makeWatermarkDataUri({
    text: "skyartcreator",
    fontSize: 18,
    opacity,
    angle: -45,
    gap: 120,
    color
  });

  $watermark.style.backgroundImage = `url("${uri}")`;
}
