export function downloadSvgAsPng(svgId: string, filename: string = "dungeon-map.png"): Promise<void> {
  return new Promise((resolve, reject) => {
    const svgElement = document.getElementById(svgId) as SVGSVGElement | null;
    if (!svgElement) {
      reject(new Error(`SVG element with id #${svgId} not found`));
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgElement.clientWidth || 340;
      canvas.height = svgElement.clientHeight || 340;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas context creation failed"));
        return;
      }

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
      resolve();
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(blobURL);
      reject(err);
    };

    img.src = blobURL;
  });
}
