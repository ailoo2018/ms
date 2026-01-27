const FormData = require('form-data');
const axios = require('axios');

async function uploadImagesAilooCDN(images, domainId) {

  const formData = new FormData();

  // Append each image with keys: image1, image2, image3, etc.
  images.forEach((image, index) => {
    const fieldName = `image${index + 1}`;

    // ✅ CORRECT: In Node.js, append buffer directly with options
    formData.append(fieldName, image.buffer, {
      filename: image.originalName,
      contentType: image.mimetype
    });

    console.log(`Appending ${fieldName}: ${image.originalName} (${image.size} bytes)`);
  });

  // Construct the Rails admin URL
  const railsAdminUrl = `${process.env.ADMIN_URL || 'http://admin'}/Product/UploadImage.rails`;

  console.log('Uploading to Rails admin:', railsAdminUrl);

  try {
    const response = await axios.post(railsAdminUrl, formData, {
      headers: {
        ...formData.getHeaders(), // ⭐ Important: Get headers from form-data
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000 // 30 second timeout
    });

    if (response.data && response.data.uploads) {
      console.log(`Successfully uploaded ${response.data.uploads.length} images`);
      return response.data;
    } else {
      throw new Error('Invalid response from Rails admin - missing uploads array');
    }

  } catch (error) {
    if (error.response) {
      // Rails admin returned an error response
      console.error('Rails admin error response:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(`Rails admin error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from Rails admin:', error.message);
      throw new Error('Rails admin is not responding');
    } else {
      // Something else happened
      console.error('Error setting up Rails request:', error.message);
      throw error;
    }
  }
}




module.exports = { uploadImagesAilooCDN };