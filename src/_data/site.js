/**
 * Site Data
 *
 * Global site configuration. Update these values for your project.
 */

module.exports = {
  title: "Spencer Mills Orthodox Presbyterian Church",
  description: "Spencer Mills is a vibrant, confessionally Reformed church in Gowen, MI that seeks to make disciples of Jesus Christ who worship God with great joy.",
  url: process.env.URL || "https://spencermillsopc.org",

  // Contact Information
  phone: "616.754.7832",
  address: {
    street: "12710 17 Mile Rd NE",
    city: "Gowen",
    state: "MI",
    zip: "49326"
  },

  // Social Media
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100064328726036"
  },

  // Service Times
  services: {
    morning: "9:30am",
    evening: "5:00pm"
  },

  // Build timestamp
  buildTime: new Date().toISOString()
};
