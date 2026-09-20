const CLUSTER_SIZE_POLICY = [
  { maxCount: 9, size: 42, fontSize: 14 },
  { maxCount: 99, size: 46, fontSize: 14 },
  { maxCount: Number.POSITIVE_INFINITY, size: 50, fontSize: 15 },
] as const;

function getClusterVisual(count: number) {
  return (
    CLUSTER_SIZE_POLICY.find((policy) => count <= policy.maxCount) ??
    CLUSTER_SIZE_POLICY[CLUSTER_SIZE_POLICY.length - 1]
  );
}

export function createFacilityClusterIcon(
  count: number,
): naver.maps.HtmlIcon {
  const visual = getClusterVisual(count);
  const content = document.createElement("div");

  content.textContent = String(count);
  content.setAttribute("aria-hidden", "true");
  content.style.alignItems = "center";
  content.style.background = "#172554";
  content.style.border = "3px solid #ffffff";
  content.style.borderRadius = "9999px";
  content.style.boxSizing = "border-box";
  content.style.boxShadow = "0 3px 10px rgba(15, 23, 42, 0.28)";
  content.style.color = "#ffffff";
  content.style.display = "flex";
  content.style.fontSize = `${visual.fontSize}px`;
  content.style.fontWeight = "700";
  content.style.fontVariantNumeric = "tabular-nums";
  content.style.height = `${visual.size}px`;
  content.style.justifyContent = "center";
  content.style.lineHeight = "1";
  content.style.minHeight = `${visual.size}px`;
  content.style.minWidth = `${visual.size}px`;
  content.style.overflow = "hidden";
  content.style.padding = "0";
  content.style.textAlign = "center";
  content.style.width = `${visual.size}px`;
  content.style.whiteSpace = "nowrap";

  return {
    content,
    size: new naver.maps.Size(visual.size, visual.size),
    anchor: new naver.maps.Point(visual.size / 2, visual.size / 2),
  };
}
