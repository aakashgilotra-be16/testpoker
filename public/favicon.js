// Client-side script to generate PNG favicons from the SVG
document.addEventListener('DOMContentLoaded', function() {
  // Load the SVG image
  const img = new Image();
  img.src = 'favicon.svg';
  
  // Once image is loaded, draw it on all the canvases
  img.onload = function() {
    // Define the sizes we want to generate
    const sizes = [16, 32, 48, 64, 128, 256];
    
    // Draw on each canvas
    sizes.forEach(size => {
      const canvas = document.getElementById(`canvas-${size}`);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
    });
  };
  
  // Setup download functionality
  document.getElementById('generate').addEventListener('click', function() {
    const sizes = [16, 32, 48, 64, 128, 256];
    const downloadLinks = document.getElementById('download-links');
    downloadLinks.innerHTML = ''; // Clear existing links
    
    sizes.forEach(size => {
      const canvas = document.getElementById(`canvas-${size}`);
      const dataUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `favicon-${size}x${size}.png`;
      link.className = 'download-link';
      link.textContent = `Download ${size}x${size} PNG`;
      downloadLinks.appendChild(link);
    });
  });
});
