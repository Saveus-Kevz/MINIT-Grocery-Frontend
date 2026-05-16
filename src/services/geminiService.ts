const API_BASE = window.location.hostname === 'localhost'
    ? "http://localhost:8086/api"
    : "https://mint-grocery-backend.onrender.com/api";

export const generateProductImage = async (productName: string): Promise<string> => {
  try {
    const savedUser = localStorage.getItem("minit_user");
    const token = savedUser ? JSON.parse(savedUser).token : "";

    console.log("Calling backend AI endpoint for:", productName);

    const response = await fetch(`${API_BASE}/ai/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productName }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Image generation failed');
    }

    const imageUrl = await response.text();
    console.log("Backend returned image URL:", imageUrl);

    return imageUrl;
  } catch (error) {
    console.error('AI image generation error:', error);
    // Fallback to placeholder if backend fails
    const seed = encodeURIComponent(productName).replace(/[^a-zA-Z0-9]/g, '');
    return `https://picsum.photos/seed/${seed}/400/400`;
  }
};